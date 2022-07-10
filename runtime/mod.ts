import { serve } from "std/http/server.ts";
import { resolve } from "std/path/mod.ts";
import { proxy, transfer, wrap } from "../sdk/deps.ts";
import { HakkeWorker, toArrayBufferView } from "../sdk/mod.ts";
import { toRawRequest, toResponse } from "../sdk/utils.ts";
// import { bundle, emit } from "emit";

addEventListener("error", (event) => {
  event.preventDefault();
  console.log("runtime crash error", event.message);
});

// deno-lint-ignore require-await
const createWorker = async () => {
  const entry = new URL("../examples/foo/mod.ts", import.meta.url);
  // console.log(await emit(entry, {}));
  // console.log(
  //   await bundle(entry, {
  //     async load(specifier) {
  //       console.log(specifier);
  //       return undefined;
  //     },
  //   }),
  // );
  return new Worker(
    `file://${resolve(Deno.cwd(), "./examples/foo/mod.ts")}`,
    {
      name: `file://${resolve(Deno.cwd(), "./examples/foo/mod.ts")}`,
      type: "module",
      deno: {
        permissions: "none",
      },
    },
  );
};
const worker = await createWorker();
// setInterval(() => {
//   console.log("restart");
//   worker.terminate();
//   worker = createWorker();
// }, 10 * 1000);
const getWorker = () => {
  // TODO: reg & emit
  return { worker, remote: wrap<HakkeWorker>(worker) };
};

const sockets = new WeakMap<WebSocket, string>();
serve(async (req, { remoteAddr }) => {
  if (remoteAddr.transport !== "tcp") return new Response("", { status: 404 });
  // const url = new URL(req.url);
  const service = getWorker();
  if (!service) return new Response("", { status: 404 });
  const { remote } = service;
  const raw = await toRawRequest(req);
  raw.headers["referer"] = `http://${remoteAddr.hostname}:${remoteAddr.port}`;
  const upgrade = req.headers.get("upgrade") ?? "";
  if (upgrade !== "websocket") {
    return toResponse(await remote.dispatchFetchEvent(raw));
  }
  const protocol = req.headers.get("Sec-WebSocket-Protocol") ??
    undefined;
  const { socket, response } = Deno.upgradeWebSocket(req, {
    protocol,
    idleTimeout: 120,
  });
  socket.binaryType = "arraybuffer";
  const uuid = crypto.randomUUID();
  sockets.set(socket, uuid);
  socket.addEventListener(
    "open",
    () =>
      remote.subscribe(
        uuid,
        raw,
        proxy((data) => socket.send(data)),
        proxy(socket.close),
      ),
  );
  socket.addEventListener("close", () => remote.unsubscribe(uuid));
  socket.addEventListener("error", (evt) => console.log("socket error", evt));
  socket.addEventListener("message", async (evt) => {
    const data = evt.data;
    if (typeof data === "string") {
      remote.publish(uuid, data);
      return;
    }
    const dv = await toArrayBufferView(data);
    remote.publish(uuid, transfer(dv, [dv.buffer]));
  });
  return response;
}, {
  port: 8080,
  onError(err) {
    console.log(err);
    return new Response("", { status: 500 });
  },
});

// TODO: worker/lambda mode
