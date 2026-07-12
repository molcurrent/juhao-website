"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PageData } from "@/app/_data/pages";
import { siteApi, type ProductCard } from "@/lib/api";
import { gsap, motionEase, useGSAP } from "@/lib/motion/gsap";
import styles from "./BusinessScenePage.module.css";

export type BusinessSceneId =
  | "residential"
  | "hospitality"
  | "commercial"
  | "public"
  | "industrial";

export type BusinessScenePageProps = {
  page: PageData;
  sceneId: BusinessSceneId;
};

type ProductsState = "loading" | "success" | "error";

type ProductsResult = {
  key: string;
  products: ProductCard[];
  status: ProductsState;
};

const scenes: { id: BusinessSceneId; label: string; href: string }[] = [
  { id: "residential", label: "全屋照明", href: "/solutions/residential" },
  { id: "hospitality", label: "酒店照明", href: "/solutions/hospitality" },
  { id: "commercial", label: "商业照明", href: "/solutions/commercial" },
  { id: "public", label: "公共照明", href: "/solutions/public" },
  { id: "industrial", label: "工业照明", href: "/solutions/industrial" },
];

function SceneHero({ page }: { page: PageData }) {
  return (
    <section className={styles.hero} aria-labelledby="business-scene-title">
      <div className={styles.heroMedia} aria-hidden="true">
        <Image src={page.image} alt="" fill priority unoptimized sizes="100vw" />
      </div>
      <div className={styles.heroShade} />
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroContent}>
        <nav className={styles.breadcrumbs} aria-label="面包屑">
          <Link href="/">首页</Link>
          <span aria-hidden="true">/</span>
          <Link href="/solutions">照明解决方案</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{page.label}</span>
        </nav>
        <p className={styles.eyebrow}><i aria-hidden="true" />{page.eyebrow}</p>
        <h1 id="business-scene-title">{page.title}</h1>
        <p className={styles.heroIntro}>{page.intro}</p>
      </div>
      <p className={styles.heroIndex} aria-hidden="true">JUHAO / LIGHTING</p>
    </section>
  );
}

