import Image from "next/image";
import { LOGO_SRC, SCHOOL_SHORT, SCHOOL_NAME, APP_NAME } from "@/lib/branding";

// `unoptimized` keeps the SVG crest passing through untouched — the image optimiser
// refuses SVG sources unless `dangerouslyAllowSVG` is set, which we don't want globally.
export function BrandLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt={`${SCHOOL_SHORT} crest`}
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

/** Crest + name, the standard header/sidebar treatment. */
export function BrandLockup({
  size = 36,
  primary = SCHOOL_SHORT,
  secondary = APP_NAME,
  className = "",
}: {
  size?: number;
  primary?: string;
  secondary?: string;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <BrandLogo size={size} />
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-slate-900">{primary}</span>
        {secondary && <span className="block text-[11px] text-slate-500">{secondary}</span>}
      </span>
    </span>
  );
}

/** Stacked crest + full school name, used on the auth screens. */
export function BrandStack({ size = 76 }: { size?: number }) {
  return (
    <>
      <BrandLogo size={size} />
      <span className="text-lg font-semibold text-slate-800">{SCHOOL_NAME}</span>
      <span className="-mt-1 text-sm text-slate-500">{APP_NAME}</span>
    </>
  );
}
