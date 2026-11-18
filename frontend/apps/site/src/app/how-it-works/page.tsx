import InfoPage from "@/components/info-page";
import { infoPages } from "@/lib/public-content";
const data = infoPages["how-it-works"];
export const metadata = {
  title: data.title,
  description: data.description,
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: data.title,
    description: data.description,
    url: "/how-it-works",
  },
};
export default function Page() {
  return <InfoPage slug="how-it-works" />;
}
