"use client";

/* eslint-disable @next/next/no-img-element */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CatalogV2FamilyIndex } from "@/content/catalog-v2.generated";
import { catalogImageUrlOrNull } from "@/lib/catalog-image";
import { consultationHref } from "@/lib/consultation";
import { loadFullPrivateCatalog } from "./catalogFullPrivate";

type Manifest = {
  source_product_count: number;
  derived_family_count: number;
  sample_family_count: number;
  categories_covered: string[];
};

const PAGE_SIZE = 24;
const MAX_COMPARE_ITEMS = 3;
const GROUPING_VALUES = new Set(["all", "family", "single"]);
const HTML_ENTITY_PATTERN = /&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/i;
type CatalogScope = "sample" | "full";
type FullLoadState = "idle" | "loading" | "ready" | "error";

const facetFilters = [
  { key: "spaces", label: "适用空间", emptyLabel: "全部空间" },
  { key: "areas", label: "适用面积", emptyLabel: "全部面积" },
  { key: "materials", label: "材质", emptyLabel: "全部材质" },
  { key: "styles", label: "风格", emptyLabel: "全部风格" },
  { key: "light_sources", label: "光源", emptyLabel: "全部光源" },
  { key: "dimensions", label: "尺寸", emptyLabel: "全部尺寸" },
] as const;

type FacetKey = (typeof facetFilters)[number]["key"];
type FacetSelections = Record<FacetKey, string>;
type FacetOptions = Record<FacetKey, string[]>;

const emptyFacetSelections = (): FacetSelections => ({
  spaces: "",
  areas: "",
  materials: "",
  styles: "",
  light_sources: "",
  dimensions: "",
});

function safeFacetValue(key: FacetKey, value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || /[\u0000-\u001f\u007f<>]/.test(normalized)) return null;
  if (HTML_ENTITY_PATTERN.test(normalized)) return null;
  return normalized;
}

