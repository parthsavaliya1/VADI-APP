import { useEffect, useRef } from "react";
import { WebView } from "react-native-webview";
import { StyleSheet } from "react-native";
import type { Coordinates, MapMessage } from "@/utils/locationMap";

export type LocationMapProps = { html: string; target: Coordinates | null; onMessage: (message: MapMessage) => void };

export default function LocationMap({ html, target, onMessage }: LocationMapProps) {
  const ref = useRef<WebView<object>>(null);
  useEffect(() => {
    if (target) ref.current?.injectJavaScript(`window.setLocation && window.setLocation(${JSON.stringify(target)}); true;`);
  }, [target]);
  return <WebView<object> ref={ref} style={StyleSheet.absoluteFill} source={{ html }} originWhitelist={["*"]}
    userAgent="VADI-LocationPicker/1.0 (+https://vadindia.com)" javaScriptEnabled domStorageEnabled cacheEnabled
    geolocationEnabled={false} mixedContentMode="never" setSupportMultipleWindows={false}
    onShouldStartLoadWithRequest={request => request.url === "about:blank"}
    onError={() => onMessage({ type: "error" })} onHttpError={() => onMessage({ type: "error" })}
    onMessage={event => { try { onMessage(JSON.parse(event.nativeEvent.data)); } catch { onMessage({ type: "error" }); } }} />;
}
