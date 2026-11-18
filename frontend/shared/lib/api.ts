export type Role = "owner" | "driver" | "operator" | "inspector";
export type User = {
  id: number;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  company: string;
  national_id: string;
  postal_code: string;
  role: Role;
  verified: boolean;
  driver_market_enabled: boolean;
  capabilities: string[];
  avatar_url?: string;
  kyc_status?: string;
  vehicle?: {
    kind: string;
    plate: string;
    capacity: string;
    available: boolean;
  } | null;
};
export type Shipment = {
  id: number;
  code: string;
  title: string;
  origin: string;
  destination: string;
  origin_address: string;
  destination_address: string;
  recipient_name: string;
  recipient_phone: string;
  weight: string;
  vehicle_type: string;
  cargo_value: number;
  price: number;
  pickup_date: string;
  notes: string;
  cargo_type: string;
  packaging: string;
  package_count: number | null;
  length_m: string | null;
  width_m: string | null;
  height_m: string | null;
  urgency: string;
  pickup_window: string;
  loading_method: string;
  unloading_method: string;
  recipient_national_id: string;
  recipient_postal_code: string;
  insurance_requested: boolean;
  cargo_note?: string;
  origin_zone?: string;
  destination_zone?: string;
  origin_lat?: string | null;
  origin_lng?: string | null;
  destination_lat?: string | null;
  destination_lng?: string | null;
  trailer_type?: string;
  requires_inspector?: boolean;
  cancel_reason?: string;
  operator_price?: number | null;
  price_status?: string;
  hold_resume?: string;
  rating: {
    driver_score: number;
    inspector_score: number | null;
    comment: string;
    created_at: string;
  } | null;
  status: string;
  owner: number;
  driver: number | null;
  inspector: number | null;
  owner_name: string;
  driver_name: string;
  inspector_name: string;
  created_at: string;
  updated_at: string;
  offers: {
    id: number;
    driver: number;
    driver_name: string;
    amount: number;
    note: string;
  }[];
  events: {
    id: number;
    status: string;
    note: string;
    created_at: string;
    actor_name: string;
  }[];
  inspections: {
    id: number;
    stage: string;
    passed: boolean;
    seal_number: string;
    notes: string;
    created_at: string;
  }[];
  documents: { id: number; name: string; url: string }[];
  locations: Location[];
};
export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export type Location = {
  observed_at: string;
  id: number;
  latitude: string;
  longitude: string;
  accuracy: number;
  created_at: string;
};
export const roles: Record<Role, string> = {
  owner: "صاحب بار",
  driver: "راننده",
  operator: "اپراتور",
  inspector: "متصدی",
};
export const panelPaths: Record<Role, string> = {
  owner: "owner",
  driver: "driver",
  operator: "admin",
  inspector: "inspector",
};
export const statuses: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "آماده تخصیص",
  assigned: "تخصیص یافته",
  loading: "در حال بارگیری",
  in_transit: "در مسیر",
  delivered: "تحویل شده",
  completed: "تکمیل شده",
  on_hold: "متوقف",
  cancelled: "لغو شده",
};
export const vehicles: Record<string, string> = {
  trailer: "تریلی",
  truck: "کامیون",
  pickup: "وانت",
  refrigerated: "یخچال‌دار",
};
export const urgencies: Record<string, string> = {
  urgent: "فوری",
  scheduled: "با فرصت",
};
export const trailerTypes: Record<string, string> = {
  روباز: "روباز",
  "بغل‌بازشو": "بغل‌بازشو",
  مسقف: "مسقف",
  کمپرسی: "کمپرسی",
  "یخچال‌دار": "یخچال‌دار",
  کفی: "کفی",
  "لبه‌دار": "لبه‌دار",
  "ترانزیت چادری": "ترانزیت چادری",
  کانتینربر: "کانتینربر",
};
export const pickupWindows: Record<string, string> = {
  "08-12": "۸ تا ۱۲",
  "12-16": "۱۲ تا ۱۶",
  "16-20": "۱۶ تا ۲۰",
  "20-24": "۲۰ تا ۲۴",
};
export const handlingMethods: Record<string, string> = {
  forklift: "لیفتراک",
  crane: "جرثقیل",
  manual: "دستی",
  ramp: "رمپ",
  other: "سایر",
};
export const complaintTypes: Record<string, string> = {
  driver: "راننده",
  dispatcher: "متصدی",
  cargo: "آسیب به کالا",
  delay: "تأخیر در حمل",
  other: "سایر موارد",
};
export const complaintStatuses: Record<string, string> = {
  pending: "در بررسی",
  reviewed: "بررسی شد",
  resolved: "حل شد",
  rejected: "رد شد",
};
export const number = (n: number | string | undefined) =>
  Number(n || 0).toLocaleString("fa-IR");
export const date = (s: string) =>
  s ? new Date(s).toLocaleDateString("fa-IR") : "—";
