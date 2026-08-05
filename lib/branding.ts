// Single source of truth for institution branding. Change these to re-brand the whole app.
export const SCHOOL_NAME = "Yaounde International Business School";
export const SCHOOL_SHORT = "YIBS";
export const APP_NAME = "Course Allocation System";
export const APP_FULL = `${SCHOOL_SHORT} ${APP_NAME}`;

// Brand assets live in public/brand — see the README there for how to swap them.
export const LOGO_SRC = "/brand/yibs-logo.svg";
export const BUILDING_SRC = "/brand/yibs-building.jpg";

// Colours sampled from the campus building, used wherever the photo has to blend into
// flat colour: cobalt glass, the yellow stair band, white cladding, sky.
export const BUILDING_COBALT_DARK = "#0b2c6e";
export const BUILDING_COBALT = "#1b52c4";
export const BUILDING_YELLOW = "#ffcc00";
export const BUILDING_SKY = "#4a9fe0";

// The building photo is applied as a layered CSS background rather than an <img> so a
// missing file degrades to the gradient underneath instead of a broken-image box.
//   "hero"  — cobalt scrim heaviest on the left, so the building stays visible on the right
//             while white headline text keeps its contrast.
//   "panel" — near-opaque wash for form screens, where legibility beats the photograph.
export function buildingBackground(tint: "hero" | "panel" = "hero"): string {
  if (tint === "panel") {
    return [
      "linear-gradient(180deg, rgba(232,244,253,0.94) 0%, rgba(255,255,255,0.97) 100%)",
      `url("${BUILDING_SRC}") center/cover no-repeat`,
      "linear-gradient(180deg, #bcdff7 0%, #e8f4fd 55%, #ffffff 100%)",
    ].join(", ");
  }

  // Layer order: scrim → photo → cobalt fallback (visible only if the photo is absent).
  return [
    `linear-gradient(100deg, ${hexA(BUILDING_COBALT_DARK, 0.95)} 0%, ${hexA(BUILDING_COBALT_DARK, 0.88)} 34%, ${hexA(BUILDING_COBALT, 0.55)} 64%, ${hexA(BUILDING_COBALT, 0.2)} 100%)`,
    `url("${BUILDING_SRC}") center/cover no-repeat`,
    `linear-gradient(115deg, ${BUILDING_COBALT_DARK} 0%, ${BUILDING_COBALT} 58%, ${BUILDING_SKY} 100%)`,
  ].join(", ");
}

function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
