import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnglishExperience } from "@/features/en/EnglishExperience";

type Props = { params: Promise<{ slug: string[] }> };

const topLevelRoutes = new Set(["products", "projects", "solutions", "smart-home", "support", "resources", "about", "news", "contact"]);
const productRoutes = new Set(["aurora-ring", "aurora-orbit", "lumen-arc", "lumen-detail", "halo-sculpture", "halo-line"]);
const resourceRoutes = new Set(["layered-light", "smart-control", "commercial-light", "beam-angle", "dimming", "glare"]);

function isEnglishRoute(slug: string[]) {
  if (topLevelRoutes.has(slug[0]) && slug.length === 1) return true;
  if (slug[0] === "products" && slug.length === 2) return productRoutes.has(slug[1]);
  if (slug[0] === "resources" && slug.length === 2) return resourceRoutes.has(slug[1]);
  return false;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  if (!isEnglishRoute(slug)) return {};
  const title = slug[0] === "products" ? "JUHAO Collection" : slug[0] === "resources" ? "JUHAO Lighting Notes" : "JUHAO | Lighting for considered spaces";
  return { title, alternates: { canonical: `/en/${slug.join("/")}` }, robots: { index: false, follow: false } };
}

export default async function EnglishRoutePage({ params }: Props) {
  const slug = (await params).slug;
  if (!isEnglishRoute(slug)) notFound();
  return <EnglishExperience slug={slug} />;
}