function buildFacetOptions(items: CatalogV2FamilyIndex[]) {
  return facetFilters.reduce((options, { key }) => {
    options[key] = [
      ...new Set(
        items.flatMap((item) =>
          (item.facets[key] ?? [])
            .map((value) => safeFacetValue(key, value))
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    ].sort((left, right) =>
      left.localeCompare(right, "zh-CN", { numeric: true }),
    );
    return options;
  }, {} as FacetOptions);
}

function normalizeFacetSelections(
  selections: FacetSelections,
  options: FacetOptions,
) {
  return facetFilters.reduce((normalized, { key }) => {
    const value = safeFacetValue(key, selections[key] ?? "");
    normalized[key] = value && options[key].includes(value) ? value : "";
    return normalized;
  }, emptyFacetSelections());
}

function preserveSafeFacetSelections(selections: FacetSelections) {
  return facetFilters.reduce((normalized, { key }) => {
    normalized[key] = safeFacetValue(key, selections[key] ?? "") ?? "";
    return normalized;
  }, emptyFacetSelections());
}

export type CatalogLabInitialFilters = {
  scope: CatalogScope;
  query: string;
  category: string;
  grouping: string;
  facets: FacetSelections;
  page: number;
};

type FilterState = CatalogLabInitialFilters;

type FilterControlsProps = {
  categories: string[];
  category: string;
  grouping: string;
  query: string;
  resultCount: number | null;
  disabled?: boolean;
  onCategoryChange: (value: string) => void;
  onGroupingChange: (value: string) => void;
  onQueryChange: (value: string) => void;
};

type FacetControlsProps = {
  options: FacetOptions;
  selections: FacetSelections;
  onChange: (key: FacetKey, value: string) => void;
  disabled?: boolean;
};

type ActiveCondition = {
  id: string;
  label: string;
  value: string;
  onClear: () => void;
};

const comparisonFacets = [
  ["dimensions", "尺寸"],
  ["materials", "材质"],
  ["spaces", "适用空间"],
  ["areas", "适用面积"],
  ["styles", "风格"],
  ["light_sources", "光源"],
] as const;

function searchableText(item: CatalogV2FamilyIndex) {
  return [
    item.title,
    item.category,
    ...item.source_categories,
    item.model_label ?? "",
    item.representative.title,
    ...item.variant_refs.map((variant) => variant.model_label ?? ""),
    ...item.card_specs.flatMap((spec) => spec.values),
    ...Object.values(item.facets).flat(),
  ]
    .join(" ")
    .toLocaleLowerCase("zh-CN");
}

function categoryDisplay(item: CatalogV2FamilyIndex) {
  return item.category_state === "pending_owner_selection"
    ? `主分类待确认 · 来源：${item.source_categories.join(" / ")}`
    : item.category;
}

function matchesCatalogFilters(
  item: CatalogV2FamilyIndex,
  filters: {
    category: string;
    grouping: string;
    facets: FacetSelections;
    normalizedQuery: string;
  },
) {
  if (filters.category !== "all" && item.category !== filters.category) {
    return false;
  }
  if (
    filters.grouping === "family" &&
    item.grouping_status !== "auto_merged_shared_reference_image_set"
  ) {
    return false;
  }
  if (
    filters.grouping === "single" &&
    item.grouping_status !== "singleton_unreviewed"
  ) {
    return false;
  }
  if (
    !facetFilters.every(({ key }) => {
      const selected = filters.facets[key];
      if (!selected) return true;
      return (item.facets[key] ?? []).some(
        (value) => safeFacetValue(key, value) === selected,
      );
    })
  ) {
    return false;
  }
  return (
    !filters.normalizedQuery ||
    searchableText(item).includes(filters.normalizedQuery)
  );
}

function primaryImage(item: CatalogV2FamilyIndex) {
  return catalogImageUrlOrNull(item.representative.primary_image);
}

function ProductMedia({
  item,
  priority = false,
}: {
  item: CatalogV2FamilyIndex;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const image = failed ? null : primaryImage(item);
  return image ? (
    <img
      src={image}
      alt={item.representative.title}
      width="1200"
      height="900"
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className="catalogLab-mediaPlaceholder"
      role="img"
      aria-label={`${item.title} 主图未进入授权预览`}
    >
      <span>MEDIA HELD</span>
      <strong>主图未进入授权预览</strong>
      <small>仅展示已核对的来源字段</small>
    </div>
  );
}

function facetSummary(item: CatalogV2FamilyIndex, facet: string) {
  const facetKey = facet as FacetKey;
  const values = (item.facets[facet] ?? [])
    .map((value) => safeFacetValue(facetKey, value))
    .filter((value): value is string => Boolean(value));
  return values.length > 0 ? values.slice(0, 3).join(" · ") : "来源待补";
}

function parsePage(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function paginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = [
    ...new Set([
      1,
      totalPages,
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ]),
  ]
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);
  const output: Array<number | string> = [];
  pages.forEach((item, index) => {
    const previous = pages[index - 1];
    if (previous && item - previous > 1) output.push(`gap-${previous}-${item}`);
    output.push(item);
  });
  return output;
}

function writeFilters(
  filters: FilterState,
  mode: "pushState" | "replaceState",
) {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  if (filters.query) params.set("q", filters.query);
  else params.delete("q");

  if (filters.category !== "all") params.set("category", filters.category);
  else params.delete("category");

  if (filters.grouping !== "all") params.set("group", filters.grouping);
  else params.delete("group");

  facetFilters.forEach(({ key }) => {
    if (filters.facets[key]) params.set(key, filters.facets[key]);
    else params.delete(key);
  });

  if (filters.page > 1) params.set("page", String(filters.page));
  else params.delete("page");

  if (filters.scope === "full") params.set("scope", "full");
  else params.delete("scope");

  const nextUrl = `${url.pathname}${params.size ? `?${params}` : ""}${url.hash}`;
  window.history[mode]({}, "", nextUrl);
}

function catalogReturnHref(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.grouping !== "all") params.set("group", filters.grouping);
  facetFilters.forEach(({ key }) => {
    if (filters.facets[key]) params.set(key, filters.facets[key]);
  });
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.scope === "full") params.set("scope", "full");
  return `/catalog-lab${params.size ? `?${params}` : ""}#catalog-products`;
}

function detailHref(detailRef: string, returnHref: string) {
  const params = new URLSearchParams({ returnTo: returnHref });
  return `${detailRef}?${params}`;
}

