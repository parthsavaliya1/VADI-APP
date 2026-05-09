/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...(config.android?.config?.googleMaps || {}),
          apiKey: mapsKey || config.android?.config?.googleMaps?.apiKey || "",
        },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey:
          mapsKey || config.ios?.config?.googleMapsApiKey || "",
      },
    },
    plugins: [
      ...(config.plugins || []),
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "VADI uses your location to show the map when you pick a delivery address.",
          locationAlwaysAndWhenInUsePermission:
            "VADI uses your location to show the map when you pick a delivery address.",
        },
      ],
    ],
  };
};
