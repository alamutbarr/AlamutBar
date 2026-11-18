# Verification record

Executed locally on **November 9, 2026 (Asia/Tehran)**. No external deployment or live reference account was modified.

| Check | Result |
| --- | --- |
| Django business/auth/boundary tests | **124 passed**, real MySQL |
| Domain statement coverage | **96%**; tests, migrations and demo seeder excluded |
| MySQL concurrent assignment | Two threads compete for one driver; exactly one assignment succeeds |
| Next.js → Django → MySQL HTTP journey | **27 passed** (13 HTTP checks and 14 unit/worker/calendar cases), including CSRF cookies through the proxy |
| TypeScript strict check | Passed |
| Production npm dependency audit | 0 reported vulnerabilities at verification time |
| Optimized Next.js production build + standalone assets | Passed |
| Django system check | Passed |
| Django deployment check with production security flags | Passed, no reported issues |
| Tracked migrations vs models | No changes detected |
| OpenAPI generation, validation and fail-on-warning | Passed with no schema warnings/errors |
| PowerShell script parsing | Passed |
| Compose configuration parsing | Passed |
| Local hidden process startup and database health | Verified through port 3001 |
| Local service stop/start | Verified against project-owned processes |

Coverage is a statement metric, not a claim that every possible production condition has been tested. See [coverage.txt](coverage.txt) for the report.

## HTTP journey

`frontend/tests/journey.spec.ts` uses Playwright's **HTTP request context**, without launching a browser. It creates explicitly fictional users and records on loopback only and exercises:

1. Public page, real database health, anonymous boundary and CSRF rejection.
2. Owner registration/request, scoped search and cross-owner denial.
3. Operator approval, driver profile/vehicle/four credentials, unverified denial, document review, offer and assignment.
4. Loading inspection gate, GPS point authorization, movement, delivery, destination inspection and final invoice.
5. Settlement authorization and duplicate rejection, including inspector financial isolation.
6. Support conversation scope/reply/close, CSV export and notice read scope.

These tests deliberately persist fictional records in the local application database. Django unit/integration tests use the separate `test_alamut` database and do not reset application records. The test suite refuses non-loopback URLs.

## Browser verification

The actual interface was inspected using the in-app browser at desktop width and a **390 × 844** mobile viewport. The temporary viewport override was reset afterward. The mobile layout had no horizontal document overflow (390px viewport, 375px document content with the scrollbar) after fixing the closed drawer overflow; wide shipment tables scroll within their own container.

A full interface journey was performed with all four roles:

- Owner created the explicitly named **آزمایش رابط موبایل — قطعات بسته‌بندی** from the mobile form.
- Operator approved it and assigned the seeded truck driver and inspector through the assignment dialog.
- Driver opened the assigned trip and started loading.
- Inspector submitted the loading checklist and seal number.
- Driver moved it to transit and delivery.
- Inspector submitted the delivery checklist.
- Owner confirmed completion; the server generated its invoice.

The resulting history and reports were visible in the interface and persisted in MySQL. File upload privacy/signature checks, GPS boundaries, stale/out-of-order timestamps, incident gates, partial payment limits, capability isolation, TOTP/recovery/outbox and settlement idempotency are covered by API tests. The browser's real geolocation permission was not granted or fabricated during verification. No real cargo, banking payment or insurance issuance occurred.

Saved interface captures: [desktop home](qa/home-desktop.png), [mobile home](qa/home-mobile.png), [owner dashboard](qa/owner-dashboard.png). The final standalone frontend and authenticated dashboard were checked again after startup; the final page reported no browser console errors.

## Re-run

```powershell
pwsh -File scripts/start.ps1
pwsh -File scripts/verify.ps1
```

For the frontend build, use `scripts/build.ps1`; it releases running project services before replacing Windows-locked standalone build files and restores them when appropriate.

## Verification limits

- Docker is absent on this device. Container files were parsed, but image build, Compose startup and Linux container behavior were not executed here.
- اجرای CI راه‌دور جزو این تحویل نیست؛ بررسی‌ها به‌صورت محلی انجام شده‌اند.
- This was not a load test, independent penetration test, formal accessibility audit or certification of a regulated transport workflow.
- Payment gateway, SMS/OTP/recovery delivery, insurance, government waybill and background GPS services were not connected. Manual partial payment bookkeeping and driver-started browser GPS watches while the page remains open are implemented.
- The live `alamut.bar` hosting/domain and any undisclosed authenticated reference-panel behavior were not replicated from private access. Public visual/reference material and the requested roles informed the new implementation.

