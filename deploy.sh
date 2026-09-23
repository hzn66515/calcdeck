#!/usr/bin/env bash
# CalcDeck 一键部署：上传 + nginx 配置（自动备份/校验/回滚）+ 线上验证
# 用法：在终端里运行  bash deploy.sh   （过程中会要 1-2 次服务器密码）
set -euo pipefail
SERVER=root@47.242.167.161
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== 1/4 上传文件 =="
ssh "$SERVER" "mkdir -p /var/www/calcdeck"
rsync -av "$HERE/index.html" "$HERE/robots.txt" "$HERE/sitemap.xml" "$SERVER:/var/www/calcdeck/"

echo "== 2/4 配置 nginx（自动备份；nginx -t 失败会自动回滚）=="
ssh "$SERVER" 'bash -s' <<'REMOTE'
set -e
CONF=$(grep -rl "hzl666.fun" /etc/nginx/ 2>/dev/null | head -1)
[ -z "$CONF" ] && { echo "❌ 没找到含 hzl666.fun 的 nginx 配置文件"; exit 1; }
echo "配置文件: $CONF"
BAK="$CONF.bak.$(date +%s)"
cp "$CONF" "$BAK"; echo "已备份: $BAK"
if grep -q "root /var/www/calcdeck" "$CONF"; then
  echo "已配置过，跳过插入"
else
  python3 - "$CONF" <<'PY'
import sys,re
p=sys.argv[1]
s=open(p).read()
if "root /var/www/calcdeck" in s: raise SystemExit(0)
lines=s.split("\n")
idx=None
for i,l in enumerate(lines):
    if re.search(r"server_name[^;]*hzl666\.fun", l):
        for j in range(i,-1,-1):
            if re.match(r"\s*server\s*\{", lines[j]):
                idx=j; break
        break
if idx is None: raise SystemExit("定位 server 块失败")
block="    location / {\n        root /var/www/calcdeck;\n        try_files $uri $uri/ =404;\n    }"
lines.insert(idx+1, block)
open(p,"w").write("\n".join(lines))
print("已插入 location /（放在 hzl666.fun 的 server 块内）")
PY
fi
if nginx -t 2>/tmp/ngerr; then
  systemctl reload nginx && echo "✅ nginx -t 通过，已重载"
else
  echo "❌ nginx -t 失败，自动回滚到备份"; cat /tmp/ngerr
  cp "$BAK" "$CONF"; nginx -t && systemctl reload nginx
  exit 1
fi
REMOTE

echo "== 3/4 验证线上 =="
sleep 1
curl -s -o /dev/null -w "https://hzl666.fun/ → HTTP %{http_code}\n" https://hzl666.fun/
curl -s -o /dev/null -w "https://hzl666.fun/tracker/api/version → HTTP %{http_code}（HotRadar 不应受影响）\n" https://hzl666.fun/tracker/api/version
curl -s https://hzl666.fun/ | grep -q CalcDeck && echo "✅ CalcDeck 已上线" || echo "⚠️ 页面没返回 CalcDeck 内容，把上面的输出发我"

echo "== 4/4 完成 =="
echo "下一步：Google Search Console 提交 https://hzl666.fun/ （3 分钟点击操作）"
