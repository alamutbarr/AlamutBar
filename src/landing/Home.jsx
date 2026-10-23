import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowLeft, ArrowUpLeft, Check, ChevronDown, Clock3, Globe2, MapPin, Menu, MoveLeft, Route as RouteIcon, Shield, ShieldCheck, Smartphone, Truck, X } from 'lucide-react';
import './landing.css';

const fa = (n) => n.toLocaleString('fa-IR');
const faPad = (n) => `${fa(0)}${fa(n)}`;

const navItems = [
  { label: 'خدمات ما', href: '#services' },
  { label: 'روش کار', href: '#approach' },
  { label: 'شبکه حمل', href: '#network' },
  { label: 'تماس با ما', href: '#contact' },
];

const services = [
  {
    number: faPad(1),
    icon: MapPin,
    title: 'ردیابی لحظه‌ای بار',
    description: 'موقعیت خودرو، زمان تقریبی رسیدن و وضعیت مسیر را از لحظهٔ حرکت تا تخلیه ببینید؛ بدون تماس‌های پیاپی.',
    note: 'همیشه می‌دانید بار کجاست',
  },
  {
    number: faPad(2),
    icon: RouteIcon,
    title: 'مسیر مطمئن و هشدار انحراف',
    description: 'مسیر مبنا پیش از حرکت ثبت می‌شود و هر خروج از مسیر یا قطع ارتباط، فوراً به مرکز امنیت و شما اطلاع داده می‌شود.',
    note: 'مسیر زیر نظر است',
  },
  {
    number: faPad(3),
    icon: ShieldCheck,
    title: 'امنیت و بیمهٔ بار',
    description: 'حضور متصدی در محل بارگیری، ثبت عکس و پلمب، و بیمهٔ یک‌کلیکی برای باری که جای ریسک ندارد.',
    note: 'اطمینان از اصالت و سلامت بار',
  },
  {
    number: faPad(4),
    icon: Clock3,
    title: 'تأمین و اعزام سریع',
    description: 'راننده و خودروی مناسب پیدا می‌شود و بدون معطلی به محل بارگیری اعزام می‌شود؛ با هشدار پیش از هر تأخیر احتمالی.',
    note: 'سرعت در تأمین، سرعت در اعزام',
  },
  {
    number: faPad(5),
    icon: Truck,
    title: 'ناوگان متناسب با بار',
    description: 'از کامیونت و کفی تا کامیون ۶ و ۱۸ چرخ و تریلی؛ خودروی نامناسب با وزن و ابعاد بار اصلاً پیشنهاد نمی‌شود.',
    note: 'خودروی درست برای بار درست',
  },
  {
    number: faPad(6),
    icon: Smartphone,
    title: 'پنل و اپلیکیشن',
    description: 'پنل وب و موبایل برای صاحب کالا، اپلیکیشن برای راننده و داشبورد زندهٔ همهٔ محموله‌ها در یک نگاه.',
    note: 'همه‌چیز در یک صفحه',
  },
];


function BrandMark({ light = false }) {
  return (
    <a className={`brand-mark ${light ? 'brand-light' : ''}`} href="#top" aria-label="صفحهٔ اصلی شرکت الموت">
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M5 28.5 17.5 8l7.1 11.8L30 10l5 8.7v9.8H5Z" />
          <path d="M5 28.5h30M12 21l4.6 7.5M24.4 20l5.6 8.5" />
        </svg>
      </span>
      <span className="brand-words"><strong>ALAMUT</strong><small>حمل‌ونقل و لجستیک</small></span>
    </a>
  );
}

