# Installation and operations

## Current local environment

Windows, Node 24.12.0, Python 3.12.10 and an **isolated** MySQL 8.4.3 instance are used. The existing MySQL executable is from `C:\laragon\bin\mysql\mysql-8.4.3-winx64`; its application data is in this project's `runtime/mysql`, and it binds only to `127.0.0.1:3307`. Existing projects listening on 3000 and 8000 are preserved.

| Component | Address |
| --- | --- |
| Public site | `http://127.0.0.1:3001` |
| Driver | `http://driver.localhost:3002/driver/app` |
| Cargo owner | `http://owner.localhost:3003/owner/app` |
| Inspector | `http://inspector.localhost:3004/inspector/app` |
| Django administration | `http://admin.localhost:8001/django-admin/` |
| MySQL | `127.0.0.1:3307`, database `alamut` |
| Integration test database | `test_alamut` |

Local random application/DB secrets are in the ignored `.env`. The ignored `runtime/mysql-client.cnf` contains credentials for administering **this isolated local instance**. Neither file belongs in Git or a release archive. Back them up securely if preserving local data. The local app account has rights only on `alamut` and `test_alamut`.

`scripts/start.ps1` starts the local processes and verifies `/api/health/` through the site and React apps. `scripts/stop.ps1` checks process identity before stopping project processes. `-Database` uses `mysqladmin` for graceful database shutdown. Install browser test runtimes with `npx playwright install chromium webkit` from `frontend`. To use installed Chrome for the Chromium mobile tests, set `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`.

## Reproducible install

On this Windows setup:

```powershell
pwsh -File scripts/bootstrap.ps1
```

On another host, install Python 3.12+, Node 24 and MySQL 8.4. Create a dedicated database and account. Set `.env` from `.env.example` with independent random values. Then:

```sh
python -m venv backend/.venv
# Activate this virtual environment using the shell's normal activation command.
pip install -r backend/requirements.lock.txt
cd backend
python manage.py migrate --noinput
python manage.py createsuperuser
# Development demonstration only: set DEMO_ENABLED=1 before this command.
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8001 --noreload
```

In another terminal:

```sh
cd frontend
npm ci --no-audit --no-fund
npm run build
npm run build:apps
npm start
```

The four frontend packages live in `frontend/apps/{site,driver,owner,inspector}`. Next.js builds to `frontend/apps/site/.next/standalone`; the server entry inside that output is `apps/site/server.js`. The three Vite builds each produce a `dist` directory in their own workspace. Shared assets are copied into the site's generated `public` directory at build and dev startup. Use `scripts/build.ps1` and `scripts/start.ps1` for Windows. Start an individual app from `frontend` with `npm run dev --workspace=@alamut/site`, `@alamut/driver`, `@alamut/owner` or `@alamut/inspector`.

`scripts/bootstrap.ps1` provisions `admin.demo` in the local development database. The generated password is stored in the ignored `runtime/local-admin.txt`. Run `python manage.py seed_local_admin` from `backend` to provision it on an existing local installation. Production staff are provisioned separately.

If `files.pythonhosted.org` fails to resolve on this network, the verified installation fallback used here was the Tsinghua PyPI mirror:

```powershell
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt --index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple
```

## Container deployment

Compose runs MySQL, Redis, one Django backend, standalone Next.js, three static React builds served by nginx, and a gateway for Django Admin. The five web services bind to loopback ports 3001–3005. The database and private media use named volumes. Run the following on the Linux server after completing `.env` and verifying a backup of any existing installation.

```sh
docker compose --profile mail config --quiet
docker compose --profile mail build
docker compose run --rm --no-deps backend python manage.py check_release --require-mail
docker compose run --rm --no-deps backend python manage.py check --deploy --fail-level WARNING
docker compose --profile mail up --no-build --wait --wait-timeout 180
docker compose exec backend python manage.py seed_content
```

For production, use independent random values for both app keys and both MySQL passwords. Configure all five HTTPS origins before building.

```dotenv
SITE_URL=https://alamut.bar
MULTI_APP=1
DRIVER_URL=https://driver.alamut.bar
OWNER_URL=https://owner.alamut.bar
INSPECTOR_URL=https://inspector.alamut.bar
ADMIN_URL=https://admin.alamut.bar
APP_URL=
DJANGO_ALLOWED_HOSTS=alamut.bar,driver.alamut.bar,owner.alamut.bar,inspector.alamut.bar,admin.alamut.bar,backend,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://alamut.bar,https://driver.alamut.bar,https://owner.alamut.bar,https://inspector.alamut.bar,https://admin.alamut.bar
DJANGO_DEBUG=0
DEMO_ENABLED=0
SECURE_SSL_REDIRECT=1
```

