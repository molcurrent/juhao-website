const CATALOG_IMAGE_PATH_PREFIX = "/upload/";
const LOCAL_IMAGE_PATH_PREFIXES = ["/brand/", "/images/", "/media/"];

export function validatedCatalogImagePath(value: string | null) {
  if (
    !value ||
    !value.startsWith(CATALOG_IMAGE_PATH_PREFIX) ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    return null;
  }
  try {
    const url = new URL(value, "https://catalog.invalid");
    return url.origin === "https://catalog.invalid" &&
      url.pathname.startsWith(CATALOG_IMAGE_PATH_PREFIX)
      ? url.pathname
      : null;
  } catch {
    return null;
  }
}

export function catalogImageUrl(
  value: string | null,
  fallback = "/images/jh48-product-card-art.webp",
) {
  if (
    value &&
    LOCAL_IMAGE_PATH_PREFIXES.some((prefix) => value.startsWith(prefix))
  ) {
    return value;
  }
  const imagePath = validatedCatalogImagePath(value);
  return imagePath
    ? `/api/catalog-image?path=${encodeURIComponent(imagePath)}`
    : fallback;
}

export function catalogImageUrlOrNull(value: string | null) {
  const imagePath = validatedCatalogImagePath(value);
  return imagePath
    ? `/api/catalog-image?path=${encodeURIComponent(imagePath)}`
    : null;
}