export const ago = (s: string) => {
  const minutes = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (!s || Number.isNaN(minutes)) return "—";
  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return number(minutes) + " دقیقه پیش";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return number(hours) + " ساعت پیش";
  const days = Math.floor(hours / 24);
  if (days < 7) return number(days) + " روز پیش";
  return date(s);
};
export const money = (n: number | string) => number(n) + " تومان";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = "request_failed",
    public requestId = "",
  ) {
    super(message);
  }
}
function readable(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(readable).join("، ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .filter(([key]) => !["code", "request_id"].includes(key))
      .map(
        ([key, v]) =>
          (fieldNames[key] ? fieldNames[key] + ": " : "") + readable(v),
      )
      .join(" · ");
  return "خطایی رخ داد؛ دوباره تلاش کنید.";
}
const fieldNames: Record<string, string> = {
  phone: "شماره موبایل",
  username: "نام کاربری",
  password: "رمز عبور",
  title: "عنوان",
  body: "متن",
  slug: "نشانی مقاله",
  national_id: "کد ملی",
  birth_date: "تاریخ تولد",
  license_expiry: "اعتبار گواهینامه",
  insurance_expiry: "اعتبار بیمه",
  pickup_date: "تاریخ بارگیری",
  plate: "پلاک خودرو",
  capacity: "ظرفیت",
  amount: "مبلغ",
  reference: "مرجع",
  email: "ایمیل",
  due_at: "سررسید",
  recipient_phone: "موبایل گیرنده",
};
async function requestJSON(path: string, init: RequestInit = {}) {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 30000);
  const cancel = () => controller.abort();
  if (init.signal?.aborted) cancel();
  else init.signal?.addEventListener("abort", cancel, { once: true });
  try {
    const response = await fetch(path, {
      ...init,
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
    const requestId = response.headers.get("X-Request-ID") || "";
    if (response.status === 204) return undefined;
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const info =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};
      const code = typeof info.code === "string" ? info.code : "request_failed";
      const fallback: Record<number, string> = {
        401: "برای ادامه وارد حساب شوید.",
        403: "به این بخش دسترسی ندارید یا اعتبار نشست تمام شده است.",
        404: "اطلاعات مورد نظر پیدا نشد یا دیگر در دسترس شما نیست.",
        408: "زمان پاسخ سرور تمام شد.",
        409: "وضعیت اطلاعات تغییر کرده است؛ صفحه را تازه کنید.",
        413: "حجم فایل از حد مجاز بیشتر است.",
        429: "تعداد درخواست‌ها زیاد است؛ کمی صبر کنید و دوباره تلاش کنید.",
        500: "پردازش درخواست با خطا روبه‌رو شد؛ وضعیت را پیش از تکرار بررسی کنید.",
        502: "ارتباط با سرویس برقرار نیست؛ دوباره تلاش کنید.",
        503: "سرویس موقتاً در دسترس نیست؛ وضعیت را پیش از تکرار بررسی کنید.",
        504: "پاسخ سرویس طول کشید؛ وضعیت را پیش از تکرار بررسی کنید.",
      };
      const message =
        response.status >= 500 ||
        response.status === 404 ||
        response.status === 429
          ? fallback[response.status] || fallback[500]
          : data
            ? readable(data)
            : fallback[response.status] || "انجام درخواست ممکن نشد.";
      if (code === "not_authenticated" && typeof window !== "undefined")
        window.dispatchEvent(new CustomEvent("alamut:session-expired"));
      throw new ApiError(
        message +
          (response.status >= 500 && requestId
            ? " کد پیگیری: " + requestId
            : ""),
        response.status,
        code,
        requestId,
      );
    }
    if (data === null)
      throw new ApiError(
        "پاسخ سرور قابل خواندن نیست؛ صفحه را تازه کنید.",
        response.status,
        "invalid_response",
        requestId,
      );
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const timeout = error instanceof Error && error.name === "AbortError";
    throw new ApiError(
      timeout
        ? "زمان پاسخ تمام شد؛ وضعیت درخواست را پیش از ثبت دوباره بررسی کنید."
        : "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید؛ وضعیت درخواست را پیش از ثبت دوباره بررسی کنید.",
      0,
      timeout ? "timeout" : "network_error",
    );
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", cancel);
  }
}
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const endpoint = path.startsWith("/api/") ? path : "/api/" + path;
  if (
    !endpoint.startsWith("/api/") ||
    !new URL(endpoint, "http://local").pathname.startsWith("/api/")
  )
    throw new ApiError("مسیر درخواست معتبر نیست.", 400, "invalid_path");
  let csrfToken = "";
  if (method !== "GET") {
    const csrf = (await requestJSON("/api/auth/csrf/", { signal })) as {
      csrfToken?: string;
    };
    if (!csrf?.csrfToken)
      throw new ApiError(
        "اعتبار فرم دریافت نشد؛ صفحه را تازه کنید.",
        403,
        "csrf_failed",
      );
    csrfToken = csrf.csrfToken;
  }
  const form = body instanceof FormData;
  if (body && typeof body === "object" && !form) {
    body = Object.fromEntries(
      Object.entries(body).map(([key, value]) => [
        key,
        typeof value === "string" &&
        [
          "phone",
          "recipient_phone",
          "emergency_phone",
          "national_id",
          "postal_code",
          "recipient_national_id",
          "recipient_postal_code",
          "code",
        ].includes(key)
          ? value
              .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
              .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
          : value,
      ]),
    );
  }

  return (await requestJSON(endpoint, {
    method,
    signal,
    credentials: "same-origin",
    headers: {
      ...(method !== "GET" ? { "X-CSRFToken": csrfToken } : {}),
      ...(!form && body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? (form ? (body as FormData) : JSON.stringify(body)) : undefined,
    cache: "no-store",
  })) as T;
}
