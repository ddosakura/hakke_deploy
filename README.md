# Hakke Deploy

JavaScript Containers Runtime like Cloudflare Workers and Deno Deploy.

Read more:

- https://tinyclouds.org/javascript_containers
- https://zh.m.wikipedia.org/zh/Docker

## 架构

- docker
- nginx
- deno

## Quick Start

```bash
cd hakke_deploy
docker-compose up -d

cd ..
docker run --rm \
  --network hakke_deploy_default \
  --network-alias www \
  -v $PWD:/src \
  -v $HOME/.deno:/deno-dir \
  --workdir /src \
  -d denoland/deno:1.23.3 run -A \
  https://deno.land/std@0.147.0/http/file_server.ts -p 8000

# 查看 https://www.localhost.direct/

# 以上容器内存使用 23.76MiB

# $ deno eval 'console.log(Deno.memoryUsage())'
# { rss: 2752228, heapTotal: 3403776, heapUsed: 2824128, external: 0 }
# $ deno run -A examples/file_server.ts
# { rss: 6946816, heapTotal: 7159808, heapUsed: 6530888, external: 16 }

# deno () {
#   docker run \
#     --interactive \
#     --tty \
#     --rm \
#     --volume $PWD:/app \
#     --volume $HOME/.deno:/deno-dir \
#     --workdir /app \
#     denoland/deno:1.23.3 \
#     "$@"
# }
# $ deno eval 'setTimeout(console.log(Deno.memoryUsage()), 10000)'
# { rss: 2752276, heapTotal: 3403776, heapUsed: 2824152, external: 0 }
# docker stats 显示容器占用 11.12MiB
```
