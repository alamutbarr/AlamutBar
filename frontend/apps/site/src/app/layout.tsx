import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { siteUrl } from "@/lib/seo";
import "@/styles/globals.css";
import "@/styles/mobile-workspace.css";
import "./public-site.css";
import InputNormalizer from "@/components/input-normalizer";
const vazir = localFont({
  src: [
    { path: "../../public/fonts/Vazirmatn-Regular.woff2", weight: "400" },
    { path: "../../public/fonts/Vazirmatn-Medium.woff2", weight: "500" },
    { path: "../../public/fonts/vazirmatn-semibold.ttf", weight: "600" },
    { path: "../../public/fonts/Vazirmatn-Bold.woff2", weight: "700" },
  ],
  variable: "--font-vazir",
  display: "swap",
  preload: true,
});
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#183e46",
};
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  title: { default: "الموت | مسیر مطمئن، حمل هوشمند", template: "%s | الموت" },
  description:
    "سامانه یکپارچه مدیریت حمل‌ونقل الموت؛ از درخواست حمل تا تخصیص ناوگان، بازرسی و تحویل.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "الموت",
    title: "الموت | مسیر مطمئن، حمل هوشمند",
    description: "مدیریت یکپارچه حمل، ناوگان، بازرسی و پیگیری محموله.",
    images: [{ url: "/alamut-road.jpg", alt: "حمل‌ونقل و لجستیک الموت" }],
  },
  twitter: { card: "summary_large_image", images: ["/alamut-road.jpg"] },
  formatDetection: { telephone: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fa"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={vazir.variable}
    >
      <body>
        <InputNormalizer />
        <a href="#main" className="skip">
          رفتن به محتوای اصلی
        </a>
        {children}
      </body>
    </html>
  );
}
