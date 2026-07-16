import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  original: string; // path to the original raster illustration
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Cartoon SVG illustration + the original PNG; CSS shows the one matching the
 * active theme (`html[data-theme]`).
 */
const ThemeIllustration = ({ original, width, height, className, style }: Props) => (
  <>
    <Image
      src="/assets/images/cartoon-files.svg"
      alt="Files"
      width={width}
      height={height}
      className={cn("theme-cartoon-only", className)}
      style={style}
    />
    <Image
      src={original}
      alt="Files"
      width={width}
      height={height}
      className={cn("theme-original-only", className)}
      style={style}
    />
  </>
);

export default ThemeIllustration;
