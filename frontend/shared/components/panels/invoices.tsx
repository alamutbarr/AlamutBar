"use client";
import {
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "@/lib/navigation";
import { api, date, money, number, type Page, type Role } from "@/lib/api";
import type { Dash, Invoice, ModalState } from "@/lib/workspace-types";
import { Badge, Empty, Modal } from "../ui";
import { ActionForm } from "../forms";
export default function Finance({
  invoices,
  dash,
  role,
  base,
  pager,
  reload,
}: {
  invoices: Page<Invoice>;
  dash: Dash | null;
  role: Role;
  base: string;
  pager: (n: number) => ReactNode;
  reload: () => Promise<void>;
  setModal: Dispatch<SetStateAction<ModalState | undefined>>;
}) {
  const [selected, setSelected] = useState<Invoice | null>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>حسابداری و تسویه محموله‌ها</h1>
          <p>پرداخت‌های جزئی، مانده حساب و مرجع هر تراکنش ثبت‌شده</p>
        </div>
      </div>
      <div className="financial-summary">
        <div>
          <span>مجموع دریافتی ثبت‌شده</span>
          <strong>{money(dash?.revenue || 0)}</strong>
        </div>
        <div>
          <span>مانده قابل تسویه</span>
          <strong>{money(dash?.unpaid || 0)}</strong>
        </div>
      </div>
      <section className="card">
        <div className="card-head">
          <h2>صورتحساب‌ها</h2>
          <small>مبالغ به تومان · ثبت حسابداری پرداخت انجام‌شده</small>
        </div>
        {invoices.results.length ? (
          <div className="table-wrap app-records">
            <table role="table" aria-label="صورتحساب‌ها">
              <thead role="rowgroup">
                <tr role="row">
                  <th role="columnheader" scope="col">
                    محموله
                  </th>
                  <th role="columnheader" scope="col">
                    مسیر
                  </th>
                  <th role="columnheader" scope="col">
                    مبلغ کل
                  </th>
                  <th role="columnheader" scope="col">
                    ثبت پرداخت
                  </th>
                  <th role="columnheader" scope="col">
                    مانده
                  </th>
                  <th role="columnheader" scope="col">
                    وضعیت
                  </th>
                  <th role="columnheader" scope="col">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {invoices.results.map((i) => (
                  <tr role="row" key={i.id}>
                    <td role="cell">
                      <Link href={base + "/shipments/" + i.shipment}>
                        {i.code}
                      </Link>
                    </td>
                    <td role="cell" data-label="مسیر" data-wide="true">
                      {i.route}
                    </td>
                    <td role="cell" data-label="مبلغ کل">
                      {number(i.amount)}
                    </td>
                    <td role="cell" data-label="پرداخت‌شده">
                      {number(i.paid_total)}
                    </td>
                    <td role="cell" data-label="مانده">
                      {number(i.balance)}
                    </td>
                    <td role="cell" data-label="وضعیت">
                      {i.paid_total > 0 && i.balance > 0 ? (
                        <span className="badge pending">پرداخت بخشی</span>
                      ) : (
                        <Badge status={i.status} />
                      )}
                    </td>
                    <td role="cell" data-actions="true">
                      <button
                        className="secondary-btn"
                        onClick={() => setSelected(i)}
                      >
                        جزئیات حساب
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="صورتحسابی صادر نشده است" />
        )}
        {pager(invoices.count)}
      </section>
      {selected && (
        <Modal
          title={"حساب محموله " + selected.code}
          onClose={() => setSelected(null)}
        >
          <p className="info-note">
            مبلغ کل: {money(selected.amount)} · مانده: {money(selected.balance)}
          </p>
          <h3>تاریخچه پرداخت‌ها</h3>
          {selected.payments.length ? (
            selected.payments.map((p) => (
              <div className="list-row" key={p.id}>
                <b>{money(p.amount)}</b>
                <span>{p.reference}</span>
                <small>{date(p.created_at)}</small>
              </div>
            ))
          ) : (
            <p className="muted">
              {selected.status === "paid"
                ? "تسویه اولیه: " + selected.reference
                : "پرداختی ثبت نشده است."}
            </p>
          )}
          {role === "operator" && selected.balance > 0 && (
            <ActionForm
              fields={[
                {
                  name: "amount",
                  label: "مبلغ پرداخت انجام‌شده (تومان)",
                  type: "number",
                  min: 1,
                  max: selected.balance,
                  value: selected.balance,
                  required: true,
                  full: true,
                },
                {
                  name: "reference",
                  label: "مرجع پرداخت",
                  required: true,
                  full: true,
                  maxLength: 100,
                },
              ]}
              submit="ثبت پرداخت"
              onSubmit={async (d) => {
                await api("invoices/" + selected.id + "/payments/", "POST", d);
                await reload();
                setSelected(null);
              }}
            >
              <p className="info-note">
                انتقال وجه توسط این دکمه انجام نمی‌شود. مبلغ و شماره مرجع پرداخت
                واقعی را ثبت کنید. ثبت مرجع تکراری و مبلغ بیشتر از مانده پذیرفته
                نمی‌شود.
              </p>
            </ActionForm>
          )}
        </Modal>
      )}
    </>
  );
}
