# gateway

## nginx

- https://blog.csdn.net/wzj_110/article/details/123747380
- https://blog.csdn.net/u013915286/article/details/118973670
- https://qinguan.github.io/2018/05/08/nginx-resolver-vaild-and-timeout/
- https://www.aiopsclub.com/nginx/nginx_server_name/
- https://get.localhost.direct/

## acme.sh

```bash
#  The supported validation types are: dns-01 , but you specified: http-01
# 这个方式不支持 *.mydomain.com
acme.sh --issue -d mydomain.com -d *.mydomain.com --webroot /home/wwwroot/mydomain.com/

# by dns
export DP_Id="1234"
export DP_Key="sADDsdasdgdsf"
acme.sh --issue --dns dns_dp -d aa.com -d *.aa.com

# install
acme.sh --install-cert -d example.com \
  --key-file       /path/to/keyfile/in/nginx/key.pem  \
  --fullchain-file /path/to/fullchain/nginx/cert.pem \
  --reloadcmd     "service nginx force-reload"
```
