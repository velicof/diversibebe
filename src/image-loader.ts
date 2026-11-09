// next/image loader without an optimisation service: the static V2 images have pre-generated widths
// (scripts/static-image-variants.cjs); every other image, V1's included, is served as it is, as on main.
import variants from "./image-variants.json";

const STATIC_VARIANTS: Record<string, number[]> = variants.STATIC_VARIANTS;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const widths = STATIC_VARIANTS[src];
  if (!widths) return src;
  const chosen = widths.find((w) => w >= width) ?? widths[widths.length - 1];
  return src.replace(/\.webp$/, `-${chosen}.webp`);
}
