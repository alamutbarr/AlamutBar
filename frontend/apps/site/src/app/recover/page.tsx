import { Suspense } from "react";
import Recovery from "@/components/recovery";
export const metadata = {
  title: "بازیابی حساب",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function Page() {
  return (
    <Suspense>
      <Recovery />
    </Suspense>
  );
}
