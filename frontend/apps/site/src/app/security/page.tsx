import InfoPage from "@/components/info-page";
import { infoPages } from "@/lib/public-content";
const data = infoPages["security"];
export const metadata = {
  title: data.title,
  description: data.description,
  alternates: { canonical: "/security" },
  openGraph: {
    title: data.title,
    description: data.description,
    url: "/security",
  },
};
export default function Page() {
  return <InfoPage slug="security" />;
}
