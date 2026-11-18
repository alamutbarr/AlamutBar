import type { Shipment } from "./api";
export type Invoice = {
  paid_total: number;
  balance: number;
  payments: {
    id: number;
    amount: number;
    reference: string;
    created_at: string;
  }[];
  id: number;
  shipment: number;
  code: string;
  route: string;
  amount: number;
  status: string;
  reference: string;
  paid_at: string;
};
export type Ticket = {
  id: number;
  subject: string;
  priority: string;
  status: string;
  user_name: string;
  created_at: string;
  messages: {
    id: number;
    author_name: string;
    role: string;
    body: string;
    created_at: string;
  }[];
};
export type Notice = {
  id: number;
  title: string;
  body?: string;
  kind?: string;
  shipment: number | null;
  read: boolean;
  created_at: string;
};
export type Dash = {
  total: number;
  active: number;
  delivered: number;
  pending: number;
  revenue: number;
  unpaid: number;
  by_status: { status: string; count: number }[];
  recent: Shipment[];
  notifications: number;
  open_tickets: number;
  support_phone?: string;
  driver?: {
    offered: number;
    active: number;
    completed: number;
    rating: number | null;
    mission_count: number;
    joined: string;
    rejected_documents: { label: string; note: string; kind: string }[];
    support_phone: string;
  } | null;
};
export type Ops = {
  audit: {
    id: number;
    action: string;
    object_id: string;
    created_at: string;
    actor__first_name: string;
  }[];
  contacts: {
    id: number;
    name: string;
    phone: string;
    message: string;
    created_at: string;
  }[];
};
export type Vehicle = {
  kind: string;
  plate: string;
  capacity: number;
  license_number: string;
  available: boolean;
  tractor_type?: string;
  trailer_type?: string;
  smart_card_number?: string;
  specs?: Record<string, string>;
};
export type ModalState = { kind: string; data?: Invoice | Shipment };
export type Mutate = (
  path: string,
  data: unknown,
  success?: string,
) => Promise<unknown>;