function FilterControls({
  categories,
  category,
  grouping,
  query,
  resultCount,
  disabled = false,
  onCategoryChange,
  onGroupingChange,
  onQueryChange,
}: FilterControlsProps) {
  return (
    <div className="catalogLab-filters">
      <label className="catalogLab-searchField">
        <span>搜索型号、名称或参数</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="例如 JH31L、吸顶灯、亚克力"
          disabled={disabled}
        />
      </label>
      <label>
        <span>商品分类</span>
        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          disabled={disabled}
        >
          <option value="all">全部 {categories.length} 个分类</option>
          {categories.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>产品族状态</span>
        <select
          value={grouping}
          onChange={(event) => onGroupingChange(event.target.value)}
          disabled={disabled}
        >
          <option value="all">全部状态</option>
          <option value="family">强证据产品族</option>
          <option value="single">待复核单品</option>
        </select>
      </label>
      <div className="catalogLab-resultCount" aria-live="polite">
        <strong>{resultCount ?? "—"}</strong>
        <span>{resultCount === null ? "正在校验" : "个结果"}</span>
      </div>
    </div>
  );
}

function FacetControls({
  options,
  selections,
  onChange,
  disabled = false,
}: FacetControlsProps) {
  return (
    <div
      className="catalogLab-facetFilters"
      role="group"
      aria-label="多维组合筛选"
    >
      <header>
        <strong>多维组合筛选</strong>
        <span>每个维度可选一项，跨维度同时匹配。</span>
      </header>
      <div>
        {facetFilters.map(({ key, label, emptyLabel }) => (
          <label key={key}>
            <span>{label}</span>
            <select
              value={selections[key]}
              onChange={(event) => onChange(key, event.target.value)}
              aria-label={`按${label}筛选`}
              disabled={disabled}
            >
              <option value="">{emptyLabel}</option>
              {options[key].map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

function ActiveConditions({
  conditions,
  onClearAll,
}: {
  conditions: ActiveCondition[];
  onClearAll: () => void;
}) {
  if (conditions.length === 0) return null;
  return (
    <div className="catalogLab-activeConditions" aria-label="已选筛选条件">
      <div>
        <strong>已选条件</strong>
        <span>{conditions.length} 项</span>
      </div>
      <ul>
        {conditions.map((condition) => (
          <li key={condition.id}>
            <span>{condition.label}</span>
            <strong>{condition.value}</strong>
            <button
              type="button"
              onClick={condition.onClear}
              aria-label={`清除${condition.label}条件：${condition.value}`}
            >
              清除
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClearAll}>
        全部清除
      </button>
    </div>
  );
}

export function CatalogLabIndex({
  items,
  manifest,
  initialFilters,
}: {
  items: CatalogV2FamilyIndex[];
  manifest: Manifest;
  initialFilters: CatalogLabInitialFilters;
}) {
  const sampleFacetOptions = useMemo(() => buildFacetOptions(items), [items]);
  const [scope, setScope] = useState<CatalogScope>(initialFilters.scope);
  const [fullItems, setFullItems] = useState<CatalogV2FamilyIndex[] | null>(
    null,
  );
  const [fullLoadState, setFullLoadState] = useState<FullLoadState>(
    initialFilters.scope === "full" ? "loading" : "idle",
  );
  const [fullLoadError, setFullLoadError] = useState("");
  const [query, setQuery] = useState(initialFilters.query);
  const [category, setCategory] = useState(initialFilters.category);
  const [grouping, setGrouping] = useState(initialFilters.grouping);
  const [facets, setFacets] = useState(() =>
    initialFilters.scope === "full"
      ? preserveSafeFacetSelections(initialFilters.facets)
      : normalizeFacetSelections(initialFilters.facets, sampleFacetOptions),
  );
  const [page, setPage] = useState(initialFilters.page);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [compareExpanded, setCompareExpanded] = useState(true);
  const [comparisonMessage, setComparisonMessage] = useState(
    "可选择最多 3 个产品族进行来源字段对照。",
  );
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const skipPageClampRef = useRef(false);
  const activeItems = scope === "full" && fullItems ? fullItems : items;
  const scopeDataReady = scope === "sample" || fullLoadState === "ready";
  const scopeLoading = scope === "full" && fullLoadState === "loading";
  const facetOptions = useMemo(
    () => buildFacetOptions(activeItems),
    [activeItems],
  );
  const deferredQuery = useDeferredValue(
    query.trim().toLocaleLowerCase("zh-CN"),
  );
  const categories = useMemo(
    () =>
      [...new Set(activeItems.map((item) => item.category))].sort((a, b) =>
        a.localeCompare(b, "zh-CN"),
      ),
    [activeItems],
  );
  const filtered = useMemo(
    () =>
      activeItems.filter((item) =>
        matchesCatalogFilters(item, {
          category,
          grouping,
          facets,
          normalizedQuery: deferredQuery,
        }),
      ),
    [activeItems, category, deferredQuery, facets, grouping],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = scopeDataReady ? Math.min(page, totalPages) : page;
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = scopeDataReady
    ? filtered.slice(pageStart, pageStart + PAGE_SIZE)
    : [];
  const comparedItems = comparedIds
    .map((familyId) => activeItems.find((item) => item.family_id === familyId))
    .filter((item): item is CatalogV2FamilyIndex => Boolean(item));
  const activeFilterCount =
    Number(Boolean(query.trim())) +
    Number(category !== "all") +
    Number(grouping !== "all") +
    facetFilters.filter(({ key }) => Boolean(facets[key])).length;
  const hero =
    activeItems.find(
      (item) =>
        item.member_count > 1 && Boolean(item.representative.primary_image),
    ) ?? activeItems[0];

  useEffect(() => {
    if (scope !== "full" || fullItems) return;
    const controller = new AbortController();
    loadFullPrivateCatalog(controller.signal)
      .then(({ items: loadedItems }) => {
        if (controller.signal.aborted) return;
        setFullItems(loadedItems);
        setFullLoadState("ready");
        setFullLoadError("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFullLoadState("error");
        setFullLoadError(
          error instanceof Error ? error.message : "全量数据未通过完整性校验",
        );
        setScope("sample");
        setPage(1);
        const fallbackUrl = new URL(window.location.href);
        fallbackUrl.searchParams.delete("scope");
        fallbackUrl.searchParams.delete("page");
        window.history.replaceState(
          {},
          "",
          `${fallbackUrl.pathname}${
            fallbackUrl.searchParams.size ? `?${fallbackUrl.searchParams}` : ""
          }${fallbackUrl.hash}`,
        );
      });
    return () => controller.abort();
  }, [fullItems, scope]);

  useEffect(() => {
    function restoreFilters() {
      const params = new URLSearchParams(window.location.search);
      const requestedScope: CatalogScope =
        params.get("scope") === "full" ? "full" : "sample";
      const nextQuery = params.get("q") ?? "";
      const nextCategory = params.get("category") ?? "all";
      const nextGrouping = params.get("group") ?? "all";
      const nextFacets = facetFilters.reduce((values, { key }) => {
        values[key] = params.get(key) ?? "";
        return values;
      }, emptyFacetSelections());
      const awaitingFullData = requestedScope === "full" && !fullItems;
      const requestedItems =
        requestedScope === "full" && fullItems ? fullItems : items;
      const requestedCategories = [
        ...new Set(requestedItems.map((item) => item.category)),
      ];
      const requestedFacetOptions =
        requestedScope === "full" && fullItems
          ? buildFacetOptions(fullItems)
          : sampleFacetOptions;
      const normalizedCategory =
        awaitingFullData ||
        nextCategory === "all" ||
        requestedCategories.includes(nextCategory)
          ? nextCategory
          : "all";
      const normalizedGrouping = GROUPING_VALUES.has(nextGrouping)
        ? nextGrouping
        : "all";
      const normalizedFacets = awaitingFullData
        ? preserveSafeFacetSelections(nextFacets)
        : normalizeFacetSelections(nextFacets, requestedFacetOptions);
      const requestedPage = parsePage(params.get("page"));
      const requestedTotalPages = awaitingFullData
        ? requestedPage
        : Math.max(
            1,
            Math.ceil(
              requestedItems.filter((item) =>
                matchesCatalogFilters(item, {
                  category: normalizedCategory,
                  grouping: normalizedGrouping,
                  facets: normalizedFacets,
                  normalizedQuery: nextQuery.trim().toLocaleLowerCase("zh-CN"),
                }),
              ).length / PAGE_SIZE,
            ),
          );
      const normalizedPage = awaitingFullData
        ? requestedPage
        : Math.min(requestedPage, requestedTotalPages);

      skipPageClampRef.current = true;
      setScope(requestedScope);
      if (requestedScope === "sample") {
        const sampleFamilyIds = new Set(items.map((item) => item.family_id));
        setComparedIds((current) => {
          const retained = current.filter((familyId) =>
            sampleFamilyIds.has(familyId),
          );
          return retained.length === current.length ? current : retained;
        });
      }
      if (requestedScope === "full" && !fullItems) {
        setFullLoadState("loading");
        setFullLoadError("");
      }
      setQuery(nextQuery);
      setCategory(normalizedCategory);
      setGrouping(normalizedGrouping);
      setFacets(normalizedFacets);
      setPage(normalizedPage);

      const hasNonCanonicalFacet = facetFilters.some(
        ({ key }) => (params.get(key) ?? "") !== normalizedFacets[key],
      );
      const hasNonCanonicalCategory =
        (params.get("category") ?? "all") !== normalizedCategory;
      const hasNonCanonicalGrouping =
        (params.get("group") ?? "all") !== normalizedGrouping;
      const hasNonCanonicalScope =
        params.has("scope") && params.get("scope") !== "full";
      const canonicalPage = normalizedPage > 1 ? String(normalizedPage) : null;
      if (
        !awaitingFullData &&
        (hasNonCanonicalFacet ||
          params.get("page") !== canonicalPage ||
          hasNonCanonicalCategory ||
          hasNonCanonicalGrouping ||
          hasNonCanonicalScope)
      ) {
        writeFilters(
          {
            scope: requestedScope,
            query: nextQuery,
            category: normalizedCategory,
            grouping: normalizedGrouping,
            facets: normalizedFacets,
            page: normalizedPage,
          },
          "replaceState",
        );
      }
    }

    restoreFilters();
    window.addEventListener("popstate", restoreFilters);
    return () => window.removeEventListener("popstate", restoreFilters);
  }, [fullItems, items, sampleFacetOptions, scope]);

  useEffect(() => {
    if (skipPageClampRef.current) {
      skipPageClampRef.current = false;
      return;
    }
    if (page <= totalPages) return;
    if (!scopeDataReady) return;
    // The result set can shrink after any URL-driven filter change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(totalPages);
    writeFilters(
      { scope, query, category, grouping, facets, page: totalPages },
      "replaceState",
    );
  }, [
    category,
    facets,
    grouping,
    page,
    query,
    scope,
    scopeDataReady,
    totalPages,
  ]);

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches && filterDialogRef.current?.open)
        filterDialogRef.current.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  function changeScope(nextScope: CatalogScope) {
    if (
      nextScope === scope &&
      !(nextScope === "full" && fullLoadState === "error")
    ) {
      return;
    }
    if (nextScope === "full") {
      setScope("full");
      setFullLoadState(fullItems ? "ready" : "loading");
      setFullLoadError("");
      setPage(1);
      writeFilters(
        { scope: "full", query, category, grouping, facets, page: 1 },
        "pushState",
      );
      return;
    }

    const nextCategory =
      category === "all" || items.some((item) => item.category === category)
        ? category
        : "all";
    const nextFacets = normalizeFacetSelections(facets, sampleFacetOptions);
    const sampleFamilyIds = new Set(items.map((item) => item.family_id));
    const retainedComparedIds = comparedIds.filter((familyId) =>
      sampleFamilyIds.has(familyId),
    );
    setScope("sample");
    setCategory(nextCategory);
    setFacets(nextFacets);
    setComparedIds(retainedComparedIds);
    if (retainedComparedIds.length !== comparedIds.length) {
      setComparisonMessage("已移除不在 120 样板范围内的比较项。");
    }
    setPage(1);
    writeFilters(
      {
        scope: "sample",
        query,
        category: nextCategory,
        grouping,
        facets: nextFacets,
        page: 1,
      },
      "pushState",
    );
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setPage(1);
    writeFilters(
      { scope, query: nextQuery, category, grouping, facets, page: 1 },
      "replaceState",
    );
  }

  function clearQuery() {
    setQuery("");
    setPage(1);
    writeFilters(
      { scope, query: "", category, grouping, facets, page: 1 },
      "pushState",
    );
  }

  function updateCategory(nextCategory: string) {
    setCategory(nextCategory);
    setPage(1);
    writeFilters(
      { scope, query, category: nextCategory, grouping, facets, page: 1 },
      "pushState",
    );
  }

  function updateGrouping(nextGrouping: string) {
    setGrouping(nextGrouping);
    setPage(1);
    writeFilters(
      { scope, query, category, grouping: nextGrouping, facets, page: 1 },
      "pushState",
    );
  }

  function updateFacet(key: FacetKey, nextValue: string) {
    const safeValue = safeFacetValue(key, nextValue);
    const nextFacets = {
      ...facets,
      [key]:
        safeValue && facetOptions[key].includes(safeValue) ? safeValue : "",
    };
    setFacets(nextFacets);
    setPage(1);
    writeFilters(
      { scope, query, category, grouping, facets: nextFacets, page: 1 },
      "pushState",
    );
  }

  function resetFilters() {
    const nextFacets = emptyFacetSelections();
    setQuery("");
    setCategory("all");
    setGrouping("all");
    setFacets(nextFacets);
    setPage(1);
    writeFilters(
      {
        scope,
        query: "",
        category: "all",
        grouping: "all",
        facets: nextFacets,
        page: 1,
      },
      "pushState",
    );
  }

  function openFilters() {
    if (!filterDialogRef.current?.open) filterDialogRef.current?.showModal();
    setFiltersOpen(true);
  }

  function closeFilters() {
    filterDialogRef.current?.close();
  }

  function handleFilterDialogClose() {
    setFiltersOpen(false);
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => filterToggleRef.current?.focus());
    }
  }

  function changePage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
    writeFilters(
      { scope, query, category, grouping, facets, page: safePage },
      "pushState",
    );
    window.requestAnimationFrame(() => {
      productGridRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      productGridRef.current?.focus({ preventScroll: true });
    });
  }

  function toggleCompare(item: CatalogV2FamilyIndex) {
    if (comparedIds.includes(item.family_id)) {
      setComparedIds((current) =>
        current.filter((familyId) => familyId !== item.family_id),
      );
      setComparisonMessage(`已从比较中移除 ${item.title}。`);
      return;
    }
    if (comparedItems.length >= MAX_COMPARE_ITEMS) {
      setComparisonMessage("最多比较 3 个产品族，请先移除一项。");
      return;
    }
    setComparedIds([
      ...comparedItems.map((comparedItem) => comparedItem.family_id),
      item.family_id,
    ]);
    setCompareExpanded(true);
    setComparisonMessage(
      `已加入 ${item.title}，当前 ${comparedItems.length + 1} 项。`,
    );
  }

  const comparisonDetail = `compare-${comparedIds.join("-")}`;
  const comparisonConsultationHref = consultationHref(
    "project",
    "products",
    comparisonDetail,
  );
  const activeConditions: ActiveCondition[] = [];
  if (query.trim()) {
    activeConditions.push({
      id: "query",
      label: "搜索",
      value: query.trim(),
      onClear: clearQuery,
    });
  }
  if (category !== "all") {
    activeConditions.push({
      id: "category",
      label: "分类",
      value: category,
      onClear: () => updateCategory("all"),
    });
  }
  if (grouping !== "all") {
    activeConditions.push({
      id: "grouping",
      label: "产品族状态",
      value: grouping === "family" ? "强证据产品族" : "待复核单品",
      onClear: () => updateGrouping("all"),
    });
  }
  facetFilters.forEach(({ key, label }) => {
    if (!facets[key]) return;
    activeConditions.push({
      id: key,
      label,
      value: facets[key],
      onClear: () => updateFacet(key, ""),
    });
  });
  const scopeStatusText = scopeLoading
    ? "正在校验 13 个私有数据分片，请稍候。"
    : scope === "full" && fullLoadState === "ready"
      ? "已校验 1,208 个产品族与 1,913 条有效来源。"
      : fullLoadState === "error"
        ? `全量数据未通过完整性校验，已回到 120 样板。${
            fullLoadError ? ` ${fullLoadError}` : ""
          }`
        : "当前使用 120 个跨分类私有样板；可按需加载全量审核索引。";
  const displayedFamilyCount =
    scope === "full" ? fullItems?.length : manifest.sample_family_count;
  const displayedFamilyCountLabel =
    displayedFamilyCount?.toLocaleString("zh-CN") ?? "—";
  const returnHref = catalogReturnHref({
    scope,
    query,
    category,
    grouping,
    facets,
    page: currentPage,
  });

  return (
    <main id="main-content" className="catalogLab-page" tabIndex={-1}>
      <section
        className="catalogLab-hero"
        data-page-hero="workbench"
        data-header-tone="light"
      >
        <div className="catalogLab-heroCopy">
          <p data-page-role="eyebrow">内部产品目录样板</p>
          <h1 data-page-role="display">查找、比较并审核产品族。</h1>
          <span data-page-role="lead">
            按型号、分类与证据状态筛选 {displayedFamilyCountLabel}{" "}
            个来源可追溯产品族。
          </span>
          <div className="catalogLab-heroActions">
            <a href="#catalog-lab-title">
              开始筛选 <span aria-hidden="true">↓</span>
            </a>
            <Link href="/catalog-lab/review">
              进入审核工作台 <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <figure className="catalogLab-heroVisual">
          <ProductMedia item={hero} priority />
          <figcaption>
            <span>{categoryDisplay(hero)}</span>
            <strong>{hero.title}</strong>
            <small>{hero.member_count} 个来源变体</small>
          </figcaption>
        </figure>
        <div className="catalogLab-heroFilters catalogLab-filterDesktop">
          <FilterControls
            categories={categories}
            category={category}
            grouping={grouping}
            query={query}
            resultCount={scopeDataReady ? filtered.length : null}
            disabled={!scopeDataReady}
            onCategoryChange={updateCategory}
            onGroupingChange={updateGrouping}
            onQueryChange={updateQuery}
          />
        </div>
        <button
          className="catalogLab-filterToggle"
          ref={filterToggleRef}
          type="button"
          aria-haspopup="dialog"
          aria-controls="catalog-mobile-filters"
          aria-expanded={filtersOpen}
          onClick={openFilters}
          disabled={!scopeDataReady}
        >
          <span>筛选与搜索</span>
          <strong>
            {scopeLoading
              ? "正在校验全量数据"
              : activeFilterCount > 0
                ? `${activeFilterCount} 项条件`
                : `${filtered.length} 个结果`}
          </strong>
        </button>
      </section>

      <section
        className="catalogLab-metrics"
        data-header-tone="light"
        aria-label="目录样板数据"
      >
        <article>
          <strong>
            {manifest.source_product_count.toLocaleString("zh-CN")}
          </strong>
          <span>冻结来源商品</span>
        </article>
        <article>
          <strong>
            {manifest.derived_family_count.toLocaleString("zh-CN")}
          </strong>
          <span>保守派生产品族</span>
        </article>
        <article>
          <strong>{displayedFamilyCountLabel}</strong>
          <span>{scope === "full" ? "全量审核产品族" : "本轮私有样板"}</span>
        </article>
        <article>
          <strong>{manifest.categories_covered.length}</strong>
          <span>覆盖商品分类</span>
        </article>
      </section>

      <section
        className="catalogLab-catalog"
        data-header-tone="light"
        aria-labelledby="catalog-lab-title"
      >
        <header className="catalogLab-catalogHeader">
          <h2 id="catalog-lab-title">
            {scope === "full" ? "全量产品族审核" : "跨分类样板"}
          </h2>
          <p>
            搜索、筛选与结果数量保持在工作区顶部；只显示结构化来源字段，价格、库存与
            IoT 实例数据未进入页面。
          </p>
        </header>

        <div className="catalogLab-scopeControl">
          <div role="group" aria-label="目录数据范围">
            <button
              type="button"
              aria-pressed={scope === "sample"}
              onClick={() => changeScope("sample")}
            >
              <strong>120</strong>
              <span>私有样板</span>
            </button>
            <button
              type="button"
              aria-pressed={scope === "full"}
              disabled={scopeLoading}
              onClick={() => changeScope("full")}
            >
              <strong>1,208</strong>
              <span>全量审核</span>
            </button>
          </div>
          <p
            data-state={
              fullLoadState === "error"
                ? "error"
                : scopeLoading
                  ? "loading"
                  : "ready"
            }
            aria-live="polite"
          >
            {scopeStatusText}
          </p>
        </div>

        <div className="catalogLab-facetDesktop">
          <FacetControls
            options={facetOptions}
            selections={facets}
            onChange={updateFacet}
            disabled={!scopeDataReady}
          />
          <ActiveConditions
            conditions={activeConditions}
            onClearAll={resetFilters}
          />
        </div>

        <dialog
          className="catalogLab-filterDialog"
          id="catalog-mobile-filters"
          ref={filterDialogRef}
          aria-labelledby="catalog-filter-dialog-title"
          onClose={handleFilterDialogClose}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeFilters();
          }}
        >
          <header>
            <div>
              <p>目录导航</p>
              <h2 id="catalog-filter-dialog-title">筛选产品族</h2>
            </div>
            <button type="button" onClick={closeFilters} aria-label="关闭筛选">
              ×
            </button>
          </header>
          <div className="catalogLab-filterDialogBody">
            <FilterControls
              categories={categories}
              category={category}
              grouping={grouping}
              query={query}
              resultCount={scopeDataReady ? filtered.length : null}
              disabled={!scopeDataReady}
              onCategoryChange={updateCategory}
              onGroupingChange={updateGrouping}
              onQueryChange={updateQuery}
            />
            <FacetControls
              options={facetOptions}
              selections={facets}
              onChange={updateFacet}
              disabled={!scopeDataReady}
            />
            <ActiveConditions
              conditions={activeConditions}
              onClearAll={resetFilters}
            />
          </div>
          <footer>
            <button type="button" onClick={resetFilters}>
              清除条件
            </button>
            <button type="button" onClick={closeFilters}>
              查看 {scopeDataReady ? filtered.length : "—"} 个结果
            </button>
          </footer>
        </dialog>

        <p
          className="catalogLab-srOnly"
          id="catalog-compare-status"
          aria-live="polite"
        >
          {comparisonMessage}
        </p>

        {scopeLoading ? (
          <div className="catalogLab-scopeStage" role="status">
            <span aria-hidden="true" />
            <h3>正在建立全量审核视图</h3>
            <p>13 个分片逐一核对字节与哈希；完成前不会改写筛选条件或页码。</p>
          </div>
        ) : visibleItems.length > 0 ? (
          <>
            <div
              className="catalogLab-productGrid"
              id="catalog-products"
              ref={productGridRef}
              tabIndex={-1}
              aria-label={`第 ${currentPage} 页产品族`}
            >
              {visibleItems.map((item) => {
                const isCompared = comparedIds.includes(item.family_id);
                return (
                  <article
                    className="catalogLab-productCard"
                    data-compared={isCompared}
                    key={item.family_id}
                  >
                    <Link
                      className="catalogLab-productCardLink"
                      href={detailHref(item.detail_ref, returnHref)}
                    >
                      <figure>
                        <ProductMedia item={item} />
                      </figure>
                      <div>
                        <p>{categoryDisplay(item)}</p>
                        <h3>{item.title}</h3>
                        <dl>
                          <div>
                            <dt>型号</dt>
                            <dd data-pending={!item.model_label || undefined}>
                              {item.model_label ?? "型号待审核"}
                            </dd>
                          </div>
                          <div>
                            <dt>变体</dt>
                            <dd>{item.member_count} 个</dd>
                          </div>
                        </dl>
                        {item.card_specs.length > 0 ? (
                          <ul
                            className="catalogLab-cardSpecs"
                            aria-label="卡片关键参数"
                          >
                            {item.card_specs.slice(0, 3).map((spec) => (
                              <li key={spec.key}>
                                <span>{spec.label}</span>
                                <strong>{spec.values.join(" · ")}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="catalogLab-cardSpecsPending">
                            关键参数待来源补齐
                          </p>
                        )}
                        <span>
                          {item.detail_state === "rich_private_preview"
                            ? "查看产品族"
                            : "查看安全摘要"}{" "}
                          ↗
                        </span>
                      </div>
                    </Link>
                    <button
                      className="catalogLab-compareToggle"
                      type="button"
                      aria-pressed={isCompared}
                      aria-disabled={
                        !isCompared && comparedItems.length >= MAX_COMPARE_ITEMS
                      }
                      aria-describedby="catalog-compare-status"
                      onClick={() => toggleCompare(item)}
                    >
                      {isCompared ? "已加入比较 ✓" : "加入比较 ＋"}
                    </button>
                  </article>
                );
              })}
            </div>

            {comparedItems.length > 0 && (
              <aside
                className="catalogLab-comparePanel"
                aria-labelledby="catalog-compare-title"
              >
                <header>
                  <div>
                    <p>
                      选型对照台 · {comparedItems.length}/{MAX_COMPARE_ITEMS}
                    </p>
                    <h3 id="catalog-compare-title">
                      把来源字段放在同一束光下。
                    </h3>
                  </div>
                  <div>
                    <button
                      type="button"
                      aria-expanded={compareExpanded}
                      aria-controls="catalog-compare-table"
                      onClick={() => setCompareExpanded((value) => !value)}
                    >
                      {compareExpanded ? "收起对照" : "展开对照"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComparedIds([]);
                        setComparisonMessage("已清空产品比较。");
                      }}
                    >
                      清空
                    </button>
                  </div>
                </header>
                <div id="catalog-compare-table" hidden={!compareExpanded}>
                  <div
                    className="catalogLab-compareScroller"
                    role="region"
                    aria-label="产品来源字段比较表"
                    tabIndex={0}
                  >
                    <table>
                      <caption className="catalogLab-srOnly">
                        已选择产品族的来源字段对照
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">来源字段</th>
                          {comparedItems.map((item) => (
                            <th scope="col" key={item.family_id}>
                              <div className="catalogLab-compareProductHeading">
                                <Link
                                  href={detailHref(item.detail_ref, returnHref)}
                                >
                                  {item.title}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => toggleCompare(item)}
                                  aria-label={`从比较中移除 ${item.title}`}
                                >
                                  移除
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th scope="row">分类</th>
                          {comparedItems.map((item) => (
                            <td key={item.family_id}>{categoryDisplay(item)}</td>
                          ))}
                        </tr>
                        <tr>
                          <th scope="row">型号</th>
                          {comparedItems.map((item) => (
                            <td key={item.family_id}>
                              {item.model_label ?? "型号待审核"}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <th scope="row">来源变体</th>
                          {comparedItems.map((item) => (
                            <td key={item.family_id}>{item.member_count} 个</td>
                          ))}
                        </tr>
                        {comparisonFacets.map(([facet, label]) => (
                          <tr key={facet}>
                            <th scope="row">{label}</th>
                            {comparedItems.map((item) => (
                              <td key={item.family_id}>
                                {facetSummary(item, facet)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <footer>
                    <p>
                      比较结果只来自冻结来源字段，不代表库存、价格或工程承诺。
                    </p>
                    <Link href={comparisonConsultationHref}>
                      带着这组产品咨询 →
                    </Link>
                  </footer>
                </div>
              </aside>
            )}

            <nav className="catalogLab-pagination" aria-label="产品目录分页">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => changePage(currentPage - 1)}
              >
                ← 上一页
              </button>
              <ol>
                {paginationItems(currentPage, totalPages).map((pageItem) => (
                  <li key={pageItem}>
                    {typeof pageItem === "string" ? (
                      <span aria-hidden="true">…</span>
                    ) : (
                      <button
                        type="button"
                        aria-current={
                          pageItem === currentPage ? "page" : undefined
                        }
                        aria-label={`第 ${pageItem} 页`}
                        onClick={() => changePage(pageItem)}
                      >
                        {String(pageItem).padStart(2, "0")}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => changePage(currentPage + 1)}
              >
                下一页 →
              </button>
              <p aria-live="polite">
                第 {currentPage} / {totalPages} 页 · 每页最多 {PAGE_SIZE} 项
              </p>
            </nav>
          </>
        ) : (
          <div className="catalogLab-emptyState">
            <h3>没有匹配的产品族</h3>
            <p>调整型号、参数或分类条件后再试。</p>
            <button type="button" onClick={resetFilters}>
              清除筛选
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
