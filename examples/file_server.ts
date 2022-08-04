import { serve } from "std/http/server.ts";
import { serveDir } from "std/http/file_server.ts";
serve((req) =>
  serveDir(req, {
    showDirListing: true,
    showDotfiles: true,
    enableCors: true,
  }), { port: 8000 });

import { delay } from "std/async/mod.ts";
while (true) {
  console.log(Deno.memoryUsage());
  await delay(1000);
}
