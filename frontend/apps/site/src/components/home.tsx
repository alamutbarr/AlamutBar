"use client";
import { api, number, roles, type Role } from "@/lib/api";
import { appHref } from "@/lib/deployment-links";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpLeft,
  CheckCircle2,
  Layers3,
  MapPin,
  Menu,
  PackageCheck,
  PanelsTopLeft,
  Route,
  Search,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import Link from "@/lib/navigation";
import { useState, type FormEvent } from "react";
import { Badge, Brand, Modal } from "@/components/ui";
import PublicFooter from "./public-footer";
import PublicMobileNav from "./public-mobile-nav";
const services = [
  {
    icon: Route,
    title: "پیگیری شفاف محموله",
    text: "وضعیت بار و تاریخچه مراحل حمل را در یک صفحه دنبال کنید؛ از تأیید سفارش تا تحویل نهایی.",
    note: "هر مرحله، روشن و قابل پیگیری",
  },
  {
    icon: ShieldCheck,
    title: "بازرسی در مبدأ و مقصد",
    text: "چک‌لیست بسته‌بندی، وزن، خودرو و شماره پلمب؛ هر تأیید با نام متصدی و زمان ثبت می‌شود.",
    note: "اطمینان از سلامت بار",
  },
  {
    icon: PackageCheck,
    title: "اسناد در کنار محموله",
    text: "تصاویر، رسید و مدارک حمل را کنار همان سفارش نگه دارید و در زمان لازم دریافت کنید.",
    note: "جزئیات، در جای درست",
  },
  {
    icon: Truck,
    title: "تأمین و تخصیص ناوگان",
    text: "پیشنهاد رانندگان را بررسی کنید. خودروی متناسب با وزن و نوع بار به مسیر شما تخصیص می‌یابد.",
    note: "خودروی درست برای بار درست",
  },
  {
    icon: Layers3,
    title: "مالی روشن و منظم",
    text: "کرایه توافق‌شده، صورتحساب و مرجع تسویه؛ یک تصویر روشن از حساب هر محموله.",
    note: "شفافیت تا آخرین مرحله",
  },
  {
    icon: PanelsTopLeft,
    title: "چهار نقش، یک مسیر",
    text: "صاحب بار، راننده، اپراتور و متصدی، هر کدام ابزارهای متناسب با کار خود را در اختیار دارند.",
    note: "هماهنگی در یک سامانه",
  },
];
export default function Home() {
  const [entry, setEntry] = useState(false),
    [menu, setMenu] = useState(false),
    [sent, setSent] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tracking, setTracking] = useState<{
      code: string;
      origin: string;
      destination: string;
      status: string;
    } | null>(null),
    [trackError, setTrackError] = useState("");
  async function contact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      const result = await api<{ detail: string }>("contact/", "POST", d);
      setSent(result.detail);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function track(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTrackError("");
    setTracking(null);
    const d = new FormData(e.currentTarget);
    try {
      setTracking(
        await api(
          "tracking/?code=" + encodeURIComponent(String(d.get("code"))),
        ),
      );
    } catch {
      setTrackError("محموله‌ای با این کد پیدا نشد. کد پیگیری را بررسی کنید.");
    }
  }
  return (
    <div className="public-site mobile-public landing-page">
      <main id="main">
        <section className="hero" id="top">
          <img
            className="hero-image"
            fetchPriority="high"
            width={1920}
            height={1080}
            src="/alamut-road.jpg"
            alt="کامیون در جاده کوهستانی، هنگام سپیده‌دم"
          />
          <div className="hero-shade" />
          <header className="public-header">
            <Brand light />
            <nav
              aria-label="منوی اصلی"
              className={menu ? "public-nav open" : "public-nav"}
            >
              {[
                ["خدمات ما", "#services"],
                ["روش کار", "#approach"],
                ["شبکه حمل", "#network"],
                ["تماس با ما", "#contact"],
              ].map(([t, h]) => (
                <a key={h} href={h} onClick={() => setMenu(false)}>
                  {t}
                </a>
              ))}
              <button className="outline-btn" onClick={() => setEntry(true)}>
                ورود <ArrowUpLeft size={16} />
              </button>
            </nav>
            <button
              className="menu-toggle icon-btn"
              aria-label="منو"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </header>
          <div className="hero-aside">
            هر مسیر، یک تعهد است
            <br />
            حمل‌ونقل و لجستیک صنعتی
          </div>
          <div className="hero-content">
            <p className="eyebrow">
              <i /> حمل بار، با خیال راحت
            </p>
            <h1>
              مسیر مطمئن،
              <br />
              <em>حمل هوشمند.</em>
            </h1>
            <p className="hero-description">
              از ثبت سفارش تا تحویل، در کنار شما. سریع، مطمئن و شفاف تا باری که
              به ما می‌سپارید بی‌دغدغه به مقصد برسد.
            </p>
            <div className="hero-actions">
              <button className="btn" onClick={() => setEntry(true)}>
                ورود به پنل‌ها
                <ArrowLeft size={18} />
              </button>
              <a href="#services">
                با خدمات ما آشنا شوید <ArrowUpLeft size={17} />
              </a>
            </div>
          </div>
          <div className="hero-stamp">
            مسیر
            <br />
            <b>مطمئن</b>
          </div>
          <div className="hero-foot">
            <span>الهام از ایران، ساخته برای آینده.</span>
            <a href="#manifesto">
              ادامه مطلب <ArrowDown size={14} />
            </a>
            <span>۰۱ — ۰۵</span>
          </div>
        </section>
        <section className="manifesto section-wrap" id="manifesto">
          <div className="kicker">
            <span />
            دستی مطمئن در دنیایی پرتحرک <small>/ ۰۱</small>
          </div>
          <div className="editorial-grid">
            <h2>
              لجستیک زنجیره‌ای
              <br />
              از <em>تصمیم‌های انسانی</em> است.
            </h2>
            <div>
              <p>
                پشت هر پالت، قطعه و محموله، کسی منتظر رسیدنش است. ما از اولین
                گفت‌وگو تا تحویل نهایی، این را از یاد نمی‌بریم.
              </p>
              <p className="muted">
                الموت کنار کسب‌وکارها می‌ایستد تا جابه‌جایی کالا، رابطه‌ای باشد
                که بشود به آن تکیه کرد.
              </p>
              <a className="text-link" href="#approach">
                کمی درباره روش کار ما <ArrowUpLeft size={18} />
              </a>
            </div>
          </div>
          <div className="manifesto-line">
            <span>کار در جزئیات است</span>
            <i />
            <span>و در کسانی که مراقب آن‌ها هستند</span>
          </div>
        </section>
        <section className="services section-wrap" id="services">
          <div className="kicker">
            <span />
            خدمات ما <small>/ ۰۲</small>
          </div>
          <div className="section-heading">
            <h2>
              راه درست <em>رسیدن.</em>
            </h2>
            <p>
              هر کالا مسیر خودش را می‌خواهد. بگویید چه چیزی را جابه‌جا می‌کنید،
              به کجا می‌رود و چه چیزی برایتان مهم‌تر است.
            </p>
          </div>
          <div className="service-grid">
            {services.map((s, i) => (
              <article key={s.title} className="service-card">
                <div className="service-top">
                  <s.icon size={29} strokeWidth={1.3} />
                  <span>{number(i + 1).padStart(2, "۰")}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <div>
                  <small>
                    <i />
                    {s.note}
                  </small>
                  <a
                    href="#contact"
                    aria-label={"اطلاعات بیشتر درباره " + s.title}
                  >
                    <ArrowUpLeft size={20} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="approach" id="approach">
          <div className="section-wrap approach-grid">
            <div>
              <div className="kicker light">
                <span />
                روش الموت <small>/ ۰۳</small>
              </div>
              <h2>
                سفر خوب با
                <br />
                <em>یک گفت‌وگوی خوب</em>
                <br />
                شروع می‌شود.
              </h2>
              <p>
                هیچ دو محموله‌ای شبیه هم نیستند. اول گوش می‌دهیم، بعد برنامه‌ای
                می‌چینیم که به بار، آدم‌ها و مقصد بخورد.
              </p>
              <a className="outline-btn" href="#contact">
                شروع با یک گفت‌وگو
                <ArrowLeft size={18} />
              </a>
            </div>
            <div className="steps">
              {[
                [
                  "اول گوش می‌دهیم.",
                  "چه چیزی جابه‌جا می‌شود و چه چیزی برای شما مهم است؟",
                ],
                [
                  "برنامه روشن می‌چینیم.",
                  "مسیر، خودروی مناسب و تصویری مشترک از مراحل بعدی.",
                ],
                [
                  "تا آخر در جریان می‌مانیم.",
                  "از بارگیری و بازرسی تا تحویل و تأیید شما.",
                ],
              ].map(([t, p], i) => (
                <div key={t}>
                  <span>{number(i + 1).padStart(2, "۰")}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{p}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="network section-wrap" id="network">
          <div className="kicker">
            <span />
            فاصله میان مبدأ و مقصد <small>/ ۰۴</small>
          </div>
          <div className="editorial-grid">
            <div>
              <h2>
                از نیشابور،
                <br />
                تا <em>سراسر ایران.</em>
              </h2>
              <p>
                هر جا که کسب‌وکار شما لازم دارد کالایش برسد، جزئیات شایسته
                توجه‌اند. مسیرها را با همراهی آدم‌ها، دقیق و مرحله‌به‌مرحله
                هماهنگ می‌کنیم.
              </p>
              <a className="text-link" href="#contact">
                بگویید بار کجا باید برود
                <ArrowUpLeft size={18} />
              </a>
            </div>
            <div className="network-photo">
              <img
                src="/alamut-road.jpg"
                alt="راه‌های کوهستانی ایران"
                loading="lazy"
              />
              <div>
                <MapPin size={18} /> هر مسیر، یک ارتباط تازه
              </div>
            </div>
          </div>
          <form className="tracking-box" onSubmit={track}>
            <div>
              <span className="eyebrow">از مبدأ تا مقصد</span>
              <h3>بارتان در کدام مرحله است؟</h3>
            </div>
            <label>
              <span className="sr-only">کد پیگیری</span>
              <input
                name="code"
                placeholder="AL-XXXXXXXXXX"
                required
                dir="ltr"
                maxLength={20}
              />
            </label>
            <button className="btn" type="submit">
              <Search size={18} /> پیگیری محموله
            </button>
            {trackError && (
              <p className="error full" role="alert">
                {trackError}
              </p>
            )}
            {tracking && (
              <div className="track-result full">
                <b dir="ltr">{tracking.code}</b>
                <span>
                  {tracking.origin} ← {tracking.destination}
                </span>
                <Badge status={tracking.status} />
              </div>
            )}
          </form>
        </section>
        <section className="contact-section" id="contact">
          <div className="section-wrap">
            <div className="kicker">
              <span />
              بیایید وارد جزئیات شویم <small>/ ۰۵</small>
            </div>
            <div className="editorial-grid">
              <div>
                <h2>
                  چه چیزی
                  <br />
                  باید <em>جابه‌جا شود؟</em>
                </h2>
                <p>
                  کمی درباره محموله بگویید. درخواست شما در مرکز عملیات ثبت
                  می‌شود تا مراحل بعدی هماهنگ شود.
                </p>
                <div className="human-note">
                  <ShieldCheck size={30} strokeWidth={1.2} />
                  <span>
                    آدم‌های واقعی. گفت‌وگوی واقعی.
                    <small>از هر جا که هستید شروع کنید.</small>
                  </span>
                </div>
              </div>
              {sent ? (
                <div className="contact-success" role="status">
                  <CheckCircle2 size={50} />
                  <h3>شروع یک مسیر تازه</h3>
                  <p>{sent}</p>
                  <button className="text-link" onClick={() => setSent("")}>
                    ثبت درخواست دیگر
                  </button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={contact}>
                  <label>
                    نام و نام خانوادگی
                    <input
                      name="name"
                      required
                      maxLength={100}
                      autoComplete="name"
                      placeholder="نام شما"
                    />
                  </label>
                  <label>
                    شماره موبایل
                    <input
                      name="phone"
                      required
                      pattern="[0۰٠][9۹٩][0-9۰-۹٠-٩]{9}"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="09123456789"
                    />
                  </label>
                  <label>
                    چه باری را می‌خواهید حمل کنید؟
                    <textarea
                      name="message"
                      required
                      maxLength={2000}
                      rows={4}
                      placeholder="نوع بار، مبدأ، مقصد و زمان مورد نظر…"
                    />
                  </label>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="btn" disabled={busy}>
                    ارسال درخواست
                    <ArrowLeft size={18} />
                  </button>
                  <small>بدون تعهد. فقط شروعی خوب.</small>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
      <PublicMobileNav />
      {entry && (
        <Modal title="کدام پنل را می‌خواهید؟" onClose={() => setEntry(false)}>
          <p className="muted">
            نقش خود را انتخاب کنید و وارد فضای کارتان شوید.
          </p>
          <div className="entry-choices">
            {(Object.keys(roles) as Role[]).map((r) => (
              <Link key={r} href={appHref("/login?role=" + r)}>
                <span>
                  {roles[r]}
                  <small>
                    {
                      {
                        owner: "ثبت، مدیریت و پیگیری محموله‌ها",
                        driver: "اعلام آمادگی، پیشنهاد و مدیریت سفر",
                        operator: "هماهنگی ناوگان و مرکز عملیات",
                        inspector: "بازرسی، پلمب و تأیید سلامت بار",
                      }[r]
                    }
                  </small>
                </span>
                <ArrowUpLeft size={22} />
              </Link>
            ))}
          </div>
          <p className="muted small">
            حساب ندارید؟{" "}
            <Link href={appHref("/register")}>ثبت‌نام صاحب بار و راننده</Link>
          </p>
        </Modal>
      )}
    </div>
  );
}
