export const metadata = {
  title: "ثبت‌نام در الموت",
  robots: { index: false, follow: false },
};
import Auth from "@/components/auth";
import { Suspense } from "react";
export default function Register() {
  return (
    <Suspense>
      <Auth register />
    </Suspense>
  );
}
