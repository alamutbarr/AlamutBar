const { jsonList, photoList } = require('../utils/jsonList');

const UPCOMING = ['DRIVER_ACCEPTED', 'EN_ROUTE_TO_LOADING', 'AT_LOADING_INSPECTION', 'ON_HOLD'];
const LATE = ['WAYBILL_ISSUED', 'IN_TRANSIT', 'AT_DESTINATION_UNLOADING'];
const CLOSED = ['CANCELLED', 'COMPLETED', 'DRIVER_REPLACED'];

const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

const ITEM_LABELS = {
  seal_photo: 'عکس پلمب',
  lashing_photo: 'عکس مهار',
  weight_empty: 'وزن خالی باسکول',
  weight_full: 'وزن پر باسکول',
  cargo_value: 'ارزش دقیق کالا برای بیمه',
};

const PAYER_LABELS = {
  alamut: 'هماهنگی اعزام با الموت است و در این نسخه صورتحساب جدا ساخته نمی‌شود.',
  cargo_owner: 'هماهنگی اعزام بر عهده صاحب کالا ثبت شده است. تسویه در این نسخه انجام نمی‌شود.',
  carrier: 'هماهنگی اعزام بر عهده شرکت حمل ثبت شده است. تسویه در این نسخه انجام نمی‌شود.',
};

const DEFAULT_CHECKLIST = [
  { key: 'vehicle_present', label: 'خودرو در محل بارگیری حاضر است' },
  { key: 'vehicle_match', label: 'خودرو با مأموریت می‌خواند' },
  { key: 'cargo_identity', label: 'هویت محموله با درخواست یکی است' },
  { key: 'cargo_info', label: 'اطلاعات ثبت‌شده بار درست است' },
  { key: 'seal', label: 'پلمب سالم است' },
  { key: 'lashing', label: 'مهار بار درست است' },
];

const DEFAULT_REQUIRED = ['seal_photo', 'lashing_photo', 'weight_empty', 'weight_full', 'cargo_value'];

function needsInspector(shipment, settings = {}) {
  const mode = settings.inspector_required_mode || 'flagged_or_value';
  if (shipment.assignedInspectorId || shipment.assigned_inspector_id) return true;
  if (mode === 'assigned_only') return false;
  if (mode === 'all') return true;
  if (shipment.requiresInspector || shipment.requires_inspector) return true;
  const threshold = Number(settings.sensitive_cargo_value || 0);
  const value = Number(shipment.cargoValue ?? shipment.cargo_value ?? 0);
  return threshold > 0 && value >= threshold;
}

function checklistTemplate(settings = {}) {
  const raw = settings.inspector_checklist;
  if (Array.isArray(raw) && raw.length && raw.every((item) => item && item.key && item.label)) return raw;
  return DEFAULT_CHECKLIST;
}

function requiredItems(settings = {}) {
  const raw = settings.inspector_required_items;
  const list = Array.isArray(raw) ? raw : String(raw || '').split(',');
  const items = list.map((item) => String(item).trim()).filter((item) => ITEM_LABELS[item]);
  return items.length ? items : DEFAULT_REQUIRED;
}

function mergeChecklist(template, saved = []) {
  const byKey = new Map(jsonList(saved).map((item) => [item.key, item]));
  return template.map((item) => ({
    key: item.key,
    label: item.label,
    checked: Boolean(byKey.get(item.key)?.checked),
    note: byKey.get(item.key)?.note || '',
  }));
}

function buildDiscrepancies({
  declaredWeight,
  actualNet,
  weightToleranceKg = 200,
  declaredValue,
  actualValue,
  valueRatio = 0.05,
  declaredCargo,
  actualCargo,
  declaredVehicle,
  actualVehicle,
  checklist = [],
  manual = [],
}) {
  const autoFields = new Set(['weight', 'cargo_value', 'cargo_type', 'vehicle']);
  const kept = (manual || []).filter((item) => item && item.field && !autoFields.has(item.field) && !String(item.field).startsWith('checklist:'));
  const auto = [];
  if (declaredWeight != null && actualNet != null && Math.abs(Number(actualNet) - Number(declaredWeight)) > Number(weightToleranceKg)) {
    auto.push({
      field: 'weight',
      expected: String(declaredWeight),
      actual: String(actualNet),
      note: 'وزن خالص با وزن اعلام‌شده نمی‌خواند.',
    });
  }
  if (declaredValue != null && actualValue != null && Number(declaredValue) > 0) {
    const gap = Math.abs(Number(actualValue) - Number(declaredValue)) / Number(declaredValue);
    if (gap > Number(valueRatio)) {
      auto.push({
        field: 'cargo_value',
        expected: String(declaredValue),
        actual: String(actualValue),
        note: 'ارزش دقیق با ارزش اعلام‌شده اختلاف دارد.',
      });
    }
  }
  if (actualCargo && declaredCargo && String(actualCargo).trim() !== String(declaredCargo).trim()) {
    auto.push({
      field: 'cargo_type',
      expected: String(declaredCargo),
      actual: String(actualCargo),
      note: 'نوع بار با درخواست یکی نیست.',
    });
  }
  if (actualVehicle && declaredVehicle && String(actualVehicle).trim() !== String(declaredVehicle).trim()) {
    auto.push({
      field: 'vehicle',
      expected: String(declaredVehicle),
      actual: String(actualVehicle),
      note: 'خودرو با ناوگان اعلام‌شده نمی‌خواند.',
    });
  }
  for (const item of checklist) {
    if (item.checked) continue;
    auto.push({
      field: `checklist:${item.key}`,
      expected: item.label,
      actual: 'خیر',
      note: item.note || 'این مورد در محل تأیید نشد.',
    });
  }
  return [...kept, ...auto];
}