Use identical origin values at build and runtime. Browser API calls stay on the origin serving the page. Next.js forwards health, articles, tracking, contact and CSRF on the public host. Django independently enforces that allowlist and checks authenticated roles against their configured hosts. Production sessions use secure host-only cookies with the `__Host-` prefix.

Set `BUSINESS_OPERATOR_NAME`, `BUSINESS_CONTACT_EMAIL`, `BUSINESS_RETENTION_NOTICE` and `BUSINESS_TERMS_NOTICE` to the actual operator, contact and approved plain-text notices before building. The contact, privacy and terms pages read these public values. The retention notice describes the operator's policy. It does not schedule deletion of cargo, credentials or location records.

### DNS, TLS and cutover

Use a server with a public IP, inbound TCP 80 and 443, and a path for SSH from your workstation. Deploy the source and start Compose before switching DNS. Keep the Django upstream, MySQL and Redis on the private network. If migrating an existing installation, restore its database and private media with the original encryption key before accepting traffic. Use a fresh database for a new installation.

For the single-server setup, set these records in the authoritative DNS zone. Use the new server's actual IPv4 address for all five `A` records. Publish `AAAA` only if the server also accepts traffic over IPv6, and remove stale `AAAA` records for these names at cutover.

| Record | Type | Destination |
| --- | --- | --- |
| `@` | `A` | Public IP of the release server |
| `driver` | `A` | Same IP |
| `owner` | `A` | Same IP |
| `inspector` | `A` | Same IP |
| `admin` | `A` | Same IP |

Keep the apex record pointing to the current site during staging. DNS validation (`DNS-01`) can issue the certificate for all five names before the apex changes. Use the DNS provider's supported ACME integration for automatic renewal, or arrange a maintenance window for HTTP validation after the relevant A/AAAA records point at this server.

For HTTP validation, install `infra/nginx-acme.conf` inside nginx's `http` context as the temporary site config. Create `/var/www/alamut-acme`, verify and reload nginx, then run Certbot once all five names resolve to that listener.

```sh
sudo install -d -m 0755 /var/www/alamut-acme
sudo install -m 0644 infra/nginx-acme.conf /etc/nginx/conf.d/alamut.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/alamut-acme --cert-name alamut.bar \
  -d alamut.bar -d driver.alamut.bar -d owner.alamut.bar \
  -d inspector.alamut.bar -d admin.alamut.bar
```

Replace the temporary config once the certificate exists. Keep the challenge location for renewals and configure Certbot's renewal deploy hook to reload nginx after certificates renew. If using different hostnames, update the nginx map, `server_name` entries, certificate paths and Django origin lists.

```sh
sudo install -m 0644 infra/nginx.conf /etc/nginx/conf.d/alamut.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

With a valid certificate on the new server, verify the release against its IP before changing the apex. Replace `SERVER_IP` with the real address. The smoke test preserves the requested hostname and checks the certificate normally.

```sh
ALAMUT_SMOKE_IP=SERVER_IP node frontend/scripts/check-split-hosts.mjs
```

Change the apex after the pre-cutover check passes. Run the same check without the IP override after the DNS records propagate.

```sh
docker compose exec backend python manage.py check --deploy --fail-level WARNING
node frontend/scripts/check-split-hosts.mjs
```

For phone acceptance before moving the apex, make the staging addresses resolve from the phones and issue a trusted HTTPS certificate for all staging names. Use a separate database and fictional freight, driver and owner records. The IP override in the smoke command applies only to that Node process.

1. In Android Chrome, open each of the driver, owner and inspector URLs and use **Install app**. In iPhone Safari, use **Share → Add to Home Screen** and enable **Open as Web App** if offered. Start all three from their home-screen icons. Each should show its own icon, role, URL and sign-in state.
2. With the apps installed and previously loaded, enable airplane mode and reopen a panel. Confirm the connection-help screen appears, then reconnect and confirm the panel resumes at its own URL.
3. While a fictional shipment is in transit, tap **شروع اشتراک موقعیت سفر** in the installed driver app. Deny the location prompt on the first attempt and confirm the driver sees guidance and can retry. Grant access from the app or from the device's website settings. With the app open, confirm the owner sees the new point, accuracy and measurement time after the next successful poll. The panel polls every 15 seconds. Test on Wi-Fi and mobile data. Stop sharing and confirm the owner continues to see only the last saved point. After five minutes without a point, the owner should see the stale-location label.
4. Repeat GPS permission and map checks on both devices. Then request a password reset to a controlled mailbox and confirm the delivery, link host and successful sign-in with the new password.

Old role URLs on the public site redirect to the matching subdomain. Users sign in again and reinstall their PWA from the new domain. For rollback, restore the previous service configuration and DNS routing with its matching build.

Keep `/app/media` private and authorize downloads in Django. `admin.alamut.bar/django-admin/` serves the management console, including driver document reviews, shipment actions, payments, CRM, articles, tickets and last reported positions.

Create portal accounts from a trusted terminal with `create_portal_staff`. For example, replace the example values with the operator's details:

```sh
docker compose exec backend python manage.py create_portal_staff operator --django-admin \
  --username ops.lead --phone 09120002001 --email ops@example.com \
  --first-name 'نام' --last-name 'نام خانوادگی'
