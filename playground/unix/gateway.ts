// import { copy } from "std/streams/mod.ts";

import { fetch } from "https://deno.land/x/socket_fetch@v0.1/mod.ts";

const server = Deno.listen({ port: 8080 });
console.log(`HTTP webserver running.  Access it at:  http://localhost:8080/`);

for await (const conn of server) {
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    console.log("url", requestEvent.request.url);
    const url = new URL(requestEvent.request.url);
    if (url.pathname !== "/foo") {
      return requestEvent.respondWith(
        new Response("Hello Wrold!", {
          status: 200,
        }),
      );
    }

    // const foo = await Deno.connect({ transport: "unix", path: "foo.sock" });
    // copy(conn, foo);
    // copy(foo, conn);

    // https://github.com/denoland/deno/issues/8821
    // const client = await Deno.connect({ transport: "unix", path: "foo.sock" });
    // const client = Deno.createHttpClient({
    //   proxy: {
    //     url: "http://localhost:20000",
    //     // basicAuth: { username: "", password: "" },
    //   },
    // });
    // return requestEvent.respondWith(
    //   await fetch(requestEvent.request, { client }),
    // );

    // https://github.com/whatwg/url/issues/577
    const protocol = "http+unix:";
    const host = encodeURIComponent(
      "/com.docker.devenvironments.code/playground/unix/foo.sock",
    );
    const unixURL = url.href.replace(
      `${url.protocol}//${url.host}`,
      `${protocol}//${host}`,
    );
    return requestEvent.respondWith(
      await fetch(
        new Request(unixURL, requestEvent.request),
      ),
    );
  }
}
