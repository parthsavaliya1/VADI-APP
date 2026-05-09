import { Dimensions } from "react-native";

const { width: windowWidth } = Dimensions.get("window");

/** Tuned to farm banner + UI (see scripts/process-auth-bg-assets.mjs) */
export const BG_SURFACE = "#F1F6ED";
export const BG_GRADIENT_MID = "#E3ECDA";

export const SCREEN_WIDTH = windowWidth;

/** Bottom farm banner height from asset ratio 473×170 */
export const AUTH_FARM_SECTION_HEIGHT = Math.round((windowWidth * 170) / 473);
export const AUTH_LEAF_DISPLAY_WIDTH = Math.min(
  Math.round(windowWidth * 0.4),
  200
);

export function leafImageHeight(): number {
  return Math.round((AUTH_LEAF_DISPLAY_WIDTH * 236) / 150);
}
