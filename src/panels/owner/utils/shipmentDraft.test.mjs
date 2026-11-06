import test from "node:test";
import assert from "node:assert/strict";
import { hasShipmentDraftContent, saveShipmentDraft, loadShipmentDraft, clearShipmentDraft } from "./shipmentDraft.js";

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};

test("empty shipment forms are not kept as a draft", () => {
  assert.equal(hasShipmentDraftContent({}), false);
  saveShipmentDraft(9, { formData: {}, currentStep: 2, maxStepReached: 2 });
  assert.equal(loadShipmentDraft(9), null);
});

test("a mid-wizard shipment comes back after refresh", () => {
  saveShipmentDraft(3, {
    formData: { origin_city_name: "تهران", origin_city_id: 1, photo_urls: ["/uploads/a.jpg"] },
    currentStep: 5,
    maxStepReached: 5,
  });
  const draft = loadShipmentDraft(3);
  assert.equal(draft.currentStep, 5);
  assert.deepEqual(draft.formData.photo_urls, ["/uploads/a.jpg"]);
  clearShipmentDraft(3);
  assert.equal(loadShipmentDraft(3), null);
});
