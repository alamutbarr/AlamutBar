import { multiApp, roleOrigin } from "./targets";
import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import { persianParts } from "../shared/components/persian-date";

const roles = {
  owner: { role: "owner", main: "ثبت بار", count: 10 },
  driver: { role: "driver", main: "بازار بار", count: 10 },
  admin: { role: "operator", main: "اتاق کنترل", count: 14 },
  inspector: { role: "inspector", main: "بازرسی", count: 8 },
} as const;
type Panel = keyof typeof roles;

function tabs(page: Page) {
  return page.getByRole("navigation", { name: "ناوبری برنامه" });
}

async function signIn(page: Page, panel: Panel) {
  await page.goto(roleOrigin(panel) + `/${panel}/app`);
  await page.locator('[name="username"]').fill(roles[panel].role + ".demo");
  await page.locator('[name="password"]').fill("AlamutDemo!2026");
  await page.getByRole("button", { name: /^ورود به پنل/ }).tap();
  await expect(tabs(page)).toBeVisible();
  await expect(page.locator(".app-dashboard-action")).toBeVisible();
}

async function fits(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        return document.documentElement.scrollWidth - width;
      }),
    )
    .toBeLessThanOrEqual(1);
  const bar = await tabs(page).boundingBox();
  expect(bar).toBeTruthy();
  expect(bar!.y + bar!.height).toBeCloseTo(page.viewportSize()!.height, 0);
}

async function capture(page: Page, name: string) {
  if (process.env.MOBILE_QA_SCREENSHOTS) {
    await page.screenshot({
      path: join(process.env.MOBILE_QA_SCREENSHOTS, name + ".png"),
    });
  }
}

for (const panel of (Object.keys(roles) as Panel[]).filter(
  (panel) => !multiApp || panel !== "admin",
)) {
  test(`${panel} tabs and every panel section fit a small touch screen`, async ({
    page,
  }, info) => {
    await signIn(page, panel);
    await capture(page, panel + "-dashboard-" + info.project.name);
    const nav = tabs(page);
    await expect(
      nav.getByRole("link", { name: roles[panel].main, exact: true }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "خانه" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.getByRole("navigation", { name: "منوی پنل" }),
    ).toBeHidden();
    for (const tab of await nav.getByRole("link").all()) {
      const bounds = await tab.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    const more = nav.getByRole("button", { name: "بیشتر" });
    await more.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "همه بخش‌های برنامه" });
    await expect(dialog).toBeVisible();
    const allSections = dialog.getByRole("link");
    await expect(allSections).toHaveCount(roles[panel].count + 1);
    const paths = (
      await allSections.evaluateAll((links) =>
        links.map((link) => link.getAttribute("href")),
      )
    ).filter((href): href is string => Boolean(href?.startsWith(`/${panel}/`)));
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(more).toBeFocused();

    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of paths) {
      await test.step(path, async () => {
        await page.goto(new URL(path, page.url()).href, {
          waitUntil: "domcontentloaded",
        });
        await expect(tabs(page)).toBeVisible();
        await expect(page.locator("main h1").first()).toBeVisible();
        await expect(page.locator("main .error-state")).toHaveCount(0);
        await fits(page);
      });
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await fits(page);
    await page.setViewportSize(viewport);
    if (panel === "owner") await checkOwnerFlow(page, info.project.name);
    if (panel === "driver") await checkDriverFlow(page);
    if (panel === "admin") await checkOperatorFlow(page);
    if (panel === "inspector") await checkInspectorFlow(page);
  });
}

