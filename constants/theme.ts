/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * Colour palette tokens. Every screen reads colours from `C` (below) so the
 * whole app can switch between the combinations selected in Admin → Theme.
 */
export type Palette = {
  /** Screen background */
  page: string;
  /** Cards, inputs */
  card: string;
  /** Primary buttons, links, active icons */
  primary: string;
  /** Primary pressed/hover */
  primaryDark: string;
  /** Main text */
  ink: string;
  /** Secondary text, inactive icons */
  muted: string;
  /** Inactive bottom-tab icon/label — neutral gray in every theme so the active (primary-colored) tab stands out */
  tabInactive: string;
  /** Borders, dividers */
  line: string;
  /** Category backgrounds, secondary buttons */
  soft: string;
  /** Offers / badges background */
  badge: string;
  /** Text on `badge` */
  badgeText: string;
  /** Alias of `badge` kept for older code */
  primarySoft: string;
  success: string;
};

/**
 * Available combinations. Keys must match the backend `AppThemeSettings`
 * enum and the CSS blocks in vadi-admin/app/globals.css + vadi-site/src/index.css.
 */
export const THEMES = {
  /** Mint pages, forest buttons, sage badges. */
  "fresh-green": {
    page: "#F8FCF6",
    card: "#FCFEFA",
    primary: "#276438",
    primaryDark: "#1D4D2A",
    ink: "#183D25",
    muted: "#526B58",
    tabInactive: "#8E8E93",
    line: "#D6E5D3",
    soft: "#E4F0DF",
    badge: "#D3EAC5",
    badgeText: "#183D25",
    primarySoft: "#D3EAC5",
    success: "#4F7D5B",
  },
  /** Warm cream pages, leaf-green buttons, mango offer badges. */
  "cream-mango": {
    page: "#FFF8EC",
    card: "#FFFFFF",
    primary: "#2F6B3C",
    primaryDark: "#1E4D2C",
    ink: "#243B2A",
    muted: "#6B7280",
    tabInactive: "#8E8E93",
    line: "#E8DFCF",
    soft: "#FBEBD3",
    badge: "#F4A340",
    badgeText: "#243B2A",
    primarySoft: "#F4A340",
    success: "#2F6B3C",
  },
  /** Cream pages with warm terracotta buttons and peach highlights. */
  terracotta: {
    page: "#F7F3EC",
    card: "#FFFFFF",
    primary: "#B56A45",
    primaryDark: "#8F4F32",
    ink: "#171717",
    muted: "#6F6A64",
    tabInactive: "#8E8E93",
    line: "#E4DDD5",
    soft: "#F3E4DB",
    badge: "#FFE4D1",
    badgeText: "#171717",
    primarySoft: "#FFE4D1",
    success: "#4F7D5B",
  },
  /** Original look (git e3e7265): farm green buttons, dark-green headings, solid green badges with white text. */
  "classic-green": {
    page: "#F5F7F2",
    card: "#FFFFFF",
    primary: "#2E7D32",
    primaryDark: "#1B5E20",
    ink: "#1B5E20",
    muted: "#6B7280",
    tabInactive: "#8E8E93",
    line: "#E5E7EB",
    soft: "#E8F5E9",
    badge: "#2E7D32",
    badgeText: "#FFFFFF",
    primarySoft: "#E8F5E9",
    success: "#2E7D32",
  },
  /** Warm ivory pages, deep olive buttons, soft lime badges. */
  "olive-ivory": {
    page: "#FAF9F3",
    card: "#FFFFFF",
    primary: "#4B6036",
    primaryDark: "#394A29",
    ink: "#293124",
    muted: "#687060",
    tabInactive: "#8E8E93",
    line: "#E1E3D8",
    soft: "#E9EEDC",
    badge: "#DCE8B6",
    badgeText: "#293124",
    primarySoft: "#DCE8B6",
    success: "#4B6036",
  },
  /** Soft white pages, deep teal buttons, pale pistachio chips and badges. */
  "teal-pistachio": {
    page: "#F7FAF8",
    card: "#FFFFFF",
    primary: "#176B52",
    primaryDark: "#12533F",
    ink: "#203B32",
    muted: "#61736B",
    tabInactive: "#8E8E93",
    line: "#DCE6DF",
    soft: "#E3EED5",
    badge: "#E3EED5",
    badgeText: "#203B32",
    primarySoft: "#E3EED5",
    success: "#176B52",
  },
} satisfies Record<string, Palette>;

export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
export const DEFAULT_THEME: ThemeKey = "fresh-green";

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(THEMES, value);
}

let activeTheme: ThemeKey = DEFAULT_THEME;
let themeVersion = 0;

/**
 * The live palette. Mutated in place by `setTheme` so that any code reading
 * `C.primary` at render time gets the active theme.
 */
export const C: Palette = { ...THEMES[DEFAULT_THEME] };

/** @deprecated use `C` */
export const brand = C;

export function setTheme(key: ThemeKey) {
  if (!isThemeKey(key)) return;
  activeTheme = key;
  Object.assign(C, THEMES[key]);
  themeVersion += 1;
}

export function getThemeKey(): ThemeKey {
  return activeTheme;
}

/**
 * Wraps a `StyleSheet.create(...)` (or any object built from `C`) so it is
 * evaluated lazily and rebuilt whenever the theme changes:
 *
 *   const styles = themed(() => StyleSheet.create({ box: { backgroundColor: C.card } }));
 */
export function themed<T extends object>(factory: () => T): T {
  let cached: T | undefined;
  let cachedVersion = -1;
  const resolve = (): T => {
    if (cached === undefined || cachedVersion !== themeVersion) {
      cached = factory();
      cachedVersion = themeVersion;
    }
    return cached;
  };
  return new Proxy({} as T, {
    get: (_target, prop) => (resolve() as Record<PropertyKey, unknown>)[prop],
    has: (_target, prop) => prop in resolve(),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_target, prop) => {
      const desc = Object.getOwnPropertyDescriptor(resolve(), prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  });
}

const tintColorDark = '#fff';

export const Colors = {
  light: {
    get text() { return C.ink; },
    get background() { return C.page; },
    get tint() { return C.primary; },
    get icon() { return C.muted; },
    get tabIconDefault() { return C.tabInactive; },
    get tabIconSelected() { return C.primary; },
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
