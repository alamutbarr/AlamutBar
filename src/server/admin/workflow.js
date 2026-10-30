const MAIN_FLOW = [
  'REQUEST_REGISTERED',
  'UNDER_REVIEW',
  'PRICE_ESTIMATED',
  'CUSTOMER_CONFIRMED',
  'DRIVER_ASSIGNMENT',
  'DRIVER_ACCEPTED',
  'EN_ROUTE_TO_LOADING',
  'AT_LOADING_INSPECTION',
  'WAYBILL_ISSUED',
  'IN_TRANSIT',
  'AT_DESTINATION_UNLOADING',
  'COMPLETED',
];

const SIDE_FLOW = ['CANCELLED', 'DRIVER_REPLACED', 'ON_HOLD'];

const WORKFLOW_STATUSES = [...MAIN_FLOW, ...SIDE_FLOW];

const WORKFLOW_LABELS = {
  REQUEST_REGISTERED: 'ثبت درخواست',
  UNDER_REVIEW: 'بررسی و تطبیق',
  PRICE_ESTIMATED: 'قیمت اولیه',
  CUSTOMER_CONFIRMED: 'تأیید صاحب کالا',
  DRIVER_ASSIGNMENT: 'تأمین راننده',
  DRIVER_ACCEPTED: 'قبول مأموریت',
  EN_ROUTE_TO_LOADING: 'حرکت به بارگیری',
  AT_LOADING_INSPECTION: 'حضور و بازرسی',
  WAYBILL_ISSUED: 'صدور بارنامه',
  IN_TRANSIT: 'حمل و پیگیری',
  AT_DESTINATION_UNLOADING: 'رسیدن و تخلیه',
  COMPLETED: 'تکمیل مأموریت',
  CANCELLED: 'لغو شده',
  DRIVER_REPLACED: 'راننده جایگزین',
  ON_HOLD: 'متوقف',
};

const ACTIVE_TRIP = [
  'EN_ROUTE_TO_LOADING',
  'AT_LOADING_INSPECTION',
  'WAYBILL_ISSUED',
  'IN_TRANSIT',
  'AT_DESTINATION_UNLOADING',
];

const PRE_DEPARTURE = [
  'CUSTOMER_CONFIRMED',
  'DRIVER_ASSIGNMENT',
  'DRIVER_ACCEPTED',
  'EN_ROUTE_TO_LOADING',
];

function isKnownStatus(status) {
  return WORKFLOW_STATUSES.includes(status);
}

function deriveWorkflow(shipment) {
  if (!shipment) return 'REQUEST_REGISTERED';
  if (shipment.workflow_status && isKnownStatus(shipment.workflow_status)) {
    return shipment.workflow_status;
  }
  if (shipment.on_hold) return 'ON_HOLD';
  const driverStatus = shipment.driver_status;
  if (driverStatus === 'EnRouteToPickup') return 'EN_ROUTE_TO_LOADING';
  if (driverStatus === 'WaybillIssued') return 'WAYBILL_ISSUED';
  if (driverStatus === 'NearDestination') return 'AT_DESTINATION_UNLOADING';
  const map = {
    pending_review: 'REQUEST_REGISTERED',
    rejected: 'CANCELLED',
    price_proposed: 'PRICE_ESTIMATED',
    searching_driver: 'DRIVER_ASSIGNMENT',
    driver_assigned: 'DRIVER_ACCEPTED',
    at_pickup: 'AT_LOADING_INSPECTION',
    in_transit: 'IN_TRANSIT',
    delivered: 'AT_DESTINATION_UNLOADING',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
  };
  return map[shipment.status] || 'REQUEST_REGISTERED';
}

function legacyPatch(workflow) {
  switch (workflow) {
    case 'REQUEST_REGISTERED':
    case 'UNDER_REVIEW':
      return { status: 'pending_review', driver_status: null };
    case 'PRICE_ESTIMATED':
      return { status: 'price_proposed', driver_status: null, price_status: 'proposed' };
    case 'CUSTOMER_CONFIRMED':
    case 'DRIVER_ASSIGNMENT':
    case 'DRIVER_REPLACED':
      return { status: 'searching_driver', driver_status: null };
    case 'DRIVER_ACCEPTED':
      return { status: 'driver_assigned', driver_status: 'Accepted' };
    case 'EN_ROUTE_TO_LOADING':
      return { status: 'driver_assigned', driver_status: 'EnRouteToPickup' };
    case 'AT_LOADING_INSPECTION':
      return { status: 'at_pickup', driver_status: 'ArrivedPickup' };
    case 'WAYBILL_ISSUED':
      return { status: 'at_pickup', driver_status: 'WaybillIssued' };
    case 'IN_TRANSIT':
      return { status: 'in_transit', driver_status: 'InTransit' };
    case 'AT_DESTINATION_UNLOADING':
      return { status: 'in_transit', driver_status: 'NearDestination' };
    case 'COMPLETED':
      return { status: 'completed', driver_status: 'Completed' };
    case 'CANCELLED':
      return { status: 'cancelled', driver_status: 'Cancelled' };
    case 'ON_HOLD':
      return { status: null, driver_status: null };
    default:
      return null;
  }
}

module.exports = {
  MAIN_FLOW,
  SIDE_FLOW,
  WORKFLOW_STATUSES,
  WORKFLOW_LABELS,
  ACTIVE_TRIP,
  PRE_DEPARTURE,
  isKnownStatus,
  deriveWorkflow,
  legacyPatch,
};
