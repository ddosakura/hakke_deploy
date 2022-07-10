import { serve } from "std/http/mod.ts";

const handler = (_request: Request): Response => {
  return new Response("Hello Wrold! -- by bar.", {
    status: 200,
  });
};

console.log(`HTTP webserver running. Access it at: http://localhost:20002/`);
await serve(handler, { port: 20002 });
