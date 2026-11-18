"use client";
export default function Error({
  reset,
  error,
}: {
  reset: () => void;
  error: Error & { digest?: string };
}) {
  return (
    <main id="main" className="empty">
      <h1>نمایش این صفحه با خطا روبه‌رو شد.</h1>
      <p>
        لطفاً دوباره تلاش کنید. پیش از تکرار عملیات، وضعیت درخواست قبلی را بررسی
        کنید.
      </p>
      {error.digest && <small>کد پیگیری: {error.digest}</small>}
      <button className="btn" onClick={reset}>
        تلاش مجدد
      </button>
    </main>
  );
}
