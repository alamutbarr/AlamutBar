"""Local project backup and restore verification against an isolated disposable DB.

Uses only this workspace's ignored local MySQL client config. Never restores over
the live database. No credentials are passed as command arguments or archived.
"""

import argparse, hashlib, json, subprocess, time, uuid, zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = (ROOT / "runtime").resolve()
BIN = Path(r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin")
CONFIG = RUNTIME / "mysql-client.cnf"


def run_mysql(sql, database=None):
    args = [
        str(BIN / "mysql.exe"),
        f"--defaults-extra-file={CONFIG}",
        "--default-character-set=utf8mb4",
        "--batch",
        "--skip-column-names",
    ]
    if database:
        args.append(database)
    result = subprocess.run(
        args,
        input=sql.encode("utf8") if isinstance(sql, str) else sql,
        capture_output=True,
        check=True,
    )
    return result.stdout.decode("utf8").strip()


def backup(verify=False):
    if not CONFIG.is_file():
        raise RuntimeError("Project-local MySQL client configuration is missing.")
    # Refuse to administer a remote or unrelated instance through an edited file.
    configuration = CONFIG.read_text()
    if "host=127.0.0.1" not in configuration or "port=3307" not in configuration:
        raise RuntimeError(
            "Backup helper is limited to the isolated local instance on port 3307."
        )
    destination = (
        RUNTIME
        / "backups"
        / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        / uuid.uuid4().hex[:8]
    ).resolve()
    if not destination.is_relative_to(RUNTIME):
        raise RuntimeError("Backup target is outside runtime.")
    destination.mkdir(parents=True)
    sql = destination / "database.sql"
    subprocess.run(
        [
            str(BIN / "mysqldump.exe"),
            f"--defaults-extra-file={CONFIG}",
            "--default-character-set=utf8mb4",
            "--single-transaction",
            "--routines",
            "--triggers",
            "--no-tablespaces",
            f"--result-file={sql}",
            "alamut",
        ],
        capture_output=True,
        check=True,
    )
    archive = destination / "alamut-backup.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as out:
        out.write(sql, "database.sql")
        media = ROOT / "backend" / "media"
        if media.exists():
            for file in media.rglob("*"):
                if (
                    file.is_file()
                    and not file.is_symlink()
                    and file.resolve().is_relative_to(media.resolve())
                ):
                    out.write(file, "media/" + file.relative_to(media).as_posix())
    restored = None
    if verify:
        temporary_db = "alamut_restore_check_" + uuid.uuid4().hex[:16]
        created = False
        try:
            run_mysql(
                f"CREATE DATABASE `{temporary_db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
            created = True
            with sql.open("rb") as stream:
                subprocess.run(
                    [
                        str(BIN / "mysql.exe"),
                        f"--defaults-extra-file={CONFIG}",
                        "--default-character-set=utf8mb4",
                        temporary_db,
                    ],
                    stdin=stream,
                    capture_output=True,
                    check=True,
                )
            restored = int(
                run_mysql("SELECT COUNT(*) FROM logistics_shipment;", temporary_db)
            )
            run_mysql("SELECT COUNT(*) FROM logistics_driverprofile;", temporary_db)
        finally:
            if (
                created
                and temporary_db.startswith("alamut_restore_check_")
                and len(temporary_db) == 37
            ):
                run_mysql(f"DROP DATABASE `{temporary_db}`;")
    with archive.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    info = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "archive": str(archive),
        "sha256": digest,
        "restore_verified": verify,
        "restored_shipments": restored,
        "private_media_included": True,
    }
    (destination / "manifest.json").write_text(
        json.dumps(info, indent=2), encoding="utf8"
    )
    # This is the one temporary SQL file created above, inside the verified target.
    if sql.resolve().is_relative_to(destination):
        sql.unlink()
    (RUNTIME / "backup-state.json").write_text(
        json.dumps(info, indent=2), encoding="utf8"
    )
    print(
        json.dumps(
            {
                "status": "ok",
                "archive": str(archive),
                "restore_verified": verify,
                "restored_shipments": restored,
            }
        )
    )
    return info


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--loop", action="store_true")
    options = parser.parse_args()
    while True:
        try:
            state = RUNTIME / "backup-state.json"
            previous = json.loads(state.read_text()) if state.exists() else {}
            last = (
                datetime.fromisoformat(previous["created_at"]).timestamp()
                if previous.get("created_at")
                else 0
            )
            if not options.loop or time.time() - last > 86400:
                backup(options.verify)
        except Exception as exc:
            (RUNTIME / "backup-error.json").write_text(
                json.dumps(
                    {
                        "time": datetime.now(timezone.utc).isoformat(),
                        "error": type(exc).__name__,
                    }
                ),
                encoding="utf8",
            )
            if not options.loop:
                raise
        if not options.loop:
            break
        time.sleep(300)
