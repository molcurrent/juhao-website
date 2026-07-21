import type { ReactNode } from "react";

/* Catalog styles stay route-local so the private sample cannot inflate public bundles. */
/* eslint-disable @next/next/no-css-tags */

export default function CatalogLabLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <link rel="stylesheet" href="/catalog-lab/styles?v=20260721-full-review" />
      {children}
    </>
  );
}
