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
  role: Role;
  verified: boolean;
  driver_market_enabled: boolean;
  capabilities: string[];
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
  cancelled: "لغو شده",
};
export const vehicles: Record<string, string> = {
  trailer: "تریلی",
  truck: "کامیون",
  pickup: "وانت",
  refrigerated: "یخچال‌دار",
};
export const number = (n: number | string | undefined) =>
  Number(n || 0).toLocaleString("fa-IR");
export const date = (s: string) =>
  s ? new Date(s).toLocaleDateString("fa-IR") : "—";
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
