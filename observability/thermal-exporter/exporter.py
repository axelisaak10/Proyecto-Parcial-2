import base64
import glob
import json
import os
import socket
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

HOSTFS = os.environ.get("HOSTFS_PATH", "/hostfs")
OPENOBSERVE_URL = os.environ.get("OPENOBSERVE_URL", "http://openobserve:5080").rstrip("/")
OPENOBSERVE_ORG = os.environ.get("OPENOBSERVE_ORG", "default")
OPENOBSERVE_USER = os.environ.get("OPENOBSERVE_USER", "admin@toystore.com")
OPENOBSERVE_PASSWORD = os.environ.get("OPENOBSERVE_PASSWORD", "OpenObserve2026!")
INTERVAL_SECONDS = int(os.environ.get("COLLECTION_INTERVAL_SECONDS", "15"))
STREAM_NAME = os.environ.get("EC2_INFRA_STREAM", "ec2_infrastructure")


def _path(subpath: str) -> str:
    candidate = os.path.join(HOSTFS, subpath.lstrip("/"))
    return candidate if os.path.exists(candidate) else subpath


def read_cpu_times() -> tuple[int, int]:
    stat_path = _path("/proc/stat")
    with open(stat_path, "r", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("cpu "):
                parts = [int(x) for x in line.split()[1:]]
                idle = parts[3] + (parts[4] if len(parts) > 4 else 0)
                total = sum(parts)
                return idle, total
    return 0, 0


def read_memory_metrics() -> dict:
    meminfo_path = _path("/proc/meminfo")
    values: dict[str, int] = {}
    with open(meminfo_path, "r", encoding="utf-8") as fh:
        for line in fh:
            if ":" in line:
                key, rest = line.split(":", 1)
                num = rest.strip().split()[0]
                if num.isdigit():
                    values[key] = int(num)  # kB

    total_kb = values.get("MemTotal", 0)
    avail_kb = values.get("MemAvailable", values.get("MemFree", 0))
    used_kb = max(total_kb - avail_kb, 0)
    used_pct = round((used_kb / total_kb) * 100.0, 2) if total_kb > 0 else 0.0

    return {
        "memory_total_mb": round(total_kb / 1024.0, 2),
        "memory_used_mb": round(used_kb / 1024.0, 2),
        "memory_available_mb": round(avail_kb / 1024.0, 2),
        "memory_percent": used_pct,
    }


def read_network_bytes() -> tuple[int, int]:
    net_path = _path("/proc/net/dev")
    rx_total = 0
    tx_total = 0
    with open(net_path, "r", encoding="utf-8") as fh:
        lines = fh.readlines()[2:]
        for line in lines:
            if ":" not in line:
                continue
            iface, data = line.split(":", 1)
            iface = iface.strip()
            if iface == "lo" or iface.startswith("veth"):
                continue
            fields = data.split()
            if len(fields) >= 9:
                rx_total += int(fields[0])
                tx_total += int(fields[8])
    return rx_total, tx_total


def read_load_average() -> dict:
    load_path = _path("/proc/loadavg")
    with open(load_path, "r", encoding="utf-8") as fh:
        parts = fh.read().strip().split()
    return {
        "load_1m": float(parts[0]) if len(parts) > 0 else 0.0,
        "load_5m": float(parts[1]) if len(parts) > 1 else 0.0,
        "load_15m": float(parts[2]) if len(parts) > 2 else 0.0,
    }


def read_temperature_celsius(cpu_percent: float, load_1m: float) -> tuple[float, str]:
    patterns = [
        os.path.join(HOSTFS, "sys/class/thermal/thermal_zone*/temp"),
        os.path.join(HOSTFS, "sys/class/hwmon/hwmon*/temp*_input"),
        "/sys/class/thermal/thermal_zone*/temp",
        "/sys/class/hwmon/hwmon*/temp*_input",
    ]

    readings: list[float] = []
    for pattern in patterns:
        for sensor_file in glob.glob(pattern):
            try:
                with open(sensor_file, "r", encoding="utf-8") as fh:
                    raw = fh.read().strip()
                if raw.lstrip("-").isdigit():
                    val = int(raw)
                    celsius = val / 1000.0 if val > 200 else float(val)
                    if 5.0 <= celsius <= 125.0:
                        readings.append(celsius)
            except OSError:
                continue
        if readings:
            break

    if readings:
        return round(sum(readings) / len(readings), 2), "hardware_sensor"

    # AWS EC2 Nitro/Xen virtualized instances do not expose ACPI thermal zones.
    # Compute transparent estimated thermal index from active CPU utilization and 1m load.
    estimated = 38.0 + (cpu_percent * 0.38) + min(load_1m * 2.5, 12.0)
    return round(estimated, 2), "ec2_virtual_thermal_model"


def send_to_openobserve(record: dict) -> None:
    url = f"{OPENOBSERVE_URL}/api/{OPENOBSERVE_ORG}/{STREAM_NAME}/_json"
    credentials = f"{OPENOBSERVE_USER}:{OPENOBSERVE_PASSWORD}".encode("utf-8")
    auth_header = base64.b64encode(credentials).decode("ascii")
    payload = json.dumps([record]).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth_header}",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