function photoKindFor(item) {
  if (item === 'seal_photo') return 'seal';
  if (item === 'lashing_photo') return 'lashing';
  return null;
}

function completeness({ required, photos = [], weightEmpty, weightFull, cargoValue }) {
  const kinds = new Set(photoList(photos).map((photo) => photo.kind));
  const missing = [];
  for (const item of required) {
    const kind = photoKindFor(item);
    if (kind && !kinds.has(kind)) missing.push({ key: item, label: ITEM_LABELS[item] });
    if (item === 'weight_empty' && !(Number(weightEmpty) >= 0 && weightEmpty != null && weightEmpty !== '')) {
      missing.push({ key: item, label: ITEM_LABELS[item] });
    }
    if (item === 'weight_full' && !(Number(weightFull) > 0)) missing.push({ key: item, label: ITEM_LABELS[item] });
    if (item === 'cargo_value' && !(Number(cargoValue) > 0)) missing.push({ key: item, label: ITEM_LABELS[item] });
  }
  return { complete: missing.length === 0, missing };
}

function missionVisible({ workflowStatus, assignedInspectorId, inspectorId, needs }) {
  if (!needs || CLOSED.includes(workflowStatus)) return false;
  if (assignedInspectorId && String(assignedInspectorId) !== String(inspectorId)) return false;
  if (UPCOMING.includes(workflowStatus)) return true;
  if (assignedInspectorId && String(assignedInspectorId) === String(inspectorId)) return true;
  if (!assignedInspectorId && LATE.includes(workflowStatus)) return true;
  return false;
}

function visitDeadline(loadingDate, loadingTimeTo, graceMinutes = 30) {
  if (!loadingDate || !loadingTimeTo) return null;
  const date = loadingDate instanceof Date ? loadingDate.toISOString().slice(0, 10) : String(loadingDate).slice(0, 10);
  const [hour, minute] = String(loadingTimeTo).split(':').map((part) => Number(part));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const tehranUtc = Date.UTC(year, month - 1, day, hour, minute) - TEHRAN_OFFSET_MS;
  return new Date(tehranUtc + Number(graceMinutes || 0) * 60 * 1000);
}

function reportCountsAsVisit(report) {
  if (!report) return false;
  const photos = photoList(report.photos);
  const checklist = jsonList(report.checklist);
  return photos.length > 0
    || checklist.some((item) => item.checked)
    || report.weightEmpty != null
    || report.weightFull != null
    || report.cargoValue != null;
}

function inspectorNoShow({ needs, workflowStatus, loadingDate, loadingTimeTo, graceMinutes, report, now = new Date() }) {
  if (!needs || !UPCOMING.includes(workflowStatus)) return null;
  if (workflowStatus === 'ON_HOLD') return null;
  if (reportCountsAsVisit(report)) return null;
  const deadline = visitDeadline(loadingDate, loadingTimeTo, graceMinutes);
  if (!deadline || now < deadline) return null;
  return {
    type: 'INSPECTOR_ABSENT',
    severity: 'warning',
    message: 'متصدی تا پایان مهلت در محل حاضر نشده است. بازرسی حذف نمی‌شود و اپراتور باید پیگیری کند.',
  };
}

function approvalDecision({ finalApproval, complete, discrepancies }) {
  if (finalApproval === 'inspector' && complete && discrepancies.length === 0) return 'APPROVED';
  return 'PENDING';
}

module.exports = {
  UPCOMING,
  ITEM_LABELS,
  PAYER_LABELS,
  DEFAULT_CHECKLIST,
  DEFAULT_REQUIRED,
  needsInspector,
  checklistTemplate,
  requiredItems,
  mergeChecklist,
  buildDiscrepancies,
  completeness,
  missionVisible,
  visitDeadline,
  reportCountsAsVisit,
  inspectorNoShow,
  approvalDecision,
};
