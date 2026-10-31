# VADI app configuration audit — 29 October 2026

## Applied corrections

- Android notification small icon now uses assets/images/notification-icon.png: a 96 × 96 white V-and-leaf mark with transparency. The tray tint is VADI green (#276438).
- Added an explicit expo-image-picker plugin with a product-photo usage description. Camera permission is blocked because the app selects existing photos. Microphone permission stays enabled and described for voice search.
- Set the root background to white, matching the native splash background.
- Regenerated the stale Android project with Expo prebuild. Expo automatically recreated the outdated generated folder. The package/namespace is now com.vadi.app, versionName 1.0.1, backups disabled, cleartext traffic disabled, Firebase notification metadata present, and Expo Updates enabled with the configured EAS URL.
- Aligned React Native to the patch version required by Expo (0.88.1).

## Verified

- EAS project lookup returned @vadi-app/vadi-product and ID f388db81-48ff-4df8-a155-1e55f92484c4, matching owner, slug, extra.eas.projectId and updates.url.
- The local Android Firebase client configuration belongs to vadi-app-fresh and contains a client for com.vadi.app; its app ID agrees with extra.firebase.
- firebase.ts intentionally uses a separate vadi-hisab Remote Config project/key product_api_base_url. This is separate from Android FCM registration; it has not been changed.
- Expo configuration introspection confirms iOS photo, microphone and speech-recognition descriptions, and Android voice permission. Camera, background location and broad media/storage permissions are removed.
- Compile SDK 37 and target SDK 36 are emitted into Android Gradle properties. Native compilation and store validation are still required.
- The installed Expo iOS icon-generation plugin produces an opaque 1024-pixel icon from the source image; the existing transparent 500-pixel source is preserved. A higher-resolution original would improve source quality but is not required to resolve configuration.
- Shop policy/deletion URLs point to https://vadindia.com/shop/privacy-policy and https://vadindia.com/shop/delete-account. Those pages were built locally; portal deployment is still required.
- Production EAS builds use Android app-bundle output, remote version codes and autoIncrement. The appVersion runtime policy is valid; increment the app version before releasing incompatible native changes or publishing an update for a new native runtime.

## Remaining production setup

1. EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is absent from the EAS production environment and this app's local configuration. The existing production guard stops builds when it is missing. Add the appropriate Android Maps API key to the EAS production environment (and verify its API/package/signing restrictions). Do not paste the key into chat.
2. GOOGLE_SERVICES_JSON is absent from EAS production while google-services.json is intentionally ignored by Git. An attempt to add the existing matching file as a secret EAS file variable was blocked by automatic approval review because the audit request did not explicitly authorize uploading that configuration. No upload was made. Explicit user approval is needed before retrying.
3. A signed native build, notification delivery, app links, maps, iOS signing/APNs and store-account declarations have not been certified by this audit. Regenerated source configuration is not a device test.

## Notification asset provenance

Created with the built-in ImageGen tool from the existing app logo; then resized and normalized to pure-white RGB with its alpha preserved for Android's required 96 × 96 PNG format. The app launcher and splash logos were not replaced.

Saved asset: assets/images/notification-icon.png.

Generation prompt: Preserve the logo's large V-and-leaf symbol, remove all lettering and decorations, and produce a solid white Android notification icon on transparent background, centered with clear padding and no gradients or shadows.

Final cleanup prompt: Keep the V and single-leaf proportions; remove speckles, distressed edges, stray pixels and texture; use a smooth solid-white silhouette with a transparent curved leaf vein and transparent canvas. No lettering, shadow or border.

## Final validation

- Expo prebuild and Android/iOS configuration introspection passed.
- Expo dependency compatibility check passed after the React Native patch alignment.
- TypeScript passed and all 14 session/Firebase tests passed.
- Additional assertions passed for package identity, asset files, unique plugin entries, production app-bundle output, Updates project alignment and the missing-Maps-key production guard.
- npm installation reported 8 dependency advisories (5 low and 3 high); these have not been triaged in this configuration audit. No broad or force dependency audit fix was applied.

Exact final ImageGen cleanup prompt:

> Technical cleanup of the edit target. Keep the white V with its single leaf and overall proportions. Reconstruct it as a perfectly smooth, clean, flat white icon silhouette suitable for a tiny Android notification icon. Remove absolutely every speckle, scratch, stray pixel, distressed edge, and random fragment inside and outside the main silhouette. The only transparent internal feature is one simple smooth curved leaf vein. White shape fill must be solid pure #FFFFFF, no texture or shading. All edges should be clean smooth vector-like curves and straight edges. Genuinely transparent canvas. No lettering, no shadow, no border. Square canvas, generous clear padding. The result should look like a precision drawn flat icon, not a traced noisy photo.

## APK build fix — Razorpay namespace collision

Failed EAS preview build: 824fa85d-dc14-4c45-a79a-b54e55a02c14. Its Run gradlew logs identify standard-core 1.7.1 and core 1.0.1 as sharing com.razorpay, rejected by Android Gradle Plugin 9. This is distinct from the Gradle deprecation warning.

Added plugins/withRazorpaySdk.js to app.json. Its generated root Gradle rule selects com.razorpay:standard-core:1.7.18 wherever the installed React Native wrapper requests its older Android SDK. The SDK's own POM selects core 1.0.18. No SDK classes are excluded and namespace validation stays enabled.

Verified the official Maven AAR manifests: standard-core 1.7.18 declares com.razorpay.checkout.lib; core 1.0.18 declares com.razorpay. Checked the classes and API symbols used by the React Native wrapper, including Checkout.handleActivityResult, Checkout.RZP_REQUEST_CODE and PaymentData.getData. Expo prebuild succeeds and emits the persistent Gradle rule. Three regeneration/idempotence tests pass.

A full native build has not been repeated locally because the Android SDK is not installed. Rebuild with: eas build -p android --profile preview. Once installed, test payment success, cancellation and error handling with Razorpay test credentials before releasing.