## Earlier v2 verification record

- Full backend suite: 117 tests, 68.061 seconds, actual MySQL test database. Domain statement coverage: 1526 statements, 55 missed, 96%; see coverage.txt. Tests/migrations/management commands excluded from the metric; outbox command behavior is exercised by tests despite that exclusion.
- Final production standalone HTTP suite: 11 passed, 14.8 seconds. TypeScript and optimized build passed after saved-address picker integration.
- Driver onboarding was exercised in the browser: valid synthetic identity, Persian birth/expiry dates, vehicle, four private PNG credential uploads, submission, per-document review and operator approval. The review note explicitly records test-only fictional data; no real identity was assessed.
- CRM browser verification created a fictional lead, changed its stage, recorded a call, created an assigned follow-up and completed it. Local Persian phone input normalized correctly.
- Leaflet/OpenStreetMap actually loaded Iran tiles. With no real GPS for an active trip, the interface correctly displayed no marker and identified the trip with missing location. Real browser geolocation permission was not granted.
- Local verified backup restored 13 shipments and driver profiles into a new isolated temporary database, then removed that temporary database. Latest successful archive at verification: runtime/backups/20261108T221826/5cc080b2/alamut-backup.zip. Live app database was preserved.
- Runtime database credentials, .env, private documents and database are excluded from the source archive. Actual private data stays in ignored local runtime/media paths.

Additional captures: [driver review](qa/driver-review-v2.png), [CRM](qa/crm-v2.png), [control room](qa/control-room-v2.png), [map](qa/map-v2.png), [mobile control](qa/control-mobile-v2.png). Consult OPERATIONS_V2.fa.md for deployment requirements and precise integration limits. SEO metadata correctness is tested; search ranking, rich-result display and indexing on an unconnected public domain are not claimed.

Saved-address selection was tested in the 390 × 844 mobile form: city/address/recipient were populated and an already typed cargo title was preserved. The temporary viewport override was reset. The final standalone home and map tab reported no browser console errors. [Mobile address picker](qa/address-mobile-v2.png), [final home](qa/home-v2.png).

Final capability review also verifies a CRM-only operator can load the minimal CRM staff directory without monitoring access, cannot fetch the control room/shipments/invoices, and receives no shipment details through the dashboard recent list. An owner cannot fetch the CRM staff directory.

## v3: panel audit, public content and role PWAs

- Backend: **124 tests passed**, actual isolated MySQL test database, **69.528 seconds**. Coverage: **1628 statements, 58 missed, 96%**, excluding tests/migrations/management code from the metric. Management delivery behavior remains exercised by existing tests.
- Frontend final production standalone suite: **27 passed**. This consists of 6 freight HTTP journeys, 4 public/PWA/editorial HTTP cases, 3 SEO/asset HTTP checks, 7 API-error/normalization unit cases, 5 Service Worker sandbox cases, and 2 calendar cases. No browser was launched by this test suite; real UI checks used the in-app browser.
- TypeScript strict check and optimized build passed. OpenAPI validated with fail-on-warning. Models match tracked migrations. Production npm audit reported zero vulnerabilities.
- Four manifests return distinct app identities/scopes/start paths and valid PNG icons. Worker is served as JavaScript with no-store and Service-Worker-Allowed. Generated release IDs update with builds. Anonymous app entry and noindex metadata were checked.
- Draft and future articles are unavailable publicly; publish/unpublish, content permission, safe text rendering, duplicate slugs and maximum content size were tested. The content endpoint is read-only publicly and edits are audited.
- Invalid panel/role/deep paths and unknown articles return actual HTTP **404**, not soft-404 pages with HTTP 200.
- **41 panel menu routes** were opened across operator (14), owner (9), driver (10), inspector (8). **13 public pages** were inspected at mobile width. Initial table overflow was traced to an absolutely positioned accessible header label; the table scroll container now contains that label. Final production checks of owner dashboard/list and driver market reported **375px document width inside a 390px viewport**. Mobile drawer Escape/focus handling and logout/re-entry were also exercised.
- Public FAQ search, tracking of a fictional demo shipment, contact-to-CRM submission, Persian phone handling and a browser-driven article draft/publish/unpublish journey passed. Synthetic review articles were returned to draft after verification.
- Real worker update activation was exercised through the visible update button. Real offline fallback was verified by stopping only the local project web service, reloading a controlled private panel URL, observing the generic offline page, restarting the service, and using its retry button to return to the same authenticated page. No private panel snapshot was displayed offline.
- The final fresh public preview reported no browser console errors. The temporary 390 × 844 viewport override was reset.
- A verified local backup restored **16 shipments** into a separate temporary database; archive: runtime/backups/20261108T230208/c81b227c/alamut-backup.zip. The archive was taken before the final browser-only draft was added; the daily backup worker remains running.

