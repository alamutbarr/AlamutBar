"use client";
import Security from "./security";
import { api, roles, vehicles, type Role, type User } from "@/lib/api";
import type { Vehicle } from "@/lib/workspace-types";
import type { Dispatch, SetStateAction } from "react";
import { ActionForm } from "../forms";
import { OwnerKycForm } from "../owner-identity";
import { PageTitle } from "./shared";
export default function Account({
  user,
  role,
  vehicle,
  setVehicle,
  setUser,
  setToast,
}: {
  user: User;
  role: Role;
  vehicle: Vehicle | null;
  setVehicle: Dispatch<SetStateAction<Vehicle | null>>;
  setUser: Dispatch<SetStateAction<User | null>>;
  setToast: Dispatch<SetStateAction<string>>;
}) {
  return (
    <>
      <PageTitle
        title="حساب کاربری شما"
        text="اطلاعات همکاری و تنظیمات امنیت حساب"
      />
      <div className="settings-grid">
        <Security />
        <section className="card form-card">
          <h2>اطلاعات شخصی</h2>
          <div className="profile-summary">
            {user.avatar_url ? (
              <img className="avatar large" src={user.avatar_url} alt="" />
            ) : (
              <span className="avatar large">{user.first_name?.[0] || "م"}</span>
            )}
            <div>
              <b>{user.name || user.username}</b>
              <p>
                {roles[role]} ·{" "}
                {user.verified ? "احراز شده" : "در انتظار احراز"}
              </p>
              {role === "owner" && <p>موبایل: {user.phone}</p>}
              <label className="text-link">
                تصویر پروفایل
                <input
                  className="sr-only"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const data = new FormData();
                    data.set("file", file);
                    void api<User>("auth/avatar/", "POST", data)
                      .then(setUser)
                      .then(() => setToast("تصویر پروفایل ذخیره شد."))
                      .catch((reason) => setToast((reason as Error).message));
                  }}
                />
              </label>
            </div>
          </div>
          <ActionForm
            fields={[
              {
                name: "first_name",
                label: "نام",
                value: user.first_name,
                required: true,
              },
              {
                name: "last_name",
                label: "نام خانوادگی",
                value: user.last_name,
                required: true,
              },
              ...(role === "owner"
                ? []
                : [
                    {
                      name: "phone",
                      label: "موبایل",
                      type: "tel",
                      value: user.phone,
                      required: true,
                    },
                  ]),
              {
                name: "email",
                label: "ایمیل",
                type: "email",
                value: user.email,
              },
              {
                name: "company",
                label: "شرکت",
                value: user.company,
                full: true,
              },
              ...(role === "owner"
                ? [
                    {
                      name: "national_id",
                      label: "کد ملی",
                      value: user.national_id,
                      maxLength: 10,
                      placeholder: "۱۰ رقم",
                    },
                    {
                      name: "postal_code",
                      label: "کد پستی",
                      value: user.postal_code,
                      maxLength: 10,
                      placeholder: "۱۰ رقم",
                    },
                  ]
                : []),
            ]}
            onSubmit={async (d) => {
              setUser(await api("auth/me/", "PATCH", d));
              setToast("اطلاعات حساب ذخیره شد.");
            }}
            />
        </section>
        {role === "owner" && (
          <OwnerKycForm user={user} onChange={setUser} />
        )}
        <section className="card form-card">
          <h2>تغییر رمز عبور</h2>
          <p className="muted">از رمز طولانی و غیرتکراری استفاده کنید.</p>
          <ActionForm
            fields={[
              {
                name: "old_password",
                label: "رمز فعلی",
                type: "password",
                required: true,
                full: true,
              },
              {
                name: "new_password",
                label: "رمز جدید",
                type: "password",
                required: true,
                full: true,
              },
            ]}
            submit="ذخیره رمز جدید"
            onSubmit={async (d) => {
              await api("auth/password/", "POST", d);
              setToast("رمز عبور تغییر کرد.");
            }}
          />
        </section>
        {role === "driver" && (
          <section className="card form-card full">
            <h2>خودرو و آمادگی حمل</h2>
            <ActionForm
              fields={[
                {
                  name: "kind",
                  label: "نوع خودرو",
                  value: vehicle?.kind,
                  options: Object.entries(vehicles).map(([value, label]) => ({
                    value,
                    label,
                  })),
                  required: true,
                },
                {
                  name: "plate",
                  label: "شماره پلاک",
                  value: vehicle?.plate,
                  required: true,
                  maxLength: 25,
                },
                {
                  name: "capacity",
                  label: "ظرفیت (تن)",
                  type: "number",
                  min: 0.1,
                  value: vehicle?.capacity,
                  required: true,
                },
                {
                  name: "license_number",
                  label: "شماره گواهینامه",
                  value: vehicle?.license_number,
                  required: true,
                  maxLength: 40,
                },
                {
                  name: "available",
                  label: "آمادگی حمل",
                  value: String(vehicle?.available ?? true),
                  required: true,
                  options: [
                    { value: "true", label: "آماده دریافت بار" },
                    { value: "false", label: "فعلاً در دسترس نیستم" },
                  ],
                },
              ]}
              onSubmit={async (d) => {
                setVehicle(
                  await api("vehicle/", "PUT", {
                    ...d,
                    available: d.available === "true",
                  }),
                );
                setToast("اطلاعات خودرو ذخیره شد.");
              }}
            />
          </section>
        )}
      </div>
    </>
  );
}