```

Use `inspector` as the role and omit `--django-admin` for inspector accounts. The command prompts for the password. An operator receives all operator capabilities by default. Pass repeated `--capability` flags for scoped access. A trusted administrator can enable staff access for an existing operator after reviewing the account. Operators can enroll a TOTP authenticator from the security link in Django Admin. Use an operator-role superuser only for trusted account administration.

Production login throttling is provided at both the application and nginx layers. Compose uses Redis for shared rate limits; single-process Windows development uses memory. Configure trusted proxy/IP handling for the chosen topology before scaling. Redis is transient cache, not the source of record.

The example nginx config assumes nginx is the public edge. It replaces incoming forwarding headers with the connection's address and protocol. If a CDN or load balancer precedes nginx, configure its trusted source addresses and real-IP handling before using this setup. Next's direct article reads are routed to Django over the private network and identify the configured public HTTPS origin via the trusted forwarded protocol.

## Migrations and rollback

Take and verify a backup before deploying a migration to a database with real data. The container startup runs tracked migrations before Gunicorn. Do not run `makemigrations` on production. Deploy one migration job before scaling application replicas in an orchestrated environment. Preserve the previous image/source commit. Use a tested database restore for incompatible schema rollback; do not assume every future migration is reversible.

## Backup and restore

For the current **local project database**, credentials stay in the config file and not in shell arguments:

```powershell
$projectRoot=(Resolve-Path .).Path
$backupDirectory=Join-Path $projectRoot 'runtime/backups'
New-Item -ItemType Directory -Force $backupDirectory
& 'C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe' "--defaults-extra-file=$(Join-Path $projectRoot 'runtime/mysql-client.cnf')" --single-transaction --routines --triggers "--result-file=$(Join-Path $backupDirectory 'alamut.sql')" alamut
```

Use a dedicated backup account in production and store encrypted backups off-host. Back up `backend/media` (or the `private_media` volume) alongside SQL and the relevant application release. Test restoring into a **separate** instance before relying on a backup. Do not import a test backup over a running production database.

For Compose on Linux, install `age` and generate the recovery key on a trusted recovery machine. Keep the private key there and configure only its public recipient on the backup host. The following command takes a MySQL dump and archives private media into one encrypted file:

```sh
ALAMUT_BACKUP_RECIPIENT=age1... bash infra/backup-compose.sh /srv/alamut-backups
```

Use a restricted off-host filesystem mounted at `/srv/alamut-backups` and set retention at that destination according to the operator's policy. The `alamut-backup` systemd timer in `infra/systemd` runs daily and catches up after downtime. Its service checks that the destination is mounted before writing. Install the project at `/opt/alamut` or adjust the unit paths, and create the root-readable `/etc/alamut/backup.env` containing `ALAMUT_BACKUP_RECIPIENT=age1...`. Keep temporary SQL and media on protected local storage. Run during a quiet or paused write window if SQL and media must represent the same instant. The helper uses the Compose application's database account and publishes the archive after encryption succeeds. Preserve the stable application keys and the recovery identity separately.

For a restore drill, decrypt the archive into a protected staging directory with `age --decrypt -i /secure/recovery.key /path/to/backup.tar.gz.age | tar -xz -C /path/to/staging`. Import `database.sql` into a fresh isolated MySQL schema and unpack `media.tar` into that instance's private media directory. Check record counts and download a known private document with an authorized account before accepting the recovery path.

Define retention, encryption, access, recovery point and recovery time requirements for the actual business before launch. Location history and documents need an explicit data retention policy; no automatic deletion policy is silently assumed in this version.

## Operational checks

`GET /api/health/` verifies a MySQL query. `infra/probe.py` checks all five HTTPS hosts and the age of the newest encrypted archive when a backup directory is provided. It posts an incident after two consecutive failures and a recovery when the checks pass. Failed webhook deliveries retry on the next run. The included systemd timer runs it every five minutes. Use an external probe for whole-server outages and the server-side timer to monitor backup freshness. The default freshness limit is 30 hours for a daily backup.

Create a root-readable `/etc/alamut/probe.env` with the following values. The webhook accepts JSON with `service`, `status` and `checks`, with an optional bearer token. Use a receiver or an adapter that accepts this format.

```dotenv
SITE_URL=https://alamut.bar
DRIVER_URL=https://driver.alamut.bar
OWNER_URL=https://owner.alamut.bar
INSPECTOR_URL=https://inspector.alamut.bar
ADMIN_URL=https://admin.alamut.bar
ALAMUT_ALERT_WEBHOOK=https://alerts.example.com/alamut
ALAMUT_ALERT_TOKEN=replace-with-the-receiver-token
```

Install the four unit files and start the first backup before enabling the timers.

```sh
sudo install -m 0644 infra/systemd/alamut-*.service infra/systemd/alamut-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start alamut-backup.service
sudo systemctl enable --now alamut-backup.timer alamut-probe.timer
```

The backend rejects debugless startup without a secret key. Demo seeding is disabled unless explicitly enabled and is idempotent; it preserves existing records. A new public instance should use a fresh database with no demo accounts.

## External integration boundaries

This delivery has no SMS credentials, banking/insurance contracts, production host, domain/DNS control or government service credentials. Therefore:

- Authentication uses username/password; SMS OTP and account recovery delivery need a provider.
- Invoice settlement is an operator's bookkeeping record, not a funds transfer.
- Inspection reports do not issue an insurance policy or an official government waybill.
- Location uses explicit driver-started watches while the page is open, not continuous background tracking/ETA/deviation detection.
- Document type checks do not replace malware scanning.
- The public privacy/terms text is a functional draft and needs the operator's real contact, retention and business terms before public use.

No changes were made to the live `alamut.bar` deployment or its accounts.

## Release 2 configuration

Set `SITE_URL` and `APP_URL` before the frontend build. The Windows build and start scripts import the web origins, internal API address and optional Google verification from the root `.env`. For a manual start, export the same settings in the build and run shells. Local origins deliberately disallow robots crawling. Keep `SECURITY_ENCRYPTION_KEY` as an independent stable secret and preserve it separately with encrypted backups. Rotating it without re-encryption makes TOTP seeds and queued recovery emails unreadable.

The recovery mail backend writes an encrypted database outbox. Configure `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` and a verified `DEFAULT_FROM_EMAIL`. Use `EMAIL_USE_TLS=1` with STARTTLS or `EMAIL_USE_SSL=1` with implicit TLS, with the other flag set to `0`. The `mail` Compose profile runs the worker. Windows `start.ps1` runs a local worker that uses `runtime/mail` in debug mode when SMTP is absent. The worker removes expired reset payloads. Test a reset with an owned mailbox and the public app URL during server acceptance.

Windows start.ps1 also starts `scripts/backup.py --loop --verify`: one backup every 24 hours while processes remain alive. A one-shot verified local backup is `backend/.venv/Scripts/python.exe scripts/backup.py --verify`. It archives SQL/private media, writes SHA256 metadata, restores SQL into a newly created isolated temporary DB, checks domain tables, and drops only that temporary DB. See runtime/backup-state.json and logs/backup.*. This helper is specifically restricted to the isolated local MySQL at port 3307. Container/remote backup scheduling requires the host's production backup system.

Local backups are not encrypted/off-host, do not include .env, and do not implement retention deletion. Coordinate SQL/media writes or use storage snapshots for a consistent busy production backup. Preserve all stable secrets separately. Test recovery procedures before public operation.

See [OPERATIONS_V2.fa.md](OPERATIONS_V2.fa.md) for driver KYC, CRM, access capabilities, GPS timing and user procedures. Test-only credentials/documents are explicitly fictional and cannot be used as evidence of real identity validation.

## Public content and PWAs

After migrations, run `python manage.py seed_content` in backend to create the four original guides without overwriting existing editorial records. bootstrap.ps1 does this for a fresh Windows setup. In Compose use `docker compose exec backend python manage.py seed_content`. Editorial access is assigned through the content capability; existing full operators receive it in migration 0009 and restricted operators retain their restrictions.

Public pages use API_INTERNAL_URL server reads. Build/runtime must reach Django on the configured internal URL. The standalone package includes public/pwa/sw.js and offline assets; do not remove public files. Each build generates a new public release ID, optionally supplied with RELEASE_ID before build. /pwa/worker returns JavaScript with no-store and Service-Worker-Allowed. Do not let a CDN cache that endpoint or the role manifests indefinitely. TLS is required for real phone installation and geolocation; localhost is only a development exception. Keep API no-store headers and private media authorization intact.

PWA offline intentionally offers a connection-help page, not a cached private workspace. Updates wait for the user's reload action; saving forms first is required. Installation and browser support must be checked on the actual production Android/iOS devices. This delivery verified manifests, actual local worker readiness, worker update activation, and a real local server-outage/recovery fallback, but did not install apps on physical phones. See PANEL_AUDIT_PWA.fa.md.