Evidence: [four apps desktop](qa/apps-desktop-v3.png), [apps mobile](qa/apps-mobile-v3.png), [offline fallback](qa/pwa-offline-v3.png), [editorial mobile](qa/editorial-mobile-v3.png), [articles](qa/articles-mobile-v3.png), [guide](qa/guide-mobile-v3.png), [owner app](qa/owner-app-mobile-v3.png), [driver market](qa/driver-market-mobile-v3.png), [route audit data](qa/panel-audit-v3.json).

Physical Android/iOS installation and a public HTTPS domain were not available. Manifest/worker readiness and local offline/recovery do not certify every browser/OS installation flow. Same-origin sessions remain shared across separately installed role apps. No background GPS, external push, bank, SMS, government or live SMTP integration is implied. Docker and remote CI are still unexecuted on this host. See [PANEL_AUDIT_PWA.fa.md](PANEL_AUDIT_PWA.fa.md).

## Production release verification

- **127 Django tests passed** against the isolated MySQL test database, including staff account creation and capability boundaries. OpenAPI validation and the migration consistency check passed.
- A fresh, separate MySQL schema was migrated and seeded with fictional accounts and public guides. Optimized standalone Next.js and Django with `DJANGO_DEBUG=0` and HTTPS redirects ran behind a loopback TLS proxy. Django's deployment check reported zero issues. The check verified HTTPS article and sitemap links and a secure session cookie.
- **27 Playwright HTTP and worker tests passed** in that environment. The freight journey uploaded an exactly **10 MiB** synthetic licence, downloaded matching bytes with an authorized account, and checked that an unrelated account was denied. Article publication and removal were tested through the production frontend.
- TypeScript and the production frontend build passed. The production npm audit reported zero vulnerabilities.
- An encrypted backup was decrypted, its SQL restored to a fresh isolated MySQL schema, and synthetic private media compared byte for byte. This used real MySQL and `age` with a local substitute for the Compose command transport. The recovery drill did not touch the application database.
- CI now checks production container startup, content and sitemap rendering, and encrypted recovery. Docker and remote CI were unavailable on the verification host. Public deployment, live SMTP, off-host backup and alert configuration, and physical Android/iOS installation and GPS checks remain release acceptance steps for the target environment.

## Mobile workspace layout

- The optimized Next.js build and TypeScript check passed. The browser suite passed **10 tests** in Chrome and WebKit with Android and iPhone viewport profiles against the local standalone build and MySQL-backed API.
- Each browser visited **42 role routes**, including the new-request form, at **320 CSS pixels** without document-level horizontal scrolling. Touch navigation was checked at **844 × 390**. Switching to desktop restored the sidebar and regular table rows.
- The suite used the visible sign-in forms and exercised shipment cards, the grouped freight request, support conversations, the driver's market and document steps, the operator's map and CRM form, inspector detail navigation, and public tracking and panel links. It verified Escape and focus restoration for the bottom menu.
- The existing **27 HTTP and worker regression tests** passed against the same build, including the freight journey and PWA privacy and update behavior.
- The Playwright Chromium download was unavailable from this host. The local run used the installed Chrome executable for the Chromium profile and Playwright WebKit for the iPhone profile. CI is configured to install and run both bundled engines. Physical device installation and software keyboards were outside this run.

## Separate public and panel hosts

- **127 Django tests and 27 single-host Playwright regressions passed**. The recovery test verifies that the encrypted email outbox contains the configured panel origin. The optimized build and TypeScript checks passed.
- A separate MySQL schema was migrated and seeded with fictional data for the two-host production check. The smoke script verified public articles and sitemap, redirects for all four legacy panel routes, app-host manifests and worker, `noindex` and private cache headers, rejection of unrecognized hosts and cross-origin API writes, and the secure host-only CSRF cookie. Django's deployment check reported zero issues.
- Chrome in a mobile viewport followed the public directory link to the panel, signed in, activated the driver Service Worker on the app origin, and retained its session after visiting the public site. The public host received no app session cookie. Public tracking and a fictional contact submission succeeded.
- All **6 freight journey tests** passed behind the two-host HTTPS setup, including the 10 MiB private licence upload, access-controlled download, inspection, GPS API and billing transitions.
- The nginx example was started on loopback with a test certificate and an echo upstream. Both production hostnames were sent as HTTP `Host` values. nginx preserved the expected host, replaced forged forwarding headers, redirected HTTP to HTTPS, and rejected an unknown host.
- These checks used isolated loopback infrastructure. Public DNS, certificates and Docker/remote CI were outside the local verification.

