import InfoPage from "@/components/info-page";
import { infoPages } from "@/lib/public-content";
const data = infoPages["about"];
export const metadata = {
  title: data.title,
  description: data.description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: data.title,
    description: data.description,
    url: "/about",
  },
};
export default function Page() {
  return <InfoPage slug="about" />;
}
