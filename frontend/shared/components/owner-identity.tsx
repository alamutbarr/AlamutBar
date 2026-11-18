"use client";
import { api, type Page, type User } from "@/lib/api";
import { useEffect, useState, type FormEvent } from "react";

type IdentityFile = { id: number; slot: string; url: string };
type Identity = {
  id: number;
  id_type: string;
  status: string;
  note: string;
  user_name: string;
  files: IdentityFile[];
};
const labels: Record<string, string> = {
  missing: "ناقص",
  pending: "در انتظار بررسی",
  approved: "تأیید شد",
  rejected: "رد شد",
};

export function OwnerKycForm({
  user,
  onChange,
}: {
  user: User;
  onChange: (user: User) => void;
}) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [idType, setIdType] = useState("national_card");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    void api<Page<Identity>>("owner-identity/")
      .then((page) => {
        const current = page.results[0];
        if (!alive || !current) return;
        setIdentity(current);
        setIdType(current.id_type || "national_card");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  async function saveType(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await api<Identity>("owner-identity/", "POST", {
        id_type: idType,
      });
      setIdentity(saved);
      onChange(await api<User>("auth/me/"));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(slot: "document" | "selfie", file: File) {
    if (!identity) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.set("slot", slot);
      data.set("file", file);
      setIdentity(
        await api<Identity>(
          "owner-identity/" + identity.id + "/files/",
          "POST",
          data,
        ),
      );
      onChange(await api<User>("auth/me/"));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card form-card">
      <h2>احراز هویت صاحب بار</h2>
      <p className="muted">
        وضعیت: {labels[user.kyc_status || identity?.status || "missing"]}
        {identity?.note ? " · " + identity.note : ""}
      </p>
      {user.kyc_status === "approved" ? (
        <p>هویت شما تأیید شده و می‌توانید بار ثبت کنید.</p>
      ) : (
        <form onSubmit={saveType} className="form-grid">
          <label className="full">
            نوع مدرک
            <select value={idType} onChange={(event) => setIdType(event.target.value)}>
              <option value="national_card">کارت ملی</option>
              <option value="birth_certificate">شناسنامه</option>
            </select>
          </label>
          <button className="btn" disabled={busy}>
            ذخیره نوع مدرک
          </button>
          {identity && (
            <>
              <label>
                تصویر مدرک
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload("document", file);
                  }}
                />
              </label>
              <label>
                سلفی با مدرک
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload("selfie", file);
                  }}
                />
              </label>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </section>
  );
}

export function OwnerKycReview() {
  const [rows, setRows] = useState<Identity[]>([]);
  const [note, setNote] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    void api<Page<Identity>>("owner-identity/")
      .then((page) => setRows(page.results))
      .catch((reason) => setError((reason as Error).message));
  }, []);
  async function review(id: number, status: "approved" | "rejected") {
    setError("");
    try {
      const saved = await api<Identity>(
        "owner-identity/" + id + "/review/",
        "POST",
        { status, note: note[id] || "" },
      );
      setRows((current) => current.map((row) => (row.id === id ? saved : row)));
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  return (
    <section className="card">
      <div className="page-heading">
        <div>
          <h1>احراز هویت صاحب‌بارها</h1>
          <p>مدرک و سلفی را ببینید و نتیجه را ثبت کنید.</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {rows.length === 0 && <p className="muted">درخواستی ثبت نشده است.</p>}
      {rows.map((row) => (
        <article className="list-row" key={row.id}>
          <div>
            <b>{row.user_name}</b>
            <p>
              {row.id_type === "birth_certificate" ? "شناسنامه" : "کارت ملی"} ·{" "}
              {labels[row.status] || row.status}
            </p>
            <p>
              {row.files.map((file) => (
                <a key={file.id} href={file.url}>
                  {file.slot === "selfie" ? "سلفی" : "مدرک"}{" "}
                </a>
              ))}
            </p>
          </div>
          {row.status === "pending" && (
            <div className="shipment-actions">
              <input
                value={note[row.id] || ""}
                maxLength={500}
                placeholder="یادداشت بررسی"
                onChange={(event) =>
                  setNote((current) => ({ ...current, [row.id]: event.target.value }))
                }
              />
              <button className="btn" onClick={() => void review(row.id, "approved")}>
                تأیید
              </button>
              <button
                className="danger-btn"
                onClick={() => void review(row.id, "rejected")}
              >
                رد
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

export function NationalIdGate({
  onSaved,
}: {
  onSaved: (user: User) => void;
}) {
  const [nationalId, setNationalId] = useState("");
  const [postal, setPostal] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="card form-card">
      <h1>کد ملی را کامل کنید</h1>
      <p>
        تا وقتی کد ملی معتبر نباشد، بقیه پنل صاحب بار بسته است. کد پستی را هم
        همین‌جا می‌توانید ثبت کنید.
      </p>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          void api<User>("auth/me/", "PATCH", {
            national_id: nationalId,
            postal_code: postal,
          })
            .then(onSaved)
            .catch((reason) => setError((reason as Error).message))
            .finally(() => setBusy(false));
        }}
      >
        <label>
          کد ملی *
          <input
            required
            dir="ltr"
            maxLength={10}
            value={nationalId}
            onChange={(event) => setNationalId(event.target.value)}
          />
        </label>
        <label>
          کد پستی
          <input
            dir="ltr"
            maxLength={10}
            value={postal}
            onChange={(event) => setPostal(event.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>
          ذخیره و ورود به پنل
        </button>
      </form>
    </section>
  );
}