## Operations and release acceptance

- **129 Django tests, 28 Playwright HTTP/worker tests and 10 mobile browser tests passed.** TypeScript and the optimized build passed. Both mobile profiles confirmed that stopping sharing discards an unsent GPS point even when the network reconnects or a late callback arrives. The API test confirmed that cancellation during CSRF retrieval prevents the GPS POST. Browser location was simulated.
- Actual SMTP delivery used isolated loopback servers with STARTTLS and implicit TLS and a test-only trusted certificate. Both runs queued an encrypted reset, delivered it, cleared its payload, changed the password and rejected token reuse. The MySQL suite checked expiration and stale delivery leases. The SMTP fixture used an isolated SQLite database and fictional recipients.
- The production preflight accepted a complete fixture and rejected invalid origins, sample secrets, conflicting SMTP modes and missing business settings. A separate optimized build rendered the configured contact, terms and privacy fields with fictional values.
- The probe exercised HTTP health, stale archives, a failed webhook delivery, retry, deduplication and recovery against local fixtures. The encrypted archive drill restored synthetic SQL into isolated MySQL and matched private media bytes. The backup drill substituted the local command transport for Docker. Compose YAML, CI shell syntax and systemd unit structure passed static checks.
- Docker containers and systemd timers require a Linux deployment host. Production mail, the off-host backup mount and the alert receiver need real credentials and an acceptance run. Public DNS and device installation were outside this run.

## Driver registration and market access

- **12 mobile browser tests and 28 HTTP/worker tests passed.** Both Android and iPhone viewport profiles used the visible registration form to save a fictional driver, verified the optional email and disabled market access, submitted identity fields through the Persian date controls, and verified resumption at the vehicle step after attempting a direct market URL.
- The MySQL-backed freight journey verified that a direct request for a market shipment is blocked before review, including after submission. An operator approved all four required documents, after which the same account could view the redacted shipment and submit an offer. The journey continued through assignment, inspection and billing.
- **130 Django tests passed on isolated MySQL.** The expiry test verified that an expired licence hides market freight while keeping an assigned trip accessible. OpenAPI validation, the migration consistency check, TypeScript and the optimized build passed.

## Next.js site, React portals and Django management

- **143 Django tests passed** on isolated MySQL with **96% coverage**. The new checks cover host isolation, role mismatch, CSRF, staff capabilities, shipment transitions through Django Admin, audited CRM writes and TOTP enrollment and login.
- **29 Playwright HTTP and worker tests passed** against the five local hosts. Coverage includes the freight journey, private document review, inspection, billing, article publication, sitemap entries and contact CSRF.
- **11 mobile browser tests passed** across Chromium and WebKit. Chromium activated all three Service Workers and displayed the offline fallback. That lifecycle case was skipped on WebKit. Real devices were outside this run.
- Next.js and each Vite workspace built successfully. OpenAPI matched the checked-in contract. No migrations were pending and npm audit reported zero vulnerabilities.
- Django production preflight passed with five HTTPS fixture origins. Nginx configuration checks passed for the edge, portal and admin gateway. A local nginx process served a compiled portal deep link, its Service Worker, MySQL health, the Django login form and its CSS.
- Docker builds, remote CI, public DNS and TLS, live SMTP and real-device installation still need a run in the target environment.

## HTTPS cutover rehearsal

- Built Next.js and all three Vite apps for the five release hostnames on an isolated localhost listener. Windows nginx routed TLS to the correct static apps, Django Admin and the public site. The smoke client trusted a temporary local CA and verified the certificate hostnames while forcing DNS resolution to loopback.
- The five-host check passed with Django debug disabled, real local MySQL, published article URLs in the sitemap, legacy redirects, blocked private API on the public host, separate PWA manifests and JavaScript workers, secure host-only CSRF cookies and the admin login.
- Both HTTP configs served an ACME challenge file. Ordinary HTTP traffic returned 503 in the bootstrap config and redirected to HTTPS in the release config.
- The public apex responded from Chabokan and the authoritative DNS returned NXDOMAIN for `driver`, `owner`, `inspector` and `admin` at the time of the check. The rehearsal used no public DNS changes or externally issued certificates.

## Separate application folders and local startup