async function checkOwnerFlow(page: Page, project: string) {
  await tabs(page).getByRole("link", { name: "ثبت بار" }).tap();
  await expect(
    tabs(page).getByRole("link", { name: "ثبت بار" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("group", { name: "۲. مسیر حمل" })).toBeVisible();
  const title = page.locator('[name="title"]');
  await expect(title).toHaveCSS("font-size", "16px");
  await title.fill("پیش‌نمایش فرم موبایل");
  await expect(
    page.getByRole("group", { name: "۴. گیرنده و توضیحات" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ثبت درخواست حمل" })
    .scrollIntoViewIfNeeded();
  await fits(page);
  await page.getByRole("link", { name: "بازگشت به فهرست" }).tap();

  const table = page.getByRole("table", { name: "محموله‌ها" });
  await expect(table.locator("tbody tr").first()).toHaveCSS("display", "grid");
  await capture(page, "owner-shipments-" + project);
  const detail = table.getByRole("link", { name: /^جزئیات/ }).first();
  const href = await detail.getAttribute("href");
  await detail.tap();
  await expect(page).toHaveURL(new RegExp(href + "$"));
  await expect(page.locator(".shipment-detail")).toBeVisible();
  await fits(page);

  await tabs(page).getByRole("button", { name: "بیشتر" }).tap();
  const dialog = page.getByRole("dialog", { name: "همه بخش‌های برنامه" });
  await expect(dialog).toBeVisible();
  await capture(page, "owner-menu-" + project);
  await dialog.getByRole("link", { name: "مرکز پشتیبانی" }).tap();
  await expect(dialog).toBeHidden();
  await page.locator(".ticket-item").first().tap();
  await expect(page.locator(".ticket-list")).toBeHidden();
  await expect(page.locator(".conversation")).toBeVisible();
  await page.getByRole("button", { name: "فهرست گفت‌وگوها" }).tap();
  await expect(page.locator(".ticket-list")).toBeVisible();

  await tabs(page).getByRole("link", { name: "محموله‌ها" }).tap();
  await expect(table).toBeVisible();
  await tabs(page).getByRole("button", { name: "بیشتر" }).tap();
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(dialog).toBeHidden();
  await expect(tabs(page)).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "منوی پنل" }),
  ).toBeVisible();
  await expect(table.locator("tbody tr").first()).toHaveCSS(
    "display",
    "table-row",
  );
}

async function checkDriverFlow(page: Page) {
  await tabs(page).getByRole("link", { name: "بازار بار" }).tap();
  await page
    .getByRole("link", { name: /^جزئیات/ })
    .first()
    .tap();
  await expect(page).toHaveURL(/\/driver\/market\/\d+$/);
  await expect(
    tabs(page).getByRole("link", { name: "بازار بار" }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "ثبت پیشنهاد کرایه" }).tap();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('input[name="amount"]')).toHaveCSS(
    "font-size",
    "16px",
  );
  const box = await sheet.boundingBox();
  expect(box!.y + box!.height).toBeCloseTo(page.viewportSize()!.height, 0);
  await sheet.getByRole("button", { name: "بستن", exact: true }).tap();
  await expect(sheet).toBeHidden();
  await page.getByRole("link", { name: "بازگشت به فهرست" }).tap();
  await expect(page).toHaveURL(/\/driver\/market$/);
  await tabs(page).getByRole("link", { name: "مدارک" }).tap();
  const documents = page.getByRole("button", { name: /مدارک$/ }).first();
  await documents.tap();
  await expect(documents).toHaveAttribute("aria-current", "step");
  await expect(page.locator(".credential-grid")).toBeVisible();
  await checkLocationConsent(page);
}

async function checkLocationConsent(page: Page) {
  await tabs(page).getByRole("link", { name: "سفرهای من" }).tap();
  const detail = page.getByRole("link", { name: /جزئیات AL-DEMO00001$/ });
  const path = (await detail.getAttribute("href"))!;
  await page.addInitScript(() => {
    let locationAttempts = 0;
    const fetchReal = window.fetch.bind(window);
    window.fetch = (input, options) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (
        /\/api\/shipments\/\d+\/location\/$/.test(path) &&
        options?.method === "POST"
      ) {
        locationAttempts++;
        return Promise.reject(
          new TypeError("Simulated location connection failure"),
        );
      }
      return fetchReal(input, options);
    };
    Object.defineProperty(window, "qaLocationAttempts", {
      get: () => locationAttempts,
    });
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition(callback: PositionCallback) {
          window.addEventListener("qa:location", () =>
            callback({
              coords: { latitude: 35.7, longitude: 51.4, accuracy: 10 },
              timestamp: Date.now(),
            } as GeolocationPosition),
          );
          return 1;
        },
        clearWatch() {},
      },
    });
  });
  await page.goto(new URL(path, page.url()).href);
  const start = page.getByRole("button", { name: "شروع اشتراک موقعیت سفر" });
  await start.tap();
  await page.getByRole("button", { name: "لغو درخواست موقعیت" }).tap();
  await expect(start).toBeVisible();
  await start.tap();
  await page.evaluate(() => window.dispatchEvent(new Event("qa:location")));
  await expect(page.getByText(/^ارسال موقعیت انجام نشد/)).toBeVisible();
  await page.getByRole("button", { name: "توقف اشتراک موقعیت" }).tap();
  const unexpected = page.waitForFunction(
    () => Reflect.get(window, "qaLocationAttempts") > 1,
    undefined,
    { timeout: 700 },
  );
  await page.evaluate(() => {
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("qa:location"));
  });
  await expect(unexpected).rejects.toThrow(/Timeout/);
}

async function checkOperatorFlow(page: Page) {
  await tabs(page).getByRole("link", { name: "اتاق کنترل" }).tap();
  await expect(
    page.getByRole("region", { name: "نقشه موقعیت ثبت‌شده رانندگان" }),
  ).toBeVisible();
  await tabs(page).getByRole("link", { name: "پیگیری‌ها" }).tap();
  await page.getByRole("button", { name: "سرنخ جدید" }).tap();
  const sheet = page.getByRole("dialog");
  await expect(sheet.locator("input").first()).toHaveCSS("font-size", "16px");
  await sheet.getByRole("button", { name: "بستن", exact: true }).tap();
  await expect(sheet).toBeHidden();
}

