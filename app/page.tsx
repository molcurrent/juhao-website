import type { Metadata } from "next";
import { HomePage } from "@/features/home/HomePage";
import { products } from "@/content/products";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function Page() {
  return <HomePage publishedProductCount={products.length} />;
}
