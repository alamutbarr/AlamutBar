import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { persianParts } from "../shared/components/persian-date";
import { roleOrigin, siteOrigin } from "./targets";

const adminPasswordFile = process.env.QA_ADMIN_PASSWORD_FILE;
test.skip(
  !adminPasswordFile,
  "Set QA_ADMIN_PASSWORD_FILE to a local test staff account's password file.",
);
test.use({ channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined });

const operations = roleOrigin("admin") + "/django-admin/operations/";
const points = { latitude: 36.268, longitude: 50.004, accuracy: 15 };
const fixture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVR4nGP8//8/AwMDEwMYAAAkBgMBXaJOiAAAAABJRU5ErkJggg==",
  "base64",
);

async function fill(page: Page, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    await page.locator(`[name="${name}"]`).fill(value);
  }
}

async function dateField(page: Page, label: string, value: Date) {
  const { year, month, day } = persianParts(value);
  for (const [part, number] of [
    ["سال", year],
    ["ماه", month],
    ["روز", day],
  ] as const) {
    await page
      .getByLabel(`${label} ${part}`, { exact: true })
      .selectOption(String(number));
  }
}

async function portalLogin(page: Page, role: "owner" | "inspector") {
  await page.goto(`${roleOrigin(role)}/${role}/app`);
  await fill(page, { username: `${role}.demo`, password: "AlamutDemo!2026" });
  await page.getByRole("button", { name: /^ورود به پنل/ }).click();
  await expect(
    page.getByRole("navigation", { name: "منوی پنل" }),
  ).toBeVisible();
}

async function adminLogin(page: Page) {
  await page.goto(operations);
  const password = (await readFile(adminPasswordFile!, "utf8")).trim();
  await fill(page, { username: "admin.demo", password });
  await page.locator('input[type="submit"]').click();
  await expect(
    page.getByRole("heading", { name: "عملیات و پیگیری حمل" }),
  ).toBeVisible();
}

