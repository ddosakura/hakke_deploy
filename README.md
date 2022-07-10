# Hakke Deploy

JavaScript Containers Runtime like Cloudflare Workers and Deno Deploy.

Read more: https://tinyclouds.org/javascript_containers

## 重要！

- **当前使用：dvm install 1.23.3**
- **旧版中 `addEventListener("error", ...)` 没用**

以下重大变更需要关注！

https://deno.com/blog/v1.22

- Removal of unstable Deno.emit(), Deno.formatDiagnostics() and
  Deno.applySourceMap() APIs
- Deno namespace is available in workers by default

## 注意事项

- Response.json(): https://github.com/whatwg/fetch/pull/1392

## 考虑引入的工具

- localhost.direct
- https://deno.land/x/udd
- https://deno.com/blog/wasmbuild