def main() -> None:
    host_name = os.environ.get("HOST_HOSTNAME") or socket.gethostname()
    prev_idle, prev_total = read_cpu_times()
    prev_rx, prev_tx = read_network_bytes()
    prev_ts = time.monotonic()

    print(
        f"[thermal-exporter] Started. Target={OPENOBSERVE_URL}/api/{OPENOBSERVE_ORG}/{STREAM_NAME}/_json interval={INTERVAL_SECONDS}s",
        flush=True,
    )

    while True:
        time.sleep(INTERVAL_SECONDS)
        now_ts = time.monotonic()
        elapsed = max(now_ts - prev_ts, 0.1)

        cur_idle, cur_total = read_cpu_times()
        delta_idle = max(cur_idle - prev_idle, 0)
        delta_total = max(cur_total - prev_total, 0)
        cpu_percent = round(((delta_total - delta_idle) / delta_total) * 100.0, 2) if delta_total > 0 else 0.0

        cur_rx, cur_tx = read_network_bytes()
        rx_kbps = round(max(cur_rx - prev_rx, 0) / 1024.0 / elapsed, 2)
        tx_kbps = round(max(cur_tx - prev_tx, 0) / 1024.0 / elapsed, 2)

        mem = read_memory_metrics()
        load = read_load_average()
        temp_c, temp_source = read_temperature_celsius(cpu_percent, load["load_1m"])

        prev_idle, prev_total = cur_idle, cur_total
        prev_rx, prev_tx = cur_rx, cur_tx
        prev_ts = now_ts

        doc = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "host": host_name,
            "cpu_percent": cpu_percent,
            "memory_percent": mem["memory_percent"],
            "memory_used_mb": mem["memory_used_mb"],
            "memory_available_mb": mem["memory_available_mb"],
            "memory_total_mb": mem["memory_total_mb"],
            "network_rx_kbps": rx_kbps,
            "network_tx_kbps": tx_kbps,
            "network_total_kbps": round(rx_kbps + tx_kbps, 2),
            "temperature_celsius": temp_c,
            "temperature_source": temp_source,
            "load_1m": load["load_1m"],
            "load_5m": load["load_5m"],
            "load_15m": load["load_15m"],
        }

        try:
            send_to_openobserve(doc)
        except urllib.error.URLError as exc:
            print(f"[thermal-exporter] Failed to send metrics to OpenObserve: {exc}", flush=True)
        except Exception as exc:
            print(f"[thermal-exporter] Unexpected error: {exc}", flush=True)


if __name__ == "__main__":
    main()
