import type { Metadata } from "next";
import { EnglishExperience } from "@/features/en/EnglishExperience";

export const metadata: Metadata = {
  title: "JUHAO | Lighting for considered spaces",
  description: "A private English preview of the JUHAO lighting experience.",
  alternates: { canonical: "/en" },
  robots: { index: false, follow: false },
};

export default function EnglishHomePage() {
  return <EnglishExperience />;
}