- A fresh source tree was prepared independently. `npm ci`, TypeScript, the standalone Next.js build from `apps/site`, and the three Vite builds passed without using the installed dependencies or build cache in the working copy.
- All applications started at their documented local addresses. Chrome signed in to the driver, owner, inspector and Django management interfaces in one browser context. Reloading the three portals kept each role signed in to its own account. Django Admin opened the operations page with the local test staff account.
- `scripts/verify.ps1` passed with 143 Django tests, 96% coverage, 29 HTTP and worker tests, and 11 mobile browser tests. The Chromium-only offline lifecycle case was skipped on WebKit. The OpenAPI and migration consistency checks passed.

## QA مسیر کامل حمل در مرورگر

- صفحات اصلی عمومی در اندازهٔ دسکتاپ و موبایل باز شدند. فهرست پنل‌ها، مقاله و پیگیری عمومی هم از رابط کاربر بررسی شدند. تصاویر آزمون شامل لندینگ، پروندهٔ راننده، ثبت بار، تخصیص اپراتور، بازرسی موبایل و نقشهٔ صاحب بار است.
- رانندهٔ نمونه اطلاعات هویتی و خودرو را ذخیره کرد. کارت ملی، گواهینامه، کارت خودرو و بیمه‌نامه برای ارسال پرونده الزامی بودند. کارت هوشمند و کارت سلامت هم به‌صورت اختیاری بارگذاری شدند. اپراتور مدارک را در ادمین باز و بررسی کرد و پس از تأیید، بازار بار برای راننده فعال شد.
- صاحب بار از فرم پنل درخواست ثبت کرد. راننده پیشنهاد کرایه داد و اپراتور آن را کنار فرم تخصیص دید. ثبت بازرسی بارگیری و تحویل، ارسال موقعیت نمونه از مرورگر راننده، نمایش نشانگر برای صاحب بار، صدور صورتحساب و ثبت تسویهٔ حسابداری بررسی شدند. پیگیری عمومی وضعیت بار را با کد نشان داد.
- بازبینی موبایل مشکل ارتفاع برچسب «در حال بارگیری» را آشکار کرد. پس از جدا شدن استایل انتظار دریافت اطلاعات، آزمون اندازهٔ برچسب و امکان باز کردن و ثبت فرم بازرسی را در عرض ۳۹۰ پیکسل بررسی کرد.
- آزمون از داده و مختصات ساختگی روی سرور محلی استفاده می‌کند. تسویه، ثبت حسابداری آزمایشی است. مشخصات رسمی کسب‌وکار و متن‌های تأییدشدهٔ شرایط و حریم خصوصی پیش از انتشار در تنظیمات تولید وارد می‌شوند.

برای اجرای دوباره با سرویس‌های محلی روشن، از پوشهٔ `frontend` اجرا کنید.

```powershell
$env:QA_ADMIN_PASSWORD_FILE=(Resolve-Path ..\runtime\local-admin.txt).Path
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
npx.cmd playwright test tests/browser-journey.spec.ts --output ../runtime/qa-browser
```

## پذیرش انتشار و نصب پنل‌ها

- روی یک نسخهٔ جدا و تمیز، نصب وابستگی‌ها و بیلد بهینهٔ چهار فرانت با نشانی‌های HTTPS آزمایشی موفق شد. Django با `DEBUG=0` و دیتابیس MySQL جدا از محیط روزمره اجرا شد. `check_release --require-mail`، `check --deploy` و بررسی پنج نشانی از پشت nginx با بررسی گواهی آزمایشی پاس شدند.
- Chrome ویندوز هر سه PWA را با manifest مستقل پذیرفت، نصب کرد و در پنجرهٔ مستقل باز کرد. در نمای اندروید، هر سه پنل روی HTTPS صفحهٔ آفلاین را نشان دادند و پس از وصل‌شدن دوباره باز شدند. رد و سپس دادن مجوز مکان، ثبت مختصات شبیه‌سازی‌شده، نشانگر صاحب بار و توقف اشتراک هم بررسی شدند.
- بازیابی رمز با حساب ساختگی و سرور محلی SMTP که STARTTLS را الزامی می‌کرد پاس شد. لینک به نشانی پنل صاحب بار رسید و پس از تغییر رمز، استفادهٔ دوباره از آن رد شد.
- اجرای Docker روی سرور مقصد، گواهی عمومی، SMTP واقعی و نصب و GPS روی گوشی فیزیکی همچنان به محیط انتشار و دستگاه نیاز دارند. مراحل پذیرش روی گوشی در [راهنمای استقرار](RUNBOOK.md#dns-tls-and-cutover) ثبت شده‌اند.
