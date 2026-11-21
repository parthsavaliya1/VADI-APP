import { Dimensions } from "react-native";
import { C } from "@/constants/theme";

const { width: windowWidth } = Dimensions.get("window");

/** Resolve at render time, after the admin-selected theme has loaded. */
export function getAuthBackgroundColors(): [string, string, string] {
  return [C.page, C.page, C.page];
}

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
