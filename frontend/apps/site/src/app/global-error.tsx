"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          fontFamily: "Tahoma, sans-serif",
          background: "#f6f7f2",
          color: "#183e46",
          padding: 32,
          lineHeight: 2,
        }}
      >
        <main>
          <h1>نمایش برنامه با خطا روبه‌رو شد.</h1>
          <p>
            دوباره تلاش کنید. اطلاعات ثبت‌شده در سرور حفظ می‌شوند؛ پیش از تکرار
            عملیات، وضعیت آن را بررسی کنید.
          </p>
          <button
            onClick={reset}
            style={{ padding: "12px 24px", font: "inherit" }}
          >
            تلاش مجدد
          </button>
          <p>
            <a href="/apps">ورود به پنل‌ها</a> ·{" "}
            <a href="/status">بررسی سرویس</a>
          </p>
        </main>
      </body>
    </html>
  );
}
