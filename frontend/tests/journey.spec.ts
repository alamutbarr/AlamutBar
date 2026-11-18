import {
  test,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";
import { apiTarget, roleOrigin, siteOrigin as baseURL } from "./targets";
const originByContext = new WeakMap<APIRequestContext, string>();
const contexts: APIRequestContext[] = [];
let owner: APIRequestContext,
  driver: APIRequestContext,
  operator: APIRequestContext,
  inspector: APIRequestContext,
  outsider: APIRequestContext;
let shipmentId: number,
  driverId: number,
  inspectorId: number,
  invoiceId: number,
  ticketId: number;
const unique = Date.now().toString();
async function context(role = "owner") {
  const origin = roleOrigin(role);
  const c = await request.newContext(apiTarget(role));
  originByContext.set(c, origin);
  contexts.push(c);
  return c;
}
async function mutate(
  c: APIRequestContext,
  path: string,
  data: unknown,
  method = "POST",
) {
  const token = await (await c.get("/api/auth/csrf/")).json();
  return c.fetch("/api/" + path, {
    method,
    data,
    headers: {
      "X-CSRFToken": token.csrfToken,
      Origin: originByContext.get(c)!,
    },
  });
}
async function register(role: "owner" | "driver", suffix: number) {
  const c = await context(role);
  const r = await mutate(c, "auth/register/", {
    username: "e2e-" + role + "-" + unique + "-" + suffix,
    password: "E2E_Strong!2026",
    phone:
      "0912" +
      String((Number(unique.slice(-7)) + suffix) % 10000000).padStart(7, "0"),
    first_name: "آزمایش",
    last_name: "یکپارچه",
    role,
  });
  expect(r.status(), await r.text()).toBe(201);
  return c;
}
async function login(role: string) {
  const c = await context(role);
  const r = await mutate(c, "auth/login/", {
    username: role + ".demo",
    password: "AlamutDemo!2026",
    role,
  });
  expect(r.status(), await r.text()).toBe(200);
  return c;
}
test.describe
  .serial("React portals → Django → MySQL freight journey (HTTP, no browser)", () => {
  test.beforeAll(async () => {
    owner = await register("owner", 1);
    driver = await register("driver", 2);
    outsider = await register("owner", 3);
    operator = await login("operator");
    inspector = await login("inspector");
    driverId = (await (await driver.get("/api/auth/me/")).json()).id;
    inspectorId = (await (await inspector.get("/api/auth/me/")).json()).id;
  });
  test.afterAll(async () => {
    await Promise.all(contexts.map((c) => c.dispose()));
  });
  test("public pages, health and CSRF session boundary", async () => {
    const c = await context();
    expect((await c.get("/")).status()).toBe(200);
    const health = await (await c.get("/api/health/")).json();
    expect(health.database).toBe("mysql");
    expect((await c.get("/api/shipments/")).status()).toBe(403);
    expect(
      (
        await c.post("/api/auth/login/", {
          data: { username: "owner.demo", password: "AlamutDemo!2026" },
        })
      ).status(),
    ).toBe(403);
  });
  test("owner request, search and ownership privacy", async () => {
    const pickup = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const r = await mutate(owner, "shipments/", {
      title: "آزمایش یکپارچه " + unique,
      origin: "قزوین",
      destination: "رشت",
      origin_address: "نشانی آزمایشی مبدأ",
      destination_address: "نشانی آزمایشی مقصد",
      recipient_name: "گیرنده آزمایشی",
      recipient_phone: "09120000008",
      weight: "5.00",
      vehicle_type: "truck",
      cargo_value: 50000000,
      price: 7000000,
      pickup_date: pickup,
      notes: "E2E record; fictional data",
    });
    expect(r.status(), await r.text()).toBe(201);
    const s = await r.json();
    shipmentId = s.id;
    expect(s.status).toBe("pending");
    expect(
      (await outsider.get("/api/shipments/" + shipmentId + "/")).status(),
    ).toBe(404);
    const list = await (
      await owner.get("/api/shipments/?q=" + encodeURIComponent(unique))
    ).json();
    expect(list.count).toBe(1);
    expect(
      (
        await mutate(owner, "shipments/" + shipmentId + "/transition/", {
          status: "approved",
        })
      ).status(),
    ).toBe(403);
  });
  test("approval, verified vehicle, offer and assignment", async () => {
    expect(
      (
        await mutate(operator, "shipments/" + shipmentId + "/transition/", {
          status: "approved",
        })
      ).status(),
    ).toBe(200);
    const shipmentPath = "/api/shipments/" + shipmentId + "/";
    expect((await driver.get(shipmentPath)).status()).toBe(404);
    expect(await (await driver.get("/api/auth/me/")).json()).toMatchObject({
      driver_market_enabled: false,
    });
    expect(await (await driver.get("/api/onboarding/")).json()).toMatchObject({
      profile: { status: "draft" },
    });
    expect(
      (
        await mutate(
          driver,
          "vehicle/",
          {
            kind: "truck",
            plate: "E2E-" + unique,
            capacity: "12",
            license_number: "E2E-LICENSE-" + unique,
            available: true,
          },
          "PUT",
        )
      ).status(),
    ).toBe(200);
    expect(
      (
        await mutate(driver, "shipments/" + shipmentId + "/offer/", {
          amount: 6500000,
        })
      ).status(),
    ).toBe(403);
    const nationalBase = unique.slice(-9).padStart(9, "0");
    const remainder =
      [...nationalBase].reduce((n, c, i) => n + Number(c) * (10 - i), 0) % 11;
    const nationalId =
      nationalBase + String(remainder < 2 ? remainder : 11 - remainder);
    expect(
      (
        await mutate(
          driver,
          "onboarding/",
          {
            national_id: nationalId,
            birth_date: "1990-01-01",
            license_expiry: new Date(Date.now() + 365 * 86400000)
              .toISOString()
              .slice(0, 10),
            insurance_expiry: new Date(Date.now() + 365 * 86400000)
              .toISOString()
              .slice(0, 10),
            emergency_name: "E2E emergency",
            emergency_phone: "09120000008",
            address: "Fictional onboarding address",
          },
          "PATCH",
        )
      ).status(),
    ).toBe(200);
    for (const kind of [
      "national_card",
      "license",
      "vehicle_card",
      "insurance",
    ]) {
      const atSizeLimit = kind === "license";
      const file = atSizeLimit
        ? Buffer.alloc(10 * 1024 * 1024, " ")
        : Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVR4nGP8//8/AwMDEwMYAAAkBgMBXaJOiAAAAABJRU5ErkJggg==",
            "base64",
          );
      if (atSizeLimit) {
        file.write("%PDF-1.4\n%");
        file.write("\n%%EOF\n", file.length - 7);
      }
      const csrf = await (await driver.get("/api/auth/csrf/")).json();
      const upload = await driver.post("/api/onboarding/documents/", {
        headers: {
          "X-CSRFToken": csrf.csrfToken,
          Origin: originByContext.get(driver)!,
        },
        multipart: {
          kind,
          file: {
            name: atSizeLimit ? "e2e-max-size.pdf" : "e2e-sample.png",
            mimeType: atSizeLimit ? "application/pdf" : "image/png",
            buffer: file,
          },
        },
      });
      expect(upload.status(), await upload.text()).toBe(201);
      if (atSizeLimit) {
        const { url } = await upload.json();
        const downloaded = await driver.get(url);
        expect(downloaded.status()).toBe(200);
        expect((await downloaded.body()).equals(file)).toBeTruthy();
        expect((await outsider.get(url)).status()).toBe(403);
      }
    }
    expect((await mutate(driver, "onboarding/submit/", {})).status()).toBe(200);
    expect((await driver.get(shipmentPath)).status()).toBe(404);
    const dossier = await (
      await operator.get("/api/drivers/" + driverId + "/profile/")
    ).json();
    const reviewed = await mutate(
      operator,
      "drivers/" + driverId + "/review/",
      {
        status: "approved",
        documents: dossier.documents.map((d: { id: number }) => ({
          id: d.id,
          status: "approved",
        })),
      },
    );
    expect(reviewed.status(), await reviewed.text()).toBe(200);
    expect(await (await driver.get("/api/auth/me/")).json()).toMatchObject({
      driver_market_enabled: true,
    });
    const visible = await driver.get(shipmentPath);
    expect(visible.status()).toBe(200);
    const market = await visible.json();
    expect(market).not.toHaveProperty("recipient_phone");
    expect(market).not.toHaveProperty("locations");
    expect(
      (
        await mutate(operator, "team/" + driverId + "/verify/", {
          verified: true,
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await mutate(driver, "shipments/" + shipmentId + "/offer/", {
          amount: 6500000,
          note: "آماده بارگیری",
        })
      ).status(),
    ).toBe(201);
    const r = await mutate(operator, "shipments/" + shipmentId + "/assign/", {
      driver: driverId,
      inspector: inspectorId,
    });
    expect(r.status(), await r.text()).toBe(200);
    expect((await r.json()).price).toBe(6500000);
  });
  test("loading inspection, GPS ping, delivery and final invoice", async () => {
    const path = "shipments/" + shipmentId + "/";
    expect(
      (
        await mutate(driver, path + "transition/", { status: "loading" })
      ).status(),
    ).toBe(200);
    expect(
      (
        await mutate(driver, path + "transition/", { status: "in_transit" })
      ).status(),
    ).toBe(400);
    const inspection = {
      stage: "loading",
      seal_number: "E2E-SEAL",
      packaging_ok: true,
      weight_ok: true,
      vehicle_ok: true,
    };
    expect(
      (await mutate(inspector, path + "inspect/", inspection)).status(),
    ).toBe(201);
    expect(
      (
        await mutate(driver, path + "transition/", { status: "in_transit" })
      ).status(),
    ).toBe(200);
    expect(
      (
        await mutate(driver, path + "location/", {
          latitude: "36.268000",
          longitude: "50.004000",
          accuracy: 15,
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await mutate(owner, path + "location/", {
          latitude: "36.268000",
          longitude: "50.004000",
        })
      ).status(),
    ).toBe(403);
    const current = await (await owner.get("/api/" + path)).json();
    expect(current.locations).toHaveLength(1);
    expect(
      (
        await mutate(driver, path + "transition/", { status: "delivered" })
      ).status(),
    ).toBe(200);
    expect(
      (
        await mutate(owner, path + "transition/", { status: "completed" })
      ).status(),
    ).toBe(400);
    expect(
      (
        await mutate(inspector, path + "inspect/", {
          ...inspection,
          stage: "delivery",
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await mutate(owner, path + "transition/", { status: "completed" })
      ).status(),
    ).toBe(200);
    const invoices = await (await owner.get("/api/invoices/")).json();
    const invoice = invoices.results.find(
      (i: { shipment: number }) => i.shipment === shipmentId,
    );
    expect(invoice.amount).toBe(6500000);
    invoiceId = invoice.id;
  });
  test("manual settlement idempotency and role boundary", async () => {
    const path = "invoices/" + invoiceId + "/settle/";
    expect(
      (await mutate(owner, path, { reference: "E2E-BANK-" + unique })).status(),
    ).toBe(403);
    expect(
      (
        await mutate(operator, path, { reference: "E2E-BANK-" + unique })
      ).status(),
    ).toBe(200);
    expect(
      (
        await mutate(operator, path, { reference: "E2E-BANK-" + unique })
      ).status(),
    ).toBe(400);
    const s = await (await owner.get("/api/dashboard/")).json();
    expect(s.revenue).toBe(6500000);
    const hidden = await (await inspector.get("/api/invoices/")).json();
    expect(hidden.count).toBe(0);
  });
  test("support conversation, CSV export and scoped notifications", async () => {
    const r = await mutate(owner, "tickets/", {
      subject: "آزمایش پشتیبانی " + unique,
      body: "پیام آزمایشی",
      priority: "normal",
    });
    expect(r.status()).toBe(201);
    ticketId = (await r.json()).id;
    expect(
      (await outsider.get("/api/tickets/" + ticketId + "/")).status(),
    ).toBe(404);
    expect(
      (
        await mutate(operator, "tickets/" + ticketId + "/reply/", {
          body: "پاسخ آزمایشی عملیات",
        })
      ).status(),
    ).toBe(200);
    const t = await (await owner.get("/api/tickets/" + ticketId + "/")).json();
    expect(t.messages).toHaveLength(2);
    expect(
      (await mutate(owner, "tickets/" + ticketId + "/close/", {})).status(),
    ).toBe(200);
    expect(
      (
        await mutate(owner, "tickets/" + ticketId + "/reply/", {
          body: "نباید ثبت شود",
        })
      ).status(),
    ).toBe(400);
    const csv = await owner.get("/api/shipments/export/");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain(unique);
    expect((await mutate(owner, "notifications/read_all/", {})).status()).toBe(
      200,
    );
    expect(
      (await (await owner.get("/api/dashboard/")).json()).notifications,
    ).toBe(0);
  });
});
