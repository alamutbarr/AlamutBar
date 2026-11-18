"""Provision ONLY the isolated local instance on 127.0.0.1:3307."""

import os, secrets, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
env = ROOT / ".env"
if env.exists():
    print("Existing .env preserved.")
    raise SystemExit(0)
mysql = Path(r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe")
app = secrets.token_urlsafe(32)
root = secrets.token_urlsafe(32)
key = secrets.token_urlsafe(64)
encryption_key = secrets.token_urlsafe(64)
sql = f"CREATE DATABASE IF NOT EXISTS alamut CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'alamut'@'localhost' IDENTIFIED BY '{app}'; GRANT ALL ON alamut.* TO 'alamut'@'localhost'; GRANT ALL ON test_alamut.* TO 'alamut'@'localhost'; ALTER USER 'root'@'localhost' IDENTIFIED BY '{root}';"
subprocess.run(
    [str(mysql), "--no-defaults", "--host=127.0.0.1", "--port=3307", "--user=root"],
    input=sql,
    text=True,
    check=True,
    capture_output=True,
)
env.write_text(
    f"DJANGO_DEBUG=1\nDJANGO_SECRET_KEY={key}\nDJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend,testserver\nDB_ENGINE=mysql\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=3307\nMYSQL_DATABASE=alamut\nMYSQL_USER=alamut\nMYSQL_PASSWORD={app}\nMYSQL_ROOT_PASSWORD={root}\nDEMO_ENABLED=1\nCSRF_TRUSTED_ORIGINS=http://127.0.0.1:3001,http://localhost:3001\n",
    encoding="utf-8",
)
with env.open("a", encoding="utf-8") as local_env:
    local_env.write(
        f"SECURITY_ENCRYPTION_KEY={encryption_key}\nSITE_URL=http://127.0.0.1:3001\n"
    )
(ROOT / "runtime/mysql-client.cnf").write_text(
    f"[client]\nuser=root\npassword={root}\nhost=127.0.0.1\nport=3307\n",
    encoding="utf-8",
)
print(
    "Isolated MySQL database and random local credentials configured. Secrets are in ignored local files."
)