async function fits(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test("browser walkthrough from new driver dossier to completed freight and public tracking", async ({
  browser,
}, info) => {
  test.setTimeout(240_000);
  const capture = (page: Page, name: string) =>
    page.screenshot({
      path: info.outputPath(`${name}.png`),
      fullPage: !name.startsWith("admin"),
      animations: "disabled",
    });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    geolocation: points,
  });
  await context.grantPermissions(["geolocation"], {
    origin: roleOrigin("driver"),
  });
  const [site, driver, owner, inspector, admin] = await Promise.all(
    Array.from({ length: 5 }, () => context.newPage()),
  );
  const runId = String(Date.now());
  const sitePaths = [
    "/",
    "/apps",
    "/services",
    "/about",
    "/articles",
    "/faq",
    "/contact",
    "/tracking",
    "/privacy",
    "/terms",
    "/help",
    "/status",
  ];
  const title = `بار آزمایشی QA ${runId}`;
  const familyName = `آزمایش-${runId}`;
  let shipmentId: number;
  let driverId: number;
  let code: string;
  const detail = (role: "driver" | "owner" | "inspector" = "driver") =>
    `${roleOrigin(role)}/${role}/shipments/${shipmentId}`;
  const row = () =>
    admin
      .locator("article.ops-row")
      .filter({ has: admin.getByRole("heading", { name: new RegExp(code) }) });

  try {
    await test.step("review public navigation, articles and mobile layout", async () => {
      for (const path of sitePaths) {
        expect((await site.goto(siteOrigin + path))?.status(), path).toBe(200);
        await expect(site.locator("h1").first()).toBeVisible();
        await fits(site);
      }
      await site.goto(siteOrigin);
      await capture(site, "landing-desktop");
      await site.setViewportSize({ width: 390, height: 844 });
      await fits(site);
      await capture(site, "landing-mobile");
      for (const path of sitePaths.slice(1)) {
        expect((await site.goto(siteOrigin + path))?.status(), path).toBe(200);
        await fits(site);
      }
      await site.goto(`${siteOrigin}/articles`);
      await site.locator('main a[href^="/articles/"]').first().click();
      await expect(site.locator("main h1")).toBeVisible();
      await site.goto(`${siteOrigin}/apps`);
      for (const role of ["driver", "owner", "inspector"]) {
        await expect(
          site.locator(`a[href="${roleOrigin(role)}/${role}/app"]`).first(),
        ).toBeVisible();
      }
    });

    await test.step("register driver, save vehicle, and upload documents", async () => {
      await driver.setViewportSize({ width: 390, height: 844 });
      await driver.goto(`${roleOrigin("driver")}/register?role=driver`);
      await fill(driver, {
        first_name: "راننده تست",
        last_name: familyName,
        phone: `0939${runId.slice(-7)}`,
        email: `qa-${runId}@example.invalid`,
        username: `browser-qa-${runId}`,
        password: "LocalBrowserQATest!2026",
        password_confirmation: "LocalBrowserQATest!2026",
      });
      await fits(driver);
      await capture(driver, "driver-registration");
      await driver
        .getByRole("button", { name: "ساخت حساب و تکمیل پرونده" })
        .click();
      await expect(driver).toHaveURL(/\/driver\/onboarding$/);
      const identity = runId.slice(-9);
      const rem =
        [...identity].reduce(
          (sum, digit, i) => sum + Number(digit) * (10 - i),
          0,
        ) % 11;
      const future = new Date(Date.now() + 365 * 86400000);
      await fill(driver, {
        national_id: identity + (rem < 2 ? rem : 11 - rem),
        emergency_name: "تماس آزمایشی",
        emergency_phone: "09120000008",
        address: "نشانی ساختگی برای آزمون محلی",
      });
      await dateField(driver, "تاریخ تولد", new Date("1990-01-01T12:00:00Z"));
      await dateField(driver, "اعتبار گواهینامه", future);
      await dateField(driver, "اعتبار بیمه‌نامه", future);
      await driver.getByRole("button", { name: "ذخیره و ادامه" }).click();
      await expect(
        driver.getByRole("heading", { name: "خودروی شما" }),
      ).toBeVisible();
      await driver.locator('[name="kind"]').selectOption("truck");
      await fill(driver, {
        plate: `QA-${runId}`,
        capacity: "12",
        license_number: `QA-LIC-${runId}`,
      });
      await driver.getByRole("button", { name: "ذخیره و ادامه" }).click();
      await expect(
        driver.locator('.credential input[type="file"]'),
      ).toHaveCount(6);
      const reviewButton = driver.getByRole("button", {
        name: "بازبینی و ارسال پرونده",
        exact: true,
      });
      await expect(reviewButton).toBeDisabled();
      for (const [index, label] of [
        "کارت ملی",
        "گواهینامه رانندگی",
        "کارت خودرو",
        "بیمه‌نامه معتبر",
        "کارت هوشمند",
        "کارت سلامت",
      ].entries()) {
        const card = driver.locator(".credential").filter({ hasText: label });
        const name = `qa-document-${index + 1}.png`;
        await card
          .locator('input[type="file"]')
          .setInputFiles({ name, mimeType: "image/png", buffer: fixture });
        await expect(
          card.getByRole("link", { name: `دریافت ${name}` }),
        ).toBeVisible();
        if (index === 3) await expect(reviewButton).toBeEnabled();
      }
      await fits(driver);
      await capture(driver, "driver-documents");
      await reviewButton.click();
      await driver
        .getByRole("button", { name: "ارسال پرونده برای بررسی" })
        .click();
      await expect(
        driver.getByText("پرونده برای بررسی ارسال شد.", { exact: true }),
      ).toBeVisible();
      const user = await driver.evaluate(async () =>
        (await fetch("/api/auth/me/")).json(),
      );
      expect(user.driver_market_enabled).toBe(false);
      driverId = user.id;
    });

    await test.step("verify documents in staff console and create freight in owner portal", async () => {
      await adminLogin(admin);
      await admin.setViewportSize({ width: 390, height: 844 });
      await fits(admin);
      await capture(admin, "admin-mobile");
      await admin.setViewportSize({ width: 1440, height: 900 });
      const driverLink = admin.getByRole("link", { name: new RegExp(familyName) });
      const legacyReview = await driverLink.getAttribute("href");
      const dossierRow = admin.locator("p").filter({ has: driverLink });
      await dossierRow.getByRole("link", { name: "باز کردن پرونده" }).click();
      await admin.getByRole("link", { name: "بررسی جداگانه" }).first().click();
      await admin.getByRole("button", { name: "رد مدرک" }).click();
      await expect(admin.locator(".error")).toContainText("دلیل رد هر مدرک الزامی است");
      await admin.getByLabel("یادداشت بررسی").fill("تصویر واضح نیست.");
      await admin.getByRole("button", { name: "رد مدرک" }).click();
      await expect(admin.locator(".alamut-status")).toHaveText("رد شده");
      await admin.getByLabel("یادداشت بررسی").clear();
      await admin.getByRole("button", { name: "تأیید مدرک" }).click();
      await expect(admin.locator(".alamut-status")).toHaveText("تأیید شده");
      await admin.goto(new URL(legacyReview!, operations).toString());
      const docs = admin.locator('select[name^="document_"]');
      await expect(docs).toHaveCount(6);
      expect(admin.url()).toContain(`driver=${driverId}`);
      const href = await admin
        .locator(".ops-doc a")
        .first()
        .getAttribute("href");
      const access = await admin.evaluate(
        async (url) => (await fetch(url)).status,
        href!,
      );
      expect(access).toBe(200);
      for (const select of await docs.all())
        await select.selectOption("approved");
      await admin.getByRole("button", { name: "ثبت نتیجه بررسی" }).click();
      await expect(admin.locator(".success")).toContainText("عملیات ثبت شد.");
      await driver.reload();
      await expect
        .poll(() =>
          driver.evaluate(
            async () =>
              (await (await fetch("/api/auth/me/")).json())
                .driver_market_enabled,
          ),
        )
        .toBe(true);

      await portalLogin(owner, "owner");
      await owner.goto(`${roleOrigin("owner")}/owner/shipments/new`);
      await fill(owner, {
        title,
        cargo_type: "کالای آزمایشی",
        origin: "قزوین",
        destination: "رشت",
        origin_address: "مبدأ خصوصی آزمایشی",
        destination_address: "مقصد خصوصی آزمایشی",
        weight: "5",
        price: "7000000",
        cargo_value: "50000000",
        recipient_name: "گیرنده آزمایشی",
        recipient_phone: "09120000008",
        notes: "رکورد ساختگی برای QA محلی",
      });
      await owner.locator('[name="vehicle_type"]').selectOption("truck");
      await dateField(
        owner,
        "تاریخ بارگیری",
        new Date(Date.now() + 7 * 86400000),
      );
      await capture(owner, "owner-request");
      const created = owner.waitForResponse(
        (r) =>
          r.url().endsWith("/api/shipments/") &&
          r.request().method() === "POST",
      );
      await owner
        .getByRole("button", { name: "ثبت درخواست حمل", exact: true })
        .click();
      const response = await created;
      expect(response.status(), await response.text()).toBe(201);
      const shipment = await response.json();
      shipmentId = shipment.id;
      code = shipment.code;
      await expect(owner).toHaveURL(detail("owner"));
      await admin.reload();
      await row().locator('select[name="status"]').selectOption("approved");
      await row().getByRole("button", { name: "ثبت مرحله" }).click();
      await expect(admin.locator(".success")).toContainText("عملیات ثبت شد.");
    });

    await test.step("offer a price, assign driver and inspector, then inspect loading", async () => {
      await driver.goto(`${roleOrigin("driver")}/driver/market/${shipmentId}`);
      await expect(driver.getByText("مبدأ خصوصی آزمایشی")).toHaveCount(0);
      await driver.getByRole("button", { name: "ثبت پیشنهاد کرایه" }).click();
      await fill(driver, { amount: "6500000", note: "پیشنهاد آزمایشی مرورگر" });
      const offer = driver.waitForResponse(
        (r) =>
          r.url().endsWith(`/shipments/${shipmentId}/offer/`) &&
          r.request().method() === "POST",
      );
      await driver.getByRole("dialog").locator("form button").last().click();
      expect((await offer).status()).toBe(201);
      await owner.reload();
      await expect(owner.getByText("پیشنهاد آزمایشی مرورگر")).toBeVisible();
      await admin.reload();
      await expect(
        row().getByText(/6500000.*پیشنهاد آزمایشی مرورگر/),
      ).toBeVisible();
      await row().scrollIntoViewIfNeeded();
      await capture(admin, "admin-dispatch");
      await row()
        .locator('select[name="driver"]')
        .selectOption(String(driverId));
      await row()
        .locator('select[name="inspector"]')
        .selectOption({ label: "علی کریمی" });
      await row().getByRole("button", { name: "تخصیص", exact: true }).click();
      await expect(admin.locator(".success")).toContainText("عملیات ثبت شد.");
      await driver.goto(detail());
      await driver.getByRole("button", { name: "شروع بارگیری" }).click();
      await expect(
        driver.getByRole("button", { name: "شروع حرکت" }),
      ).toBeDisabled();
      await portalLogin(inspector, "inspector");
      await inspect("بارگیری");
      await driver.reload();
      await driver.getByRole("button", { name: "شروع حرکت" }).click();
    });

    await test.step("share location from driver, see marker in owner and admin monitoring", async () => {
      await driver
        .getByRole("button", { name: "شروع اشتراک موقعیت سفر" })
        .click();
      await expect(driver.getByText("موقعیت با موفقیت ثبت شد.")).toBeVisible({
        timeout: 20_000,
      });
      await owner.goto(detail("owner"));
      const map = owner.getByRole("region", {
        name: "نقشه موقعیت ثبت‌شده رانندگان",
      });
      await expect(map.locator(".leaflet-interactive")).toBeVisible();
      await expect(
        owner.getByRole("button", { name: "تمرکز روی موقعیت‌ها" }),
      ).toBeVisible();
      await capture(owner, "owner-live-map");
      await owner.setViewportSize({ width: 390, height: 844 });
      await fits(owner);
      await map.scrollIntoViewIfNeeded();
      await capture(owner, "owner-live-map-mobile");
      await owner.setViewportSize({ width: 1440, height: 900 });
      await admin.reload();
      const monitoring = admin
        .locator("section.ops-section")
        .filter({ has: admin.getByRole("heading", { name: "رصد عملیات" }) });
      await monitoring.locator("p").filter({ hasText: code }).getByRole("link").click();
      await expect(admin.locator(".alamut-map-canvas .leaflet-interactive")).toBeVisible();
      await expect(admin.locator(".alamut-map-positions")).toContainText("36.268, 50.004");
      await admin.getByRole("link", { name: "نقشهٔ همهٔ سفرهای فعال" }).click();
      await expect(admin.locator(".alamut-map-positions")).toContainText(code);
      await admin.setViewportSize({ width: 390, height: 844 });
      await fits(admin);
      await admin.setViewportSize({ width: 1440, height: 900 });
      await driver.getByRole("button", { name: "توقف اشتراک موقعیت" }).click();
      await driver.getByRole("button", { name: "ثبت رسیدن و تحویل" }).click();
      await expect(
        driver.getByRole("button", { name: "ثبت رسیدن و تحویل" }),
      ).toHaveCount(0);
    });

    await test.step("inspect delivery, complete freight, and check public tracking privacy", async () => {
      await owner.reload();
      const finish = owner.getByRole("button", {
        name: "تأیید نهایی و صدور صورتحساب",
      });
      await expect(finish).toBeDisabled();
      await inspect("تحویل");
      await owner.reload();
      const completed = owner.waitForResponse(
        (r) =>
          r.url().endsWith(`/shipments/${shipmentId}/transition/`) &&
          r.request().method() === "POST",
      );
      await finish.click();
      expect((await completed).status()).toBe(200);
      const invoices = await owner.evaluate(async () =>
        (await fetch("/api/invoices/")).json(),
      );
      expect(invoices.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ shipment: shipmentId, amount: 6500000 }),
        ]),
      );
      await admin.goto(operations);
      const invoice = admin.locator("article.ops-row").filter({
        has: admin.getByRole("heading", {
          name: new RegExp(`${code}.*تومان`),
        }),
      });
      await invoice.locator('[name="amount"]').fill("6500000");
      await invoice.locator('[name="reference"]').fill(`QA-SIMULATED-${runId}`);
      await invoice
        .getByRole("button", { name: "ثبت پرداخت حسابداری" })
        .click();
      await expect(admin.locator(".success")).toContainText("عملیات ثبت شد.");
      const paid = await owner.evaluate(async () =>
        (await fetch("/api/invoices/")).json(),
      );
      expect(paid.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ shipment: shipmentId, status: "paid" }),
        ]),
      );
      await site.goto(`${siteOrigin}/tracking`);
      await fill(site, { code });
      await site
        .getByRole("button", { name: "پیگیری محموله", exact: true })
        .click();
      const result = site.locator(".tracking-result");
      await expect(result).toContainText(code);
      await expect(result).toContainText("قزوین");
      await expect(result).not.toContainText("گیرنده آزمایشی");
      const publicData = await site.evaluate(
        async (id) => (await fetch(`/api/tracking/?code=${id}`)).json(),
        code,
      );
      expect(publicData).toMatchObject({ status: "completed" });
      expect(publicData).not.toHaveProperty("locations");
      await capture(site, "tracking-completed");
      console.log(
        `Completed local QA freight: code=${code} shipment=${shipmentId} driver=${driverId}`,
      );
    });
  } finally {
    await context.close();
  }

  async function inspect(stage: "بارگیری" | "تحویل") {
    if (stage === "بارگیری") {
      await inspector.setViewportSize({ width: 390, height: 844 });
    }
    await inspector.goto(detail("inspector"));
    const openInspection = inspector.getByRole("button", {
      name: `ثبت بازرسی ${stage}`,
    });
    await expect(openInspection).toBeVisible();
    if (stage === "بارگیری") {
      await fits(inspector);
      const badge = await inspector
        .locator(".shipment-heading .badge")
        .boundingBox();
      expect(badge?.height).toBeLessThan(44);
    }
    await openInspection.click();
    if (stage === "بارگیری") {
      await inspector
        .getByRole("dialog")
        .screenshot({
          path: info.outputPath("inspector-loading-mobile.png"),
          animations: "disabled",
        });
    }
    await fill(inspector, {
      seal_number: `QA-${runId}`,
      notes: "بازرسی ساختگی مرورگر",
    });
    for (const check of ["packaging_ok", "weight_ok", "vehicle_ok"]) {
      await inspector.locator(`[name="${check}"]`).selectOption("true");
    }
    const saved = inspector.waitForResponse(
      (r) =>
        r.url().endsWith(`/shipments/${shipmentId}/inspect/`) &&
        r.request().method() === "POST",
    );
    await inspector.getByRole("button", { name: "ثبت گزارش بازرسی" }).click();
    expect((await saved).status()).toBe(201);
  }
});
