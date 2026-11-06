const PREFIX = "owner-shipment-draft:";

export function shipmentDraftKey(userId) {
  return `${PREFIX}${userId}`;
}

export function hasShipmentDraftContent(formData = {}) {
  return Boolean(
    formData.origin_city_id
    || String(formData.origin_address || "").trim()
    || formData.dest_city_id
    || formData.cargo_type
    || formData.weight_kg
    || formData.cargo_value
    || (Array.isArray(formData.photo_urls) && formData.photo_urls.length)
    || String(formData.notes || "").trim()
    || formData.loading_date
    || formData.vehicle_type_id
    || (Array.isArray(formData.vehicle_variants) && formData.vehicle_variants.length)
    || String(formData.receiver_name || "").trim()
    || String(formData.receiver_phone || "").trim(),
  );
}

export function saveShipmentDraft(userId, payload) {
  if (!userId || typeof localStorage === "undefined") return;
  const formData = { ...(payload.formData || {}) };
  delete formData.trackingCode;
  delete formData.needsManualReview;
  if (!hasShipmentDraftContent(formData)) {
    clearShipmentDraft(userId);
    return;
  }
  localStorage.setItem(shipmentDraftKey(userId), JSON.stringify({
    formData,
    currentStep: payload.currentStep,
    maxStepReached: payload.maxStepReached,
    savedAt: Date.now(),
  }));
}

export function loadShipmentDraft(userId) {
  if (!userId || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(shipmentDraftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.formData) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearShipmentDraft(userId) {
  if (!userId || typeof localStorage === "undefined") return;
  localStorage.removeItem(shipmentDraftKey(userId));
}
