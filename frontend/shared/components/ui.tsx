"use client";
import { statuses } from "@/lib/api";
import { siteHref } from "@/lib/deployment-links";
import {
  ArrowUpLeft,
  LoaderCircle,
  Mountain,
  PackageOpen,
  X,
} from "lucide-react";
import Link from "@/lib/navigation";
import { useEffect, useId, useRef, type ReactNode } from "react";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href={siteHref("/")}
      className={"brand " + (light ? "light" : "")}
      aria-label="الموت، صفحه اصلی"
    >
      <Mountain size={34} strokeWidth={1.25} />
      <span>
        <b>ALAMUT</b>
        <small>حمل‌ونقل و لجستیک</small>
      </span>
    </Link>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={"badge " + status}>
      <i />
      {statuses[status] ||
        (
          {
            paid: "تسویه شده",
            unpaid: "پرداخت نشده",
            open: "باز",
            closed: "بسته",
            reviewed: "بررسی شد",
            resolved: "حل شد",
            rejected: "رد شد",
          } as Record<string, string>
        )[status] ||
        status}
    </span>
  );
}
export function Empty({
  title = "هنوز موردی ثبت نشده",
  text = "اطلاعات تازه اینجا نمایش داده می‌شود.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <PackageOpen size={42} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" /> در حال دریافت اطلاعات…
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    d?.showModal();
    return () => {
      d?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={["modal", wide && "wide", className].filter(Boolean).join(" ")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const { left, right, top, bottom } =
          e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < left ||
          e.clientX > right ||
          e.clientY < top ||
          e.clientY > bottom
        )
          onClose();
      }}
      aria-labelledby={titleId}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="بستن"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ArrowLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpLeft size={18} />
    </Link>
  );
}