async function checkInspectorFlow(page: Page) {
  await tabs(page).getByRole("link", { name: "بازرسی" }).tap();
  await page
    .getByRole("link", { name: /^جزئیات/ })
    .first()
    .tap();
  await expect(page).toHaveURL(/\/inspector\/inspections\/\d+$/);
  await expect(page.locator(".shipment-detail")).toBeVisible();
  await page.getByRole("link", { name: "بازگشت به فهرست" }).tap();
  await expect(page).toHaveURL(/\/inspector\/inspections$/);
}

test("public mobile bar connects home, tracking and role entry", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "دسترسی سریع سایت" });
  await expect(nav.getByRole("link", { name: "خانه" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: "پیگیری بار" }).tap();
  await expect(page).toHaveURL(/\/tracking$/);
  await expect(nav.getByRole("link", { name: "پیگیری بار" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: "ورود به پنل‌ها" }).tap();
  await expect(page).toHaveURL(/\/apps$/);
  await expect(
    page
      .locator(
        `main a[href="${multiApp ? roleOrigin("driver") : ""}/driver/app"]`,
      )
      .first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(nav).toBeHidden();
});

test("each portal registers its own worker and shows an offline screen", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Service worker and offline lifecycle checked with Chromium",
  );
  for (const panel of ["driver", "owner", "inspector"]) {
    await page.goto(roleOrigin(panel) + `/${panel}/app`);
    await expect
      .poll(() =>
        page.evaluate(
          async () =>
            (await navigator.serviceWorker.getRegistration())?.active?.state,
        ),
      )
      .toBe("activated");
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistration())?.scope,
      ),
    ).toBe(roleOrigin(panel) + `/${panel}/`);
  }
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("h1")).toContainText(/اینترنت|اتصال/);
});

test("new driver saves identity, resumes the dossier and cannot open market", async ({
  page,
}, info) => {
  const suffix = Date.now().toString();
  const email = `driver-${suffix}@example.invalid`;
  await page.goto(roleOrigin("driver") + "/register?role=driver");
  await expect(
    page.getByRole("heading", { name: "ثبت‌نام راننده" }),
  ).toBeVisible();
  await capture(page, "driver-signup-" + info.project.name);
  for (const [name, value] of Object.entries({
    first_name: "راننده آزمایشی",
    last_name: "ثبت‌نام موبایل",
    phone: "0935" + suffix.slice(-7),
    email,
    username: "mobile-driver-" + suffix,
    password: "MobileDriver!QACase2026",
    password_confirmation: "MobileDriver!QACase2026",
  })) {
    await page.locator(`[name="${name}"]`).fill(value);
  }
  await page.getByRole("button", { name: "ساخت حساب و تکمیل پرونده" }).tap();
  await expect(page).toHaveURL(/\/driver\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "اطلاعات هویتی و اعتبار مدارک" }),
  ).toBeVisible();
  await capture(page, "driver-new-dossier-" + info.project.name);
  await expect(tabs(page).getByRole("link", { name: "بازار بار" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /خودرو$/ })).toBeDisabled();
  const account = await page.evaluate(async () =>
    (await fetch("/api/auth/me/")).json(),
  );
  expect(account).toMatchObject({ email, driver_market_enabled: false });
  const idBase = suffix.slice(-9);
  const checksum =
    [...idBase].reduce(
      (total, digit, index) => total + Number(digit) * (10 - index),
      0,
    ) % 11;
  await page
    .locator('[name="national_id"]')
    .fill(idBase + (checksum < 2 ? checksum : 11 - checksum));
  const future = new Date(Date.now() + 365 * 86400000);
  for (const [label, value] of [
    ["تاریخ تولد", new Date("1990-01-01T12:00:00Z")],
    ["اعتبار گواهینامه", future],
    ["اعتبار بیمه‌نامه", future],
  ] as const) {
    const { year, month, day } = persianParts(value);
    await page
      .getByLabel(label + " سال", { exact: true })
      .selectOption(String(year));
    await page
      .getByLabel(label + " ماه", { exact: true })
      .selectOption(String(month));
    await page
      .getByLabel(label + " روز", { exact: true })
      .selectOption(String(day));
  }
  await page.locator('[name="emergency_name"]').fill("مخاطب آزمایشی");
  await page.locator('[name="emergency_phone"]').fill("09120000008");
  await page
    .locator('[name="address"]')
    .fill("نشانی ساختگی برای آزمون ثبت‌نام");
  await page.getByRole("button", { name: "ذخیره و ادامه" }).tap();
  await expect(page.getByRole("heading", { name: "خودروی شما" })).toBeVisible();
  await page.goto(roleOrigin("driver") + "/driver/market");
  await expect(page).toHaveURL(/\/driver\/onboarding$/);
  await expect(page.getByRole("heading", { name: "خودروی شما" })).toBeVisible();
});
