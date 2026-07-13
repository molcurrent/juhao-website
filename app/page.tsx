import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/features/home/HomePage";
import { products } from "@/content/products";
import { isIndexableRoute, isPublishedRoute } from "@/content/publication-ledger";

const homeIndexable = isIndexableRoute("/");

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: {
    index: homeIndexable,
    follow: true,
    googleBot: {
      index: homeIndexable,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function Page() {
  if (!isPublishedRoute("/")) notFound();
  return <HomePage publishedProductCount={products.length} />;
}
