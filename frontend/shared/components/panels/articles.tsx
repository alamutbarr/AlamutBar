"use client";
import { useEffect, useState } from "react";
import { api, date, type Page } from "@/lib/api";
import { siteHref } from "@/lib/deployment-links";
import { ActionForm } from "../forms";
import { Empty, Loading, Modal } from "../ui";
import { PanelError, usePanelRefresh } from "../panel-feedback";
type Article = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  status: string;
  published_at: string | null;
};
export default function Editorial() {
  const [items, setItems] = useState<Page<Article> | null>(null),
    [selected, setSelected] = useState<Article | "new" | null>(null),
    [error, setError] = useState<unknown>(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  async function load() {
    try {
      setItems(
        await api(
          "editorial/articles/?page=" +
            page +
            "&q=" +
            encodeURIComponent(search),
        ),
      );
      setError(null);
    } catch (e) {
      setError(e);
    }
  }
  useEffect(() => {
    void load();
  }, [page, search]);
  usePanelRefresh(load);
  if (error) return <PanelError error={error} retry={() => void load()} />;
  if (!items) return <Loading />;
  const value = (name: keyof Article) =>
    selected && selected !== "new" ? String(selected[name] ?? "") : "";
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">مرکز محتوا</span>
          <h1>مقالات و راهنماها</h1>
          <p>پیش‌نویس، ویرایش و انتشار محتوای عمومی سایت</p>
        </div>
        <button className="btn" onClick={() => setSelected("new")}>
          مقاله جدید
        </button>
      </div>
      <section className="card">
        <div className="list-toolbar">
          <label>
            جست‌وجوی عنوان
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </label>
        </div>
        <div className="table-wrap app-records">
          <table role="table" aria-label="مقالات">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  مقاله
                </th>
                <th role="columnheader" scope="col">
                  دسته‌بندی
                </th>
                <th role="columnheader" scope="col">
                  وضعیت
                </th>
                <th role="columnheader" scope="col">
                  تاریخ انتشار
                </th>
                <th role="columnheader" scope="col">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {items.results.map((a) => (
                <tr role="row" key={a.id}>
                  <td role="cell">
                    <b>{a.title}</b>
                    <small className="block muted" dir="ltr">
                      {a.slug}
                    </small>
                  </td>
                  <td role="cell" data-label="دسته‌بندی">
                    {a.category}
                  </td>
                  <td role="cell" data-label="وضعیت">
                    {a.status === "draft"
                      ? "پیش‌نویس"
                      : a.published_at && new Date(a.published_at) > new Date()
                        ? "زمان‌بندی‌شده"
                        : "منتشرشده"}
                  </td>
                  <td role="cell" data-label="انتشار">
                    {a.published_at ? date(a.published_at) : "—"}
                  </td>
                  <td role="cell" data-actions="true">
                    <button
                      className="secondary-btn"
                      onClick={() => setSelected(a)}
                    >
                      ویرایش مقاله
                    </button>
                    {a.status === "published" &&
                      a.published_at &&
                      new Date(a.published_at) <= new Date() && (
                        <a
                          className="text-link"
                          target="_blank"
                          rel="noopener"
                          href={siteHref("/articles/" + a.slug)}
                        >
                          نمایش عمومی
                        </a>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.count && <Empty title="مقاله‌ای یافت نشد" />}
        <div className="pagination">
          <span>صفحه {page.toLocaleString("fa-IR")}</span>
          <button
            className="secondary-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            قبلی
          </button>
          <button
            className="secondary-btn"
            disabled={!items.next}
            onClick={() => setPage(page + 1)}
          >
            بعدی
          </button>
        </div>
      </section>
      {selected && (
        <Modal
          wide
          title={selected === "new" ? "مقاله جدید" : "ویرایش مقاله"}
          onClose={() => setSelected(null)}
        >
          <p className="info-note">
            متن ساده بنویسید. برای تیتر بخش از «## عنوان» در ابتدای خط استفاده
            کنید. محتوای HTML اجرا نمی‌شود. پیش‌نویس برای عموم قابل مشاهده نیست.
          </p>
          <ActionForm
            fields={[
              {
                name: "title",
                label: "عنوان مقاله",
                required: true,
                full: true,
                value: value("title"),
                maxLength: 180,
              },
              {
                name: "slug",
                label: "نشانی انگلیسی یکتا",
                required: true,
                value: value("slug"),
                maxLength: 180,
                placeholder: "freight-guide",
              },
              {
                name: "category",
                label: "دسته‌بندی",
                required: true,
                value: value("category") || "راهنمای حمل",
                maxLength: 60,
              },
              {
                name: "summary",
                label: "خلاصه برای فهرست و سئو",
                required: true,
                type: "textarea",
                full: true,
                value: value("summary"),
                maxLength: 350,
              },
              {
                name: "body",
                label: "متن مقاله",
                required: true,
                type: "textarea",
                full: true,
                value: value("body"),
                maxLength: 50000,
              },
              {
                name: "status",
                label: "وضعیت انتشار",
                required: true,
                value: value("status") || "draft",
                options: [
                  { value: "draft", label: "پیش‌نویس" },
                  { value: "published", label: "انتشار عمومی" },
                ],
              },
            ]}
            submit="ذخیره مقاله"
            onSubmit={async (d) => {
              await api(
                selected === "new"
                  ? "editorial/articles/"
                  : "editorial/articles/" + selected.id + "/",
                selected === "new" ? "POST" : "PATCH",
                d,
              );
              setSelected(null);
              await load();
            }}
          />
        </Modal>
      )}
    </>
  );
}
