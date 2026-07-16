import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "full" | "mark";
  width: number;
  height: number;
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
}

/**
 * Renders both the cartoon and original brand logo; CSS (`html[data-theme]`)
 * shows whichever matches the active theme. Works in server components — no JS.
 */
const BrandLogo = ({
  variant = "full",
  width,
  height,
  className,
  imgClassName,
  style,
}: Props) => {
  const cartoon =
    variant === "full"
      ? "/assets/icons/logo-full-brand.svg"
      : "/assets/icons/logo-brand.svg";
  const original =
    variant === "full"
      ? "/assets/icons/logo-full-brand-original.svg"
      : "/assets/icons/logo-brand-original.svg";

  return (
    <span className={cn("contents", className)}>
      <Image
        src={cartoon}
        alt="logo"
        width={width}
        height={height}
        className={cn("theme-cartoon-only", imgClassName)}
        style={style}
      />
      <Image
        src={original}
        alt="logo"
        width={width}
        height={height}
        className={cn("theme-original-only", imgClassName)}
        style={style}
      />
    </span>
  );
};

export default BrandLogo;
