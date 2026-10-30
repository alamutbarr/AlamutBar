import test from "node:test";
import assert from "node:assert/strict";
import { notificationPath } from "./notificationPath.js";

test("shipment notices open the matching load in my shipments", () => {
  assert.equal(
    notificationPath({ title: "درخواست بار ثبت شد", shipment_id: 41 }),
    "/owner/shipments/41",
  );
  assert.equal(
    notificationPath({ title: "قیمت پیشنهادی آماده است", shipment_id: 7 }),
    "/owner/shipments/7",
  );
});

test("identity notices open profile and shipment-less items open my shipments", () => {
  assert.equal(notificationPath({ title: "مدرک هویت رد شد" }), "/owner/profile");
  assert.equal(notificationPath({ title: "یادآوری بارگیری" }), "/owner/shipments");
});
