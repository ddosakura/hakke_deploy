// deno-lint-ignore-file no-explicit-any

import { expose, transfer } from "./deps.ts";
import { Handler, serve, ServeInit } from "std/http/server.ts";
import { RawRequest, RawResponse, toRawResponse, toRequest } from "./utils.ts";

export const toArrayBufferView = async (
  data: ArrayBufferLike | Blob | ArrayBufferView,
) => {
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  if (data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) {
    return new Uint8Array(data);
  }
  return data;
};

export interface FetchEvent extends Event {
  readonly request: Request;
  respondWith(response: Response): void;
}

const dispatchFetchEvent = (rawRequest: RawRequest) =>
  new Promise<RawResponse>((resolve, reject) => {
    const request = toRequest(rawRequest);
    const ok = dispatchEvent(
      new Proxy(new Event("fetch") as FetchEvent, {
        get(target, rawP, receiver) {
          const p = rawP as keyof FetchEvent;
          if (p === "request") {
            return request;
          }
          if (p === "respondWith") {
            return <FetchEvent["respondWith"]> ((resp) => {
              (async () => {
                try {
                  resolve(await toRawResponse(resp));
                } catch (err) {
                  reject(err);
                }
              })();
            });
          }
          return Reflect.get(target, p, receiver);
        },
      }),
    );
    if (!ok) return reject(new Error("cancelable"));
  });

class HakkeWebSocket extends EventTarget
  implements Pick<WebSocket, "close" | "send" | "binaryType"> {
  binaryType: BinaryType = "blob";
  #send: (data: string | ArrayBufferView) => void;
  readonly close: WebSocket["close"];
  constructor(
    send: (data: string | ArrayBufferView) => void,
    close: WebSocket["close"],
  ) {
    super();
    this.#send = send;
    this.close = close;
  }
  send(data: string | Blob | ArrayBufferView | ArrayBufferLike) {
    if (typeof data === "string") {
      this.#send(data);
      return;
    }
    (async () => {
      try {
        const dv = await toArrayBufferView(data);
        this.#send(transfer(dv, [dv.buffer]));
      } catch {
        this.dispatchEvent(new CustomEvent("error"));
      }
    })();
  }

  #listeners = new WeakMap<any, any>();
  override addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: HakkeWebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) {
    const handler = (evt: Event) => {
      const { detail, ...e } = evt as CustomEvent;
      return listener.call(this, {
        type: e.type,
        timeStamp: e.timeStamp,
        data: detail,
      } as any);
    };
    this.#listeners.set(listener, handler);
    super.addEventListener(type, handler, options);
  }
  override removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: HakkeWebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ) {
    const handler = this.#listeners.get(listener);
    handler && super.removeEventListener(type, handler, options);
  }
}
const sockets = new Map<string, HakkeWebSocket>();
const X_WEBSOCKET_UUID = "x-websocket-uuid";
const subscribe = (
  uuid: string,
  raw: RawRequest,
  send: (data: string | ArrayBufferView) => void,
  close: WebSocket["close"],
) => {
  sockets.set(uuid, new HakkeWebSocket(send, close));
  raw.headers[X_WEBSOCKET_UUID] = uuid;
  dispatchFetchEvent(raw);
};
const unsubscribe = (uuid: string) => {
  const socket = sockets.get(uuid);
  if (!socket) return;
  socket.dispatchEvent(new CustomEvent("close"));
  sockets.delete(uuid);
};
const publish = (uuid: string, data: string | ArrayBufferView) => {
  const socket = sockets.get(uuid);
  if (!socket) return;
  const detail = typeof data === "string" || socket.binaryType === "arraybuffer"
    ? data
    : new Blob([data]);
  socket.dispatchEvent(new CustomEvent("message", { detail }));
};

const worker = { dispatchFetchEvent, subscribe, unsubscribe, publish };

export type HakkeWorker = typeof worker;

// deno-lint-ignore require-await
const hakkeServe: typeof serve = async (
  handler: Handler,
  { hostname = "localhost", port = 80, onError, signal }: ServeInit = {},
) => {
  const listener = async (evt: Event) => {
    const e = evt as FetchEvent;
    try {
      const referer = e.request.headers.get("Referer") ?? "http://unknown";
      const url = new URL(referer);
      e.respondWith(
        await handler(e.request, {
          localAddr: {
            transport: "tcp",
            hostname,
            port,
          },
          remoteAddr: {
            transport: "tcp",
            hostname: url.hostname,
            port: parseInt(
              url.port || (url.protocol === "https:" ? "443" : "80"),
              10,
            ),
          },
        }),
      );
    } catch (err) {
      e.respondWith(new Response("", { status: 500 }));
      onError?.(err);
    }
  };
  addEventListener("fetch", listener);
  signal?.addEventListener(
    "abort",
    () => removeEventListener("fetch", listener),
  );
  // TODO: changeit
  console.log("Listening on http://hakke:80/");
  expose(worker);
};

const upgradeWebSocket = (
  req: Request,
  opts: { protocol?: string } = {},
) => {
  const uuid = req.headers.get(X_WEBSOCKET_UUID) ?? "";
  const socket = sockets.get(uuid);
  if (!socket) return;

  const protocol = req.headers.get("Sec-WebSocket-Protocol") ??
    undefined;
  if (opts.protocol !== protocol) {
    socket.dispatchEvent(new CustomEvent("error"));
    socket.dispatchEvent(new CustomEvent("close"));
    socket.close(-1, "error protocol");
    return socket;
  }
  socket.dispatchEvent(new CustomEvent("open"));
  return socket;
};

const hakkeFetch: typeof fetch = async (rawInput, init) => {
  const input = rawInput instanceof URL ? rawInput.href : rawInput;
  const req = new Request(input, init);
  // TODO: vnet
  return await fetch(req);
};

export { hakkeFetch as fetch, hakkeServe as serve, upgradeWebSocket };
