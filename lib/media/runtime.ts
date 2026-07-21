import rawRuntimeMedia from "@/content/governance/runtime-media.json";

export type RuntimeMediaFormat = "avif" | "webp";

export type RuntimeMediaVariant = {
  format: RuntimeMediaFormat;
  width: number;
  height: number;
  path: string;
};

export type RuntimeMedia = {
  media_id: string;
  width: number;
  height: number;
  animated: boolean;
  fallback: string;
  variants: RuntimeMediaVariant[];
};

const runtimeMedia = rawRuntimeMedia as RuntimeMedia[];
const runtimeMediaById = new Map(runtimeMedia.map((media) => [media.media_id, media]));

export function requireRuntimeMedia(mediaId: string) {
  const media = runtimeMediaById.get(mediaId);
  if (!media) throw new Error(`Published media is not available locally: ${mediaId}`);
  return media;
}

export function runtimeSrcSet(media: RuntimeMedia, format: RuntimeMediaFormat) {
  return media.variants
    .filter((variant) => variant.format === format)
    .sort((left, right) => left.width - right.width)
    .map((variant) => `${variant.path} ${variant.width}w`)
    .join(", ");
}
