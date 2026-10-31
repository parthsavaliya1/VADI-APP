/** Expo Go includes its own Android Maps key; GPS does not depend on Maps. */
export function getAddressCapabilities(platform: string, expoGo: boolean, androidMapsConfigured: boolean) {
  return {
    location: platform === "ios" || platform === "android",
    maps: platform === "ios" || (platform === "android" && (expoGo || androidMapsConfigured)),
  };
}
