import Image from "next/image";

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
    <Image
      alt={alt}
      className={className}
      height={horizontal ? 46 : 125}
      priority={priority}
      src={`/brand/juhao-logo-${variant}${suffix}.svg`}
      width={horizontal ? 444 : 260}
    />
  );
}
