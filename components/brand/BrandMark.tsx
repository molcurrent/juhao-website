type BrandMarkProps = {
  alt?: string;
  className?: string;
  priority?: boolean;
  tone?: "orange" | "white";
  variant?: "horizontal" | "stacked";
};

export function BrandMark({
  alt = "",
  className,
  priority = false,
  tone = "orange",
  variant = "horizontal",
}: BrandMarkProps) {
  const horizontal = variant === "horizontal";
  const suffix = tone === "white" ? "-white" : "";

  return (
    // The logo is an already optimized SVG; native loading avoids shipping the image runtime.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      height={horizontal ? 46 : 125}
      loading={priority ? "eager" : "lazy"}
      src={`/brand/juhao-logo-${variant}${suffix}.svg`}
      width={horizontal ? 444 : 260}
    />
  );
}
