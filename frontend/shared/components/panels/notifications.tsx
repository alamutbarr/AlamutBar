"use client";
import { ago, type Page } from "@/lib/api";
import type { Mutate, Notice } from "@/lib/workspace-types";
import { ArrowLeft, Bell, Check } from "lucide-react";
import Link from "@/lib/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Empty } from "../ui";
export default function Notifications({
  notices,
  busy,
  mutate,
  base,
  pager,
}: {
  notices: Page<Notice>;
  busy: boolean;
  mutate: Mutate;
  base: string;
  pager: (count: number) => ReactNode;
}) {
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || !notices.results.some((item) => !item.read)) return;
    marked.current = true;
    void mutate("notifications/read_all/", {}, "");
  }, [notices]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>اعلان‌های شما</h1>
          <p>خبرهای مرتبط با محموله‌ها و مراحل حمل</p>
        </div>
        <button
          className="secondary-btn"
          disabled={busy}
          onClick={() => mutate("notifications/read_all/", {})}
        >
          <Check size={17} />
          همه را خواندم
        </button>
      </div>
      <section className="card">
        {notices.results.length ? (
          notices.results.map((n) => (
            <div className={"notice " + (!n.read ? "unread" : "")} key={n.id}>
              <span className="notice-icon">
                <Bell size={20} />
              </span>
              <div>
                <b>{n.title}</b>
                {n.body && <p>{n.body}</p>}
                <small>{ago(n.created_at)}</small>
              </div>
              {n.shipment && (
                <Link
                  className="text-link"
                  href={base + "/shipments/" + n.shipment}
                >
                  مشاهده
                  <ArrowLeft size={15} />
                </Link>
              )}
            </div>
          ))
        ) : (
          <Empty
            title="همه‌چیز آرام است"
            text="اعلان‌های جدید در این صفحه نمایش داده می‌شوند."
          />
        )}
        {pager(notices.count)}
      </section>
    </>
  );
}