function ArrowLink({ href, children, light = false }) {
  return (
    <a className={`arrow-link ${light ? 'arrow-link-light' : ''}`} href={href}>
      <span>{children}</span><ArrowUpLeft size={16} strokeWidth={1.8} aria-hidden="true" />
    </a>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sent, setSent] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const year = new Date().toLocaleDateString('fa-IR', { year: 'numeric' });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
    return () => {
      window.removeEventListener('scroll', onScroll);
      revealObserver.disconnect();
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const submitInquiry = (event) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <main className="page-grain" id="top">
      <header className={`site-header ${scrolled ? 'header-scrolled' : ''}`}>
        <div className="nav-wrap">
          <BrandMark light={!scrolled} />
          <nav className="desktop-nav" aria-label="منوی اصلی">
            {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <button type="button" className={`nav-cta ${scrolled ? '' : 'nav-cta-dark'}`} onClick={() => setEntryOpen(true)}>ورود <ArrowUpLeft size={15} /></button>
          <button className={`menu-toggle ${scrolled ? '' : 'menu-toggle-light'}`} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}>
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        <div className={`mobile-nav ${menuOpen ? 'mobile-nav-open' : ''}`} aria-hidden={!menuOpen}>
          <span className="mobile-nav-label">منو</span>
          {navItems.map((item, index) => <a key={item.href} href={item.href} onClick={closeMenu}><span>{faPad(index + 1)}</span>{item.label}<ArrowUpLeft size={18} /></a>)}
          <a href="/driver" onClick={closeMenu}><span>{faPad(navItems.length + 1)}</span>ورود رانندگان<ArrowUpLeft size={18} /></a>
          <a href="/owner/login" onClick={closeMenu}><span>{faPad(navItems.length + 2)}</span>ورود صاحب کالا<ArrowUpLeft size={18} /></a>
          <p>بار جابه‌جا می‌شود؛ اعتماد، ماندگار می‌ماند.</p>
        </div>
        {menuOpen && <button className="mobile-scrim" aria-label="بستن منو" onClick={closeMenu} />}
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-image" src={`${import.meta.env.BASE_URL}alamut-road.jpg`} alt="کامیونی در جاده‌ای پیچ‌درپیچ میان کوهستان، در سپیده‌دم" />
        <div className="hero-shade" />
        <div className="hero-coordinate font-mono">هر مسیر، یک تعهد است<br /><span>حمل‌ونقل و لجستیک صنعتی</span></div>
        <div className="hero-content">
          <div className="eyebrow eyebrow-light rise-in"><i /> حمل بار، با خیال راحت</div>
          <h1 id="hero-title" className="font-display rise-in delay-1">مسیر مطمئن،<br /><em>حمل هوشمند.</em></h1>
          <p className="hero-copy rise-in delay-2">از ثبت سفارش تا تحویل، در کنار شما. سریع، مطمئن و شفاف؛ تا باری که به ما می‌سپارید بی‌دغدغه به مقصد برسد.</p>
          <div className="hero-actions rise-in delay-3">
            <button type="button" className="button button-primary" onClick={() => setEntryOpen(true)}>ورود به پنل‌ها <ArrowLeft size={17} /></button>
            <a className="text-action" href="#services">با خدمات ما آشنا شوید <ArrowDownLeft size={16} /></a>
          </div>
        </div>
        <div className="hero-foot rise-in delay-4">
          <span>الهام از ایران، ساخته برای آینده.</span>
          <a href="#manifesto"><span className="scroll-word">ادامهٔ مطلب</span><ChevronDown size={15} /></a>
          <span className="hero-index font-mono">{faPad(1)} — {faPad(5)}</span>
        </div>
        <div className="hero-stamp" aria-hidden="true"><span>مسیر<br />مطمئن</span><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" /><path d="M19 48 37 20l10 16 8-13 9 15v13H19Z" /></svg></div>
      </section>

      <section className="manifesto section-pad" id="manifesto">
        <div className="section-kicker reveal"><span className="kicker-line" />دستی مطمئن در دنیایی پرتحرک <span className="font-mono">/ {faPad(1)}</span></div>
        <div className="manifesto-layout">
          <h2 className="font-display reveal">لجستیک زنجیره‌ای<br />از <em>تصمیم‌های انسانی</em> است.</h2>
          <div className="manifesto-copy reveal">
            <p>پشت هر پالت، قطعه و محموله، کسی منتظر رسیدنش است. ما از اولین گفت‌وگو تا تحویل نهایی، این را از یاد نمی‌بریم.</p>
            <p>الموت کنار کسب‌وکارها می‌ایستد تا جابه‌جایی کالا دیگر یک جعبه‌سیاه نباشد؛ رابطه‌ای باشد که بشود به آن تکیه کرد.</p>
            <ArrowLink href="#approach">کمی دربارهٔ روش کار ما</ArrowLink>
          </div>
        </div>
        <div className="manifesto-rule"><span>کار در جزئیات است</span><span className="rule-arrows">———&lt;——————&lt;————</span><span>و در کسانی که مراقب آن‌ها هستند</span></div>
      </section>

      <section className="services section-pad" id="services">
        <div className="section-kicker reveal"><span className="kicker-line" />خدمات ما <span className="font-mono">/ {faPad(2)}</span></div>
        <div className="section-heading-row reveal">
          <h2 className="font-display">راه درست<br /><em>رسیدن.</em></h2>
          <p>هر کالا مسیر خودش را می‌خواهد. بگویید چه چیزی را جابه‌جا می‌کنید، به کجا می‌رود و در این میان چه چیزی برایتان مهم‌تر است.</p>
        </div>
        <div className="service-list">
          {services.map(({ number, icon: Icon, title, description, note }) => (
            <article className="service-row reveal" key={number}>
              <span className="service-number font-mono">{number}</span>
              <span className="service-icon"><Icon size={24} strokeWidth={1.45} /></span>
              <div className="service-description"><h3 className="font-display">{title}</h3><p>{description}</p></div>
              <span className="service-note"><i />{note}</span>
              <a className="service-arrow" href="#contact" aria-label={`دربارهٔ «${title}» بپرسید`}><ArrowUpLeft size={19} /></a>
            </article>
          ))}
        </div>
        <div className="services-foot reveal"><span>مطمئن نیستید کدام خدمت به کارتان می‌آید؟</span><a href="#contact">با هم پیدایش می‌کنیم <ArrowLeft size={15} /></a></div>
      </section>

      <section className="approach" id="approach">
        <div className="approach-art">
          <div className="map-label map-label-top font-mono">مسیر / منعطف از بنیاد</div>
          <svg className="route-map" viewBox="0 0 720 720" role="img" aria-label="تصویرسازی مسیر میان مبدأ و مقصد">
            <defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".17" /></pattern></defs>
            <rect width="720" height="720" fill="url(#dots)" />
            <path d="M-20 150c102-55 145 78 247 18s117-81 160-8-65 107-11 172 167-16 203 69-67 135-48 225 101 116 184 44" fill="none" stroke="currentColor" strokeWidth="1" opacity=".18" />
            <path d="M37 583c94-70 77-194 193-178s63-116 185-115 74 163 199 153 128-107 155-145" fill="none" stroke="currentColor" strokeWidth="1" opacity=".14" />
            <path className="route-dash" d="M94 539c55-10 62-120 140-135 77-15 68-94 139-109 73-15 34-104 106-134 60-26 110 18 156-32" fill="none" stroke="#087f8c" strokeWidth="3" />
            <circle cx="94" cy="539" r="8" fill="#d7b56d" /><circle cx="94" cy="539" r="16" fill="none" stroke="#d7b56d" strokeWidth="1" opacity=".65" />
            <circle cx="635" cy="129" r="8" fill="#d7b56d" /><circle cx="635" cy="129" r="16" fill="none" stroke="#d7b56d" strokeWidth="1" opacity=".65" />
            <path d="M535 282 577 240M534 240h43v43" fill="none" stroke="currentColor" strokeWidth="1" opacity=".4" />
            <path d="M112 220 144 188M112 188h32v32" fill="none" stroke="currentColor" strokeWidth="1" opacity=".35" />
          </svg>
          <div className="map-tag map-tag-origin"><i /> مبدأ <span>انبار شما</span></div>
          <div className="map-tag map-tag-dest"><i /> مقصد <span>مشتری شما</span></div>
          <div className="map-scale font-mono">یادداشت‌های میدانی — {faPad(1)} / {faPad(3)}</div>
        </div>
        <div className="approach-copy">
          <div className="section-kicker section-kicker-light reveal"><span className="kicker-line" />روش الموت <span className="font-mono">/ {faPad(3)}</span></div>
          <h2 className="font-display reveal">سفر خوب با<br /><em>یک گفت‌وگوی<br />خوب شروع می‌شود.</em></h2>
          <p className="approach-intro reveal">هیچ دو محموله‌ای شبیه هم نیستند. اول گوش می‌دهیم، بعد برنامه‌ای می‌چینیم که به بار، آدم‌ها و مقصد بخورد.</p>
          <div className="approach-steps">
            <div className="approach-step reveal"><span className="font-mono">{faPad(1)}</span><div><h3>اول گوش می‌دهیم.</h3><p>چه چیزی جابه‌جا می‌شود، چه چیزی مهم است و چه چیزی ممکن است کار را پیچیده کند؟</p></div></div>
            <div className="approach-step reveal"><span className="font-mono">{faPad(2)}</span><div><h3>برنامهٔ روشن می‌چینیم.</h3><p>مسیر، خودروی مناسب و تصویری مشترک از مراحل بعدی.</p></div></div>
            <div className="approach-step reveal"><span className="font-mono">{faPad(3)}</span><div><h3>تا آخر در جریان می‌مانیم.</h3><p>در تمام مسیر، آدم‌های واقعی پاسخگوی شما هستند.</p></div></div>
          </div>
          <a className="button button-outline-light reveal" href="#contact">شروع با یک گفت‌وگو <ArrowLeft size={16} /></a>
        </div>
      </section>

      <section className="network section-pad" id="network">
        <div className="network-top">
          <div className="section-kicker reveal"><span className="kicker-line" />فاصلهٔ میان مبدأ و مقصد <span className="font-mono">/ {faPad(4)}</span></div>
          <div className="network-heading reveal"><h2 className="font-display">از نیشابور،<br />تا <em>سراسر ایران.</em></h2><p>هر جا که کسب‌وکار شما لازم دارد کالایش برسد، جزئیات شایستهٔ توجه‌اند. حمل‌های درون‌شهری، منطقه‌ای و بین‌استانی را هماهنگ می‌کنیم؛ از نیشابور شروع کرده‌ایم و مسیرمان به‌سوی شبکه‌ای سراسری است.</p></div>
        </div>
        <div className="network-visual reveal">
          <div className="network-photo"><img src={`${import.meta.env.BASE_URL}alamut-road.jpg`} alt="جاده‌ای باز که در منظرهٔ کوهستانی گم می‌شود" loading="lazy" /><div className="network-photo-caption font-mono"><span>مطالعهٔ میدانی / شبکهٔ راه‌ها</span><span>همه‌چیز در حرکت</span></div></div>
          <div className="network-aside">
            <div className="network-aside-mark"><Globe2 size={24} strokeWidth={1.25} /></div>
            <span className="font-mono">مسیر هرگز فقط یک خط نیست</span>
            <p>تأمین‌کننده را به کارگاه وصل می‌کند. انبار را به خط تولید. یک کسب‌وکار را به قدم بعدی‌اش.</p>
            <ArrowLink href="#contact">بگویید بار کجا باید برود</ArrowLink>
            <div className="network-coordinates font-mono">جهت: رو به جلو<br />وضعیت: بیایید صحبت کنیم</div>
          </div>
        </div>
        <div className="ticker" aria-label="از اولین کیلومتر تا تحویل نهایی">
          <div className="ticker-track">{Array.from({ length: 4 }, (_, i) => <span key={i}>اولین کیلومتر <b>·</b> مسیر طولانی <b>·</b> تحویل نهایی <b>·</b> شرکت الموت <b>·</b></span>)}</div>
        </div>
      </section>

      <section className="values section-pad">
        <div className="section-kicker reveal"><span className="kicker-line" />از ما چه انتظاری داشته باشید <span className="font-mono">/ {faPad(5)}</span></div>
        <div className="values-layout">
          <h2 className="font-display reveal">کار پایدار.<br /><em>حرف روشن.</em></h2>
          <div className="value-grid">
            <article className="value-card reveal"><div className="value-index font-mono">الف / {faPad(1)}</div><Shield size={22} strokeWidth={1.5} /><h3>دقت در جزئیات</h3><p>بار، نحوهٔ بارگیری، زمان‌بندی و آدم‌های درگیر را جدی می‌گیریم.</p></article>
            <article className="value-card reveal"><div className="value-index font-mono">ب / {faPad(2)}</div><Clock3 size={22} strokeWidth={1.5} /><h3>شفافیت در مسیر</h3><p>ارتباط خوب یعنی بدانید با چه کسی تماس بگیرید و در هر مرحله منتظر چه باشید.</p></article>
            <article className="value-card reveal"><div className="value-index font-mono">ج / {faPad(3)}</div><MoveLeft size={22} strokeWidth={1.5} /><h3>هماهنگی دقیق</h3><p>هر جابه‌جایی اجزای متحرک زیادی دارد؛ ما برنامه و آدم‌ها را به هم وصل نگه می‌داریم.</p></article>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-top">
          <div className="section-kicker section-kicker-light reveal"><span className="kicker-line" />بیایید وارد جزئیات شویم <span className="font-mono">/ {faPad(6)}</span></div>
          <div className="contact-grid">
            <div className="contact-message reveal"><h2 className="font-display">چه چیزی<br />باید <em>جابه‌جا شود؟</em></h2><p>کمی دربارهٔ محموله بگویید. یکی از همکاران ما برای هماهنگی مراحل بعدی با شما تماس می‌گیرد.</p><div className="contact-human"><span className="human-mark"><Truck size={20} strokeWidth={1.5} /></span><span>آدم‌های واقعی. گفت‌وگوی واقعی.<br /><small>از هر جا که هستید شروع کنید.</small></span></div></div>
            <div className="contact-form-wrap reveal">
              {sent ? (
                <div className="form-success" role="status"><span><Check size={22} /></span><h3 className="font-display">ممنون.<br /><em>جزئیات را داریم.</em></h3><p>این فرم هنوز به صندوق دریافت درخواست‌ها وصل نیست و پیام شما ارسال نشده است. لطفاً از راه‌های ارتباطی معمول با الموت تماس بگیرید.</p><button className="text-action dark-action" onClick={() => setSent(false)}>ویرایش درخواست <ArrowLeft size={15} /></button></div>
              ) : (
                <form onSubmit={submitInquiry}>
                  <div className="form-pair">
                    <label>نام و نام خانوادگی<input name="name" type="text" placeholder="چطور خطابتان کنیم؟" required /></label>
                    <label>شرکت / کارخانه<input name="company" type="text" placeholder="کسب‌وکار شما" /></label>
                  </div>
                  <label>شمارهٔ موبایل<input name="phone" type="tel" inputMode="tel" dir="ltr" placeholder="09123456789" required /></label>
                  <label>چه باری را می‌خواهید حمل کنید؟<textarea name="message" placeholder="نوع بار، مبدأ و مقصد، زمان بارگیری — هر چه تا اینجا می‌دانید." rows={3} required /></label>
                  <button className="button button-primary form-submit" type="submit">ارسال درخواست <ArrowLeft size={17} /></button>
                  <p className="form-note">بدون تعهد. فقط شروعی خوب.</p>
                </form>
              )}
            </div>
          </div>
        </div>
        <footer className="footer">
          <BrandMark light />
          <p className="footer-line">سفر خوب، تحویل‌به‌تحویل<br />ساخته می‌شود.</p>
          <div className="footer-nav"><span className="font-mono">مسیرتان را پیدا کنید</span><a href="#services">آنچه جابه‌جا می‌کنیم</a><a href="#approach">روش کار</a><a href="#contact">تماس با ما</a></div>
          <div className="footer-bottom"><span>© {year} شرکت الموت</span><span>الهام از ایران، ساخته برای آینده.</span><a href="#top">بازگشت به بالا ↑</a></div>
        </footer>
      </section>

      {entryOpen && (
        <div className="entry-layer" role="dialog" aria-modal="true" aria-labelledby="entry-title">
          <button className="entry-scrim" aria-label="بستن" onClick={() => setEntryOpen(false)} />
          <div className="entry-card">
            <p className="font-mono">ورود به الموت</p>
            <h2 id="entry-title" className="font-display">کدام پنل را می‌خواهید؟</h2>
            <a className="entry-choice" href="/driver">ورود رانندگان <ArrowUpLeft size={18} /></a>
            <a className="entry-choice" href="/owner/login">ورود صاحب کالا <ArrowUpLeft size={18} /></a>
            <button type="button" className="entry-close" onClick={() => setEntryOpen(false)}>بستن</button>
          </div>
        </div>
      )}
    </main>
  );
}


export default Home;
