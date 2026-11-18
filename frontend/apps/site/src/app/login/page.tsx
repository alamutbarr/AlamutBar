export const metadata = {
  title: "ورود به سامانه",
  robots: { index: false, follow: false },
};
import Auth from "@/components/auth";
import { Suspense } from "react";
export default function Login() {
  return (
    <Suspense>
      <Auth />
    </Suspense>
  );
}
