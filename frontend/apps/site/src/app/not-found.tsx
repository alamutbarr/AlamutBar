import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="empty">
      <h1>این مسیر پیدا نشد.</h1>
      <p>ممکن است آدرس تغییر کرده باشد.</p>
      <p>
        <Link href="/apps">ورود به پنل‌ها</Link> ·{" "}
        <Link href="/articles">مقالات</Link> ·{" "}
        <Link href="/contact">پشتیبانی</Link>
      </p>
      <Link className="btn" href="/">
        بازگشت به خانه
      </Link>
    </main>
  );
}
