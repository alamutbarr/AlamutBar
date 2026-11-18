import InfoPage from "@/components/info-page";
import { infoPages } from "@/lib/public-content";
const data = infoPages["terms"];
export const metadata = {
  title: data.title,
  description: data.description,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: data.title,
    description: data.description,
    url: "/terms",
  },
};
export default function Page() {
  return <InfoPage slug="terms" />;
}
