import { Application, Router } from "./deps.ts";
import { serve, upgradeWebSocket } from "../../sdk/mod.ts";

// https://doc.deno.land/deno/stable/~/ErrorEvent
addEventListener("error", (event) => {
  event.preventDefault();
  console.log("crash error", event.message);
});

const isMain = false;
const text = `<div>Hello World!</div>
<script>
const ws = new WebSocket("ws://localhost:${isMain ? 20000 : 8080}/ws", "test");
ws.addEventListener("open", () => ws.send("Timestamp = " + new Date()));
ws.addEventListener("close", () => console.log("ws close"));
ws.addEventListener("error", (evt) => console.log("ws error", evt));
ws.addEventListener("message", (evt) => console.log("ws message", evt.data));
</script>`;

const router = new Router();
router
  .get("/", (ctx) => {
    ctx.response.type = "text/html";
    ctx.response.body = text;
  })
  .get("/ws", (ctx) => {
    const upgrade = ctx.request.headers.get("upgrade") ?? "";
    if (upgrade !== "websocket") {
      ctx.response.status = 404;
      return;
    }
    const protocol = ctx.request.headers.get("Sec-WebSocket-Protocol") ??
      undefined;
    const ws = isMain ? ctx.upgrade({ protocol }) : // deno-lint-ignore no-explicit-any
      upgradeWebSocket(ctx.request.originalRequest as any, {
        protocol,
      });
    if (!ws) {
      ctx.response.status = 404;
      return;
    }
    ws.addEventListener("open", () => console.log("ws open"));
    ws.addEventListener("close", () => console.log("ws close"));
    ws.addEventListener("error", (evt) => {
      console.log("ws error");
      console.log("ws error", evt);
    });
    ws.addEventListener("message", (evt) => {
      console.log("ws message", evt.data);
      ws.send("Timestamp = " + new Date());
      console.log("ws message", String(evt));
    });
  });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());
isMain ? await app.listen({ port: 20000 }) : serve(async (req) => {
  const resp = await app.handle(req);
  return resp ?? new Response("", { status: 404 });
});
