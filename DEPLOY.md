# CalcDeck 部署（hzl666.fun，单文件站点）

整个站点就一个文件：`index.html`（纯客户端、零依赖、零构建）。

## 推荐：部署在域名根路径（SEO 最优）

```bash
# 1. 上传
rsync -av calcdeck/ user@<你的服务器IP>:/var/www/calcdeck/

# 2. nginx：hzl666.fun 的 server 块里加（或改）根 location
#    location / {
#        root /var/www/calcdeck;
#        try_files $uri $uri/ =404;
#    }
#    注意：/tracker/ 的 location 要保留在前（更长的前缀优先级已够）。
ssh user@<你的服务器IP> 'nginx -t && systemctl reload nginx'
```

HTTPS 自动覆盖（证书是整个域名的）。

## 备选：子路径（如果根路径已有别的用途）

```nginx
location /tools/ {
    alias /var/www/calcdeck/;
    try_files $uri $uri/ =404;
}
```
⚠️ 用子路径的话，把 `index.html` 里的 `<link rel="canonical">` 从 `https://hzl666.fun/` 改成实际地址。

## 收录

1. GSC 加 `hzl666.fun`（Domain 资源，DNS 验证）
2. 网址检查 → 提交 `https://hzl666.fun/` → 请求编入索引
3. Bing Webmaster 同步

## 更新流程

改完 `index.html` → 重跑第 1 步 rsync。完。

## 以后加新工具

每个工具一个 HTML 文件放同目录（`/unit-converter.html`…），首页加导航链接互链——CalcDeck 的"一叠计算器"就是这么长出来的。
