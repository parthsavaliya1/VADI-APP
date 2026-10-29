# Local backend testing

Firebase Remote Config product_api_base_url remains https://api.product.vadindia.com for production.

In vadi-app/.env.local, enable local testing explicitly:

```env
EXPO_PUBLIC_USE_LOCAL_API=true
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:5000
```

Use your computer's LAN IPv4 address when testing on a physical phone. Keep the phone and computer on the same network, start the backend, and allow the backend port through the local firewall. For an Android emulator, use http://10.0.2.2:5000.

Restart Expo with npx expo start --clear after changing these values. Use Expo Go or a development build that permits HTTP. Production Android builds disable cleartext HTTP; this setting does not change that native restriction.

To test against production again, set EXPO_PUBLIC_USE_LOCAL_API=false and restart Expo. The override is ignored in release builds, even when enabled in the environment. Never replace the shared Firebase URL with a LAN address for local testing.
