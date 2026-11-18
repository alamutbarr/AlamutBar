#!/usr/bin/env python3
"""Probe the site, applications and optionally the encrypted backup mount."""

import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


http = build_opener(NoRedirects())


def origin(value):
    url = urlsplit(value.rstrip("/"))
    local = url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1", "::1"}
    if (
        (url.scheme != "https" and not local)
        or not url.hostname
        or url.username is not None
        or url.path
        or url.query
        or url.fragment
    ):
        raise argparse.ArgumentTypeError("Expected an HTTPS origin.")
    return url.geturl()


def health(url):
    try:
        with http.open(url + "/api/health/", timeout=5) as response:
            payload = json.loads(response.read(2048))
            return isinstance(payload, dict) and all(
                payload.get(key) == value
                for key, value in {
                    "status": "ok",
                    "service": "alamut-api",
                    "database": "mysql",
                }.items()
            )
    except (OSError, ValueError):
        return False


def backup_fresh(directory, max_age):
    try:
        newest = max(
            (
                archive.stat().st_mtime
                for archive in directory.glob("alamut-*.tar.gz.age")
                if archive.is_file() and archive.stat().st_size > 0
            ),
            default=0,
        )
    except OSError:
        return False
    return time.time() - newest <= max_age * 3600


def save(path, state):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as temp:
        name = Path(temp.name)
        try:
            temp.write(json.dumps(state).encode())
            temp.close()
            name.replace(path)
        finally:
            name.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=origin)
    parser.add_argument("app", type=origin)
    parser.add_argument("--owner", type=origin)
    parser.add_argument("--inspector", type=origin)
    parser.add_argument("--admin", type=origin)
    parser.add_argument("--state-file", required=True, type=Path)
    parser.add_argument("--backup-dir", type=Path)
    parser.add_argument("--max-backup-age-hours", type=int, default=30)
    args = parser.parse_args()
    if args.max_backup_age_hours < 1:
        parser.error("Backup age must be at least one hour.")
    webhook = os.environ.get("ALAMUT_ALERT_WEBHOOK", "")
    token = os.environ.get("ALAMUT_ALERT_TOKEN", "")
    if webhook:
        parsed = urlsplit(webhook)
        origin(f"{parsed.scheme}://{parsed.netloc}")
    state = {"failures": {}, "notified": []}
    if args.state_file.exists():
        state = json.loads(args.state_file.read_text(encoding="utf-8"))
    origins = {"site": args.site, "driver" if args.owner else "app": args.app,
               "owner": args.owner, "inspector": args.inspector, "admin": args.admin}
    checks = {name: health(url) for name, url in origins.items() if url}
    if args.backup_dir:
        checks["backup"] = backup_fresh(args.backup_dir, args.max_backup_age_hours)
    failures = {
        check: 0 if passed else min(2, state["failures"].get(check, 0) + 1)
        for check, passed in checks.items()
    }
    active = sorted(check for check, count in failures.items() if count == 2)
    print(
        json.dumps({"service": "alamut", "checks": checks, "active": active}),
        flush=True,
    )

    delivery_ok = True
    if webhook and active != state["notified"]:
        event = {
            "service": "alamut",
            "status": "incident" if active else "recovered",
            "checks": active,
        }
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        try:
            with http.open(
                Request(webhook, data=json.dumps(event).encode(), headers=headers),
                timeout=10,
            ):
                pass
        except (OSError, ValueError) as error:
            print(f"Alert delivery failed ({type(error).__name__}).", file=sys.stderr)
            delivery_ok = False
        else:
            state["notified"] = active
    state["failures"] = failures
    save(args.state_file, state)
    return 0 if all(checks.values()) and delivery_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
