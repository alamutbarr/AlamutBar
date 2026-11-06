export type Mission = {
  id: number;
  trackingCode: string;
  status: string;
  workflowStatus: string | null;
  mine: boolean;
  origin: { city?: string; province?: string; zone?: string; address?: string };
  destination: {
    city?: string;
    province?: string;
    zone?: string;
    address?: string;
    exactVisible: boolean;
  };
  cargo: { type?: string; weightKg: number | null; value: number | null; packaging?: string };
  loadingDate: string | null;
  loadingWindow: { from?: string | null; to?: string | null };
  vehicle?: string;
  price: number | null;
  waybillNumber?: string;
  deliveryOtpRequired: boolean;
};

export type DocItem = { key: string; title: string; url: string; status: string; note?: string };

export type DriverProfile = {
  id: number;
  fullName: string;
  phone: string;
  verificationStatus: string;
  availability: string;
  plate: string | null;
  tractorType: string | null;
  trailerType: string | null;
  documents: { personal: DocItem[]; vehicle: DocItem[]; insurance: DocItem[] };
  push: { registered: boolean; stub: boolean };
};

export const STATUS_LABEL: Record<string, string> = {
  Offered: 'پیشنهاد',
  Accepted: 'پذیرفته شد',
  EnRouteToPickup: 'به سمت بارگیری',
  ArrivedPickup: 'در محل بارگیری',
  WaybillIssued: 'بارنامه',
  InTransit: 'در حال حمل',
  NearDestination: 'در مقصد',
  Completed: 'تحویل شد',
  Cancelled: 'لغو',
};

export const FLOW = [
  'Accepted',
  'EnRouteToPickup',
  'ArrivedPickup',
  'WaybillIssued',
  'InTransit',
  'NearDestination',
  'Completed',
] as const;

export function nextStatus(current: string): (typeof FLOW)[number] | null {
  const index = FLOW.indexOf(current as (typeof FLOW)[number]);
  if (index < 0 || index >= FLOW.length - 1) return null;
  return FLOW[index + 1];
}
