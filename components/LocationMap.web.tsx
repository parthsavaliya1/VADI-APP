import { useEffect, useRef } from "react";
import type { LocationMapProps } from "./LocationMap";

export default function LocationMap({ html, target, onMessage }: LocationMapProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === ref.current?.contentWindow && event.data && typeof event.data === "object") onMessage(event.data);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onMessage]);
  useEffect(() => { if (target) ref.current?.contentWindow?.postMessage({ type: "recenter", coordinates: target }, "*"); }, [target]);
  return <iframe ref={ref} title="Select location on OpenStreetMap" srcDoc={html} sandbox="allow-scripts allow-same-origin" style={{ position: "absolute", width: "100%", height: "100%", border: 0 }} />;
}