function SceneNavigation({ sceneId }: { sceneId: BusinessSceneId }) {
  return (
    <nav className={styles.sceneNavigation} aria-label="照明场景分类">
      <div className={styles.sceneNavigationInner}>
        {scenes.map((scene, index) => {
          const active = scene.id === sceneId;
          return (
            <Link
              className={`${styles.sceneLink} ${active ? styles.sceneLinkActive : ""}`}
              href={scene.href}
              aria-current={active ? "page" : undefined}
              key={scene.id}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <span>{scene.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SolutionHighlights({ page }: { page: PageData }) {
  return (
    <>
      <section className={styles.highlights} aria-labelledby="scene-highlights-title">
        <header className={styles.sectionHeading}>
          <p>SCENE FOCUS</p>
          <h2 id="scene-highlights-title">从真实空间出发</h2>
        </header>
        <div className={styles.highlightGrid}>
          {page.highlights.map((item, index) => (
            <article className={styles.highlightCard} key={item.title}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.solutionDetails} aria-label="方案要点">
        {page.sections.map((section, index) => (
          <article className={styles.solutionDetail} key={section.title}>
            <p className={styles.detailNumber}>{String(index + 1).padStart(2, "0")}</p>
            <div>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
              {section.points && (
                <ul>
                  {section.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function SceneFaq({ faqs }: { faqs: NonNullable<PageData["faqs"]> }) {
  return (
    <section className={styles.faq} aria-labelledby="scene-faq-title">
      <header className={styles.faqHeading}>
        <p>PLANNING FAQ</p>
        <h2 id="scene-faq-title">方案规划常见问题</h2>
      </header>
      <div className={styles.faqList}>
        {faqs.map((faq, index) => (
          <details className={styles.faqItem} key={faq.question}>
            <summary>
              <small aria-hidden="true">{String(index + 1).padStart(2, "0")}</small>
              <span>{faq.question}</span>
              <i className={styles.faqToggle} aria-hidden="true" />
            </summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function ProductDialog({
  product,
  dialogRef,
  closeButtonRef,
  onClose,
}: {
  product: ProductCard;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="business-product-title"
      aria-describedby="business-product-description"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <button
        className={styles.dialogClose}
        ref={closeButtonRef}
        type="button"
        onClick={() => dialogRef.current?.close()}
        aria-label="关闭产品详情"
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className={styles.dialogImage}>
        <Image src={product.image} alt={product.name} fill unoptimized sizes="(max-width: 720px) 90vw, 42vw" />
      </div>
      <div className={styles.dialogContent}>
        <p className={styles.productCategory}>{product.category}</p>
        <h2 id="business-product-title">{product.name}</h2>
        <p id="business-product-description">{product.summary}</p>
        <div className={styles.dataNotice}>
          <strong>资料说明</strong>
          <p>当前未发布具体型号与产品参数，正式信息以钜豪核验资料为准。</p>
        </div>
      </div>
    </dialog>
  );
}

function ProductSection({
  products,
  status,
  onRetry,
  onOpen,
}: {
  products: ProductCard[];
  status: ProductsState;
  onRetry: () => void;
  onOpen: (product: ProductCard, trigger: HTMLButtonElement) => void;
}) {
  return (
    <section className={styles.products} aria-labelledby="scene-products-title">
      <header className={styles.productsHeading}>
        <div>
          <p>PRODUCT DIRECTIONS</p>
          <h2 id="scene-products-title">场景产品组合</h2>
        </div>
        <p>产品数据通过可替换的数据层加载；具体型号、参数与适用条件以企业确认资料为准。</p>
      </header>

      <div className={styles.productState} aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" && (
          <div className={styles.loadingGrid} aria-label="正在加载产品">
            {[0, 1, 2].map((item) => <span key={item} />)}
          </div>
        )}

        {status === "error" && (
          <div className={styles.stateMessage} role="alert">
            <strong>产品数据暂时无法加载</strong>
            <p>请稍后重试。</p>
            <button type="button" onClick={onRetry}>重新加载</button>
          </div>
        )}

        {status === "success" && products.length === 0 && (
          <div className={styles.stateMessage}>
            <strong>该场景的产品资料正在整理</strong>
            <p>当前没有可展示的已接入产品。</p>
          </div>
        )}

        {status === "success" && products.length > 0 && (
          <div className={styles.productGrid}>
            {products.map((product, index) => (
              <article className={styles.productCard} key={product.id}>
                <div className={styles.productImage}>
                  <Image src={product.image} alt={product.name} fill unoptimized sizes="(max-width: 760px) 100vw, 33vw" />
                </div>
                <div className={styles.productCopy}>
                  <small>{product.category} / {String(index + 1).padStart(2, "0")}</small>
                  <h3>{product.name}</h3>
                  <p>{product.summary}</p>
                  <button type="button" onClick={(event) => onOpen(product, event.currentTarget)}>
                    查看详情 <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function BusinessScenePage({ page, sceneId }: BusinessScenePageProps) {
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestKey = `${sceneId}:${retryKey}`;
  const [productResult, setProductResult] = useState<ProductsResult>({
    key: requestKey,
    products: [],
    status: "loading",
  });
  const [selectedProduct, setSelectedProduct] = useState<ProductCard | null>(null);
  const products = productResult.key === requestKey ? productResult.products : [];
  const status: ProductsState = productResult.key === requestKey ? productResult.status : "loading";

  useEffect(() => {
    let active = true;

    siteApi.getProducts(sceneId).then(
      (nextProducts) => {
        if (!active) return;
        setProductResult({ key: requestKey, products: nextProducts, status: "success" });
      },
      () => {
        if (!active) return;
        setProductResult({ key: requestKey, products: [], status: "error" });
      },
    );

    return () => { active = false; };
  }, [requestKey, sceneId]);

  useEffect(() => {
    if (!selectedProduct || !dialogRef.current) return;
    if (!dialogRef.current.open) dialogRef.current.showModal();
    closeButtonRef.current?.focus();
  }, [selectedProduct]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const timeline = gsap.timeline({ defaults: { duration: 0.72, ease: motionEase } });
      timeline
        .from(`.${styles.heroMedia}`, { opacity: 0, scale: 1.04, duration: 1.1 })
        .from(`.${styles.breadcrumbs}, .${styles.eyebrow}`, { opacity: 0, y: 18, stagger: 0.08 }, 0.12)
        .from(`.${styles.heroContent} h1, .${styles.heroIntro}`, { opacity: 0, y: 34, stagger: 0.1 }, 0.2)
        .from(`.${styles.sceneLink}`, { opacity: 0, y: 18, stagger: 0.06 }, 0.42)
        .from(`.${styles.highlightCard}`, { opacity: 0, y: 28, stagger: 0.08 }, 0.54);
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      if (status !== "success" || products.length === 0) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(`.${styles.productCard}`, {
        opacity: 0,
        y: 28,
        duration: 0.65,
        stagger: 0.08,
        ease: motionEase,
      });
    },
    { scope: rootRef, dependencies: [products.length, sceneId, status], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      if (!selectedProduct || !dialogRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(dialogRef.current, { opacity: 0, scale: 0.97, y: 18, duration: 0.38, ease: motionEase });
    },
    { scope: rootRef, dependencies: [selectedProduct?.id], revertOnUpdate: true },
  );

  const openProduct = useCallback((product: ProductCard, trigger: HTMLButtonElement) => {
    openerRef.current = trigger;
    setSelectedProduct(product);
  }, []);

  const closeProduct = useCallback(() => {
    setSelectedProduct(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  }, []);

  return (
    <main className={styles.page} id="main-content" ref={rootRef}>
      <SceneHero page={page} />
      <SceneNavigation sceneId={sceneId} />
      <SolutionHighlights page={page} />
      {page.faqs?.length ? <SceneFaq faqs={page.faqs} /> : null}
      <ProductSection
        products={products}
        status={status}
        onRetry={() => setRetryKey((key) => key + 1)}
        onOpen={openProduct}
      />
      {selectedProduct && (
        <ProductDialog
          product={selectedProduct}
          dialogRef={dialogRef}
          closeButtonRef={closeButtonRef}
          onClose={closeProduct}
        />
      )}
    </main>
  );
}
