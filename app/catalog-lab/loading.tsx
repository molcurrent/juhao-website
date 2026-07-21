import { SiteHeader } from "@/components/layout/SiteHeader";

export default function CatalogLabLoading() {
  return (
    <>
      <SiteHeader />
      <main
        id="main-content"
        className="catalogLab-page catalogLab-loadingPage"
        aria-busy="true"
      >
        <div className="catalogLab-loadingCopy" />
        <div className="catalogLab-loadingVisual" />
        <span className="catalogLab-srOnly">正在载入产品目录</span>
      </main>
    </>
  );
}
