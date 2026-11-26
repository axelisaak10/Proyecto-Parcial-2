#!/usr/bin/env bash
set -euo pipefail

OPENOBSERVE_URL="${OPENOBSERVE_URL:-http://localhost:5080}"
OPENOBSERVE_ORG="${OPENOBSERVE_ORG:-default}"
OPENOBSERVE_USER="${OPENOBSERVE_USER:-admin@toystore.com}"
OPENOBSERVE_PASSWORD="${OPENOBSERVE_PASSWORD:-OpenObserve2026!}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-http://${EC2_HOST:-localhost}/api/health}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OBS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Waiting for OpenObserve at ${OPENOBSERVE_URL}..."
for i in $(seq 1 30); do
  if curl -fsS "${OPENOBSERVE_URL}/healthz" >/dev/null 2>&1; then
    echo "==> OpenObserve is ready."
    break
  fi
  sleep 2
done

python3 - <<'PY' "${OBS_DIR}" "${OPENOBSERVE_URL}" "${OPENOBSERVE_ORG}" "${OPENOBSERVE_USER}" "${OPENOBSERVE_PASSWORD}" "${ALERT_WEBHOOK_URL}"
import base64, glob, json, os, sys, urllib.error, urllib.request

obs_dir, url, org, user, password, webhook_url = sys.argv[1:7]
url = url.rstrip("/")
auth = base64.b64encode(f"{user}:{password}".encode()).decode()
headers = {"Content-Type": "application/json", "Authorization": f"Basic {auth}"}

def req(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(f"{url}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="ignore")

print(f"==> Importing Dashboards into org '{org}' (idempotent)...")
code, body = req("GET", f"/api/{org}/dashboards")
existing_titles = set()
if code == 200:
    for item in json.loads(body).get("dashboards", []):
        for ver in ("v8", "v7", "v6", "v5", "v4", "v3", "v2", "v1"):
            if item.get(ver) and item[ver].get("title"):
                existing_titles.add(item[ver]["title"])

for path in sorted(glob.glob(os.path.join(obs_dir, "dashboards", "*.json"))):
    with open(path, "r", encoding="utf-8") as fh:
        dash = json.load(fh)
    title = dash.get("title", os.path.basename(path))
    if title in existing_titles:
        print(f"  -> Dashboard '{title}' [EXISTS]")
        continue
    code, body = req("POST", f"/api/{org}/dashboards", dash)
    if code in (200, 201):
        print(f"  -> Dashboard '{title}' [OK]")
    else:
        print(f"  -> Dashboard '{title}' [ERR {code}]: {body[:200]}")

print("==> Provisioning Alert Destination & Operational Alerts (v2 API)...")
dest_payload = {
    "name": "toystore_console_webhook",
    "url": webhook_url,
    "method": "get",
    "type": "http",
    "template": "o2_default_content",
    "headers": {},
    "skip_tls_verify": False,
}
code, body = req("POST", f"/api/{org}/alerts/destinations", dest_payload)
print(f"  -> Destination 'toystore_console_webhook' [{code}]")

code, body = req("GET", f"/api/v2/{org}/alerts")
existing_alerts = set()
if code == 200:
    for item in json.loads(body).get("list", []):
        if item.get("name"):
            existing_alerts.add(item["name"])

with open(os.path.join(obs_dir, "alerts", "alerts.json"), "r", encoding="utf-8") as fh:
    alerts = json.load(fh)

for alert in alerts:
    name = alert["name"]
    if name in existing_alerts:
        print(f"  -> Alert '{name}' [EXISTS]")
        continue
    alert.setdefault("destinations", ["toystore_console_webhook"])
    code, body = req("POST", f"/api/v2/{org}/alerts", alert)
    if code in (200, 201):
        print(f"  -> Alert '{name}' [OK]")
    else:
        print(f"  -> Alert '{name}' [ERR {code}]: {body[:240]}")

print("==> OpenObserve provisioning complete.")
PY
