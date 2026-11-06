import { Link } from 'react-router-dom';

function scrollPanelHome() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('main, .admin-main, .inspector-main').forEach((node) => {
    if (typeof node.scrollTo === 'function') node.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

export default function BrandMark({ light = false, subtitle = 'پنل صاحب کالا', to }) {
  const className = `flex items-center gap-2.5 ${light ? 'text-[#f7f6f0]' : 'text-[#17383b]'} ${to ? 'cursor-pointer rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2' : ''}`;
  const inner = (
    <>
      <span className="block h-9 w-9 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none" className="h-full w-full stroke-current" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="bevel">
          <path d="M5 28.5 17.5 8l7.1 11.8L30 10l5 8.7v9.8H5Z" />
          <path d="M5 28.5h30M12 21l4.6 7.5M24.4 20l5.6 8.5" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <strong className="text-[15px] font-extrabold tracking-[0.18em]">ALAMUT</strong>
        <small className="mt-1.5 text-[11px] font-medium opacity-70">{subtitle}</small>
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} onClick={scrollPanelHome} className={className} aria-label={`خانه ${subtitle}`}>
        {inner}
      </Link>
    );
  }

  return <span className={className}>{inner}</span>;
}
