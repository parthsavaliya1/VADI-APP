import { C, getThemeKey } from "@/constants/theme";

// Home-only art direction. Keep the shared palette (and bottom tabs) intact,
// and continue to honour alternative palettes selected in the admin panel.
const pantry = {
  page: "#FFF9F0",
  card: "#FFFCF6",
  primary: "#164F2D",
  primaryDark: "#103C22",
  ink: "#173D26",
  muted: "#626A56",
  line: "#CAD0B6",
  soft: "#EAEECF",
  badge: "#BE561D",
  badgeText: "#FFFFFF",
};

export const HomeColors = new Proxy(C, {
  get(target, key: string | symbol) {
    return getThemeKey() === "fresh-green" && typeof key === "string" && key in pantry
      ? pantry[key as keyof typeof pantry]
      : Reflect.get(target, key);
  },
});

// Use the app's existing botanical artwork; no new download or image dependency.
export const botanicalLeaves = require("@/assets/images/auth-bg-leaves.png");
