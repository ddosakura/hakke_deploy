// import { copy } from "std/streams/mod.ts";
// const listener = Deno.listen({ port: 8080 });
// console.log("listening on 0.0.0.0:8080");
// for await (const conn of listener) {
//   copy(conn, conn).finally(() => conn.close());
// }

import type { Handler } from "std/http/mod.ts";

// https://github.com/denoland/deno/issues/13626
const serve = async (handler: Handler, options: Deno.UnixListenOptions) => {
  async function serveHttp(conn: Deno.Conn) {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
      requestEvent.respondWith(await handler(requestEvent.request, conn));
    }
  }

  console.log(`Listening on ${options.path}`);
  const server = Deno.listen({ ...options, transport: "unix" });
  for await (const conn of server) {
    serveHttp(conn);
  }
};

// ===

const handler = (_request: Request): Response => {
  return new Response("Hello Wrold! -- by foo.", {
    status: 200,
  });
};

await serve(handler, { path: "foo.sock" });
