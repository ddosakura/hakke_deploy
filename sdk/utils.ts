import { transfer } from "./deps.ts";

export type RawRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: Uint8Array;
};

export const toRawRequest = async (
  input: RequestInfo,
  rawInit?: RequestInit,
): Promise<RawRequest> => {
  const nobody = ["HEAD", "OPTIONS", "GET", "DELETE"].includes(
    rawInit?.method ?? (typeof input === "string" ? "GET" : input.method),
  );
  const { body: _, ...init } = rawInit ?? {};
  const req = new Request(input, nobody ? init : rawInit);
  const base = {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
  };
  if (nobody) return base;
  const data = new Uint8Array(await req.arrayBuffer()); // (await resp.body?.getReader().read())?.value;
  return {
    ...base,
    body: data ? transfer(data, [data.buffer]) : undefined,
  };
};

export const toRequest = ({ url, method, headers, body }: RawRequest) =>
  new Request(url, {
    method,
    headers: new Headers(headers ?? {}),
    body,
  });

export type RawResponse = {
  status: number;
  headers?: Record<string, string>;
  body?: Uint8Array;
};

export const toRawResponse = async (body: string | Response) => {
  const resp = typeof body === "string" ? new Response(body) : body;
  const data = new Uint8Array(await resp.arrayBuffer()); // (await resp.body?.getReader().read())?.value;
  return {
    status: resp.status,
    headers: Object.fromEntries(resp.headers.entries()),
    body: data ? transfer(data, [data.buffer]) : undefined,
  };
};

export const toResponse = (resp: RawResponse) =>
  new Response(resp.body, {
    status: resp.status ?? 200,
    headers: new Headers(resp.headers ?? {}),
  });

// comlink 不支持 async transferHandler
/*
export const setupTransferHandlers = () => {
  transferHandlers.set("Request", {
    canHandle: (obj): obj is Request => obj instanceof Request,
    serialize: (async (req: Request) => [
      await toRawRequest(req),
      [],
    ]) as unknown as ((value: unknown) => [unknown, Transferable[]]),
    deserialize: toRequest,
  });
  transferHandlers.set("Response", {
    canHandle: (obj): obj is Response => obj instanceof Response,
    serialize: (async (req: Response) => [
      await toRawResponse(req),
      [],
    ]) as unknown as ((value: unknown) => [unknown, Transferable[]]),
    deserialize: toResponse,
  });
};
*/
