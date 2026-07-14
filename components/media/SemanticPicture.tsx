import type { CSSProperties } from "react";
import { requireRuntimeMedia, runtimeSrcSet } from "@/lib/media/runtime";

export type SemanticPictureProps = {
  mediaId: string;
  alt: string;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  style?: CSSProperties;
};

export function SemanticPicture({
  mediaId,
  alt,
  sizes = "100vw",
  className,
  imageClassName,
  priority = false,
  style,
}: SemanticPictureProps) {
  const media = requireRuntimeMedia(mediaId);
  const avifSrcSet = runtimeSrcSet(media, "avif");
  const webpSrcSet = runtimeSrcSet(media, "webp");

  return (
    <picture className={className} data-media-id={media.media_id}>
      {avifSrcSet ? <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} /> : null}
      {webpSrcSet ? <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} /> : null}
      <img
        alt={alt}
        className={imageClassName}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        height={media.height}
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        src={media.fallback}
        srcSet={webpSrcSet || undefined}
        style={style}
        width={media.width}
      />
    </picture>
  );
}
