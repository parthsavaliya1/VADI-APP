export type Coordinates = { latitude: number; longitude: number };
export type MapMessage = { type: "ready" | "moving" | "center" | "error"; latitude?: number; longitude?: number };
export type TileProvider = { url: string; attribution: string; maxZoom: number };

export const DEFAULT_TILE_PROVIDER: TileProvider = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

export function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const { latitude, longitude } = value as Coordinates;
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

// Escape HTML-sensitive characters before embedding configuration in a script element.
const scriptJSON = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export function locationMapHTML(initial: Coordinates | null, tiles: TileProvider) {
  if (!/^https:\/\//.test(tiles.url)) throw new Error("Map tile URL must use HTTPS.");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;width:100%;margin:0}body{background:#eaeecf}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map"></div>
<script>
function send(data){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(data));else parent.postMessage(data,'*')}
window.onerror=function(){send({type:'error'})};
var loadTimer=setTimeout(function(){send({type:'error'})},20000);
</script><script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" onerror="send({type:'error'})"></script><script>
var initial=${scriptJSON(initial)},tiles=${scriptJSON(tiles)};
var map=L.map('map',{zoomControl:false,worldCopyJump:true});
if(initial)map.setView([initial.latitude,initial.longitude],15);else map.fitWorld();
L.control.zoom({position:'topright'}).addTo(map);
var ready=false,failed=false;
function center(){var p=map.getCenter().wrap();send({type:'center',latitude:p.lat,longitude:p.lng})}
var layer=L.tileLayer(tiles.url,{attribution:tiles.attribution,maxZoom:tiles.maxZoom,referrerPolicy:'strict-origin-when-cross-origin',keepBuffer:2}).addTo(map);
layer.on('loading',function(){send({type:'moving'})});
layer.on('tileerror',function(){failed=true;send({type:'error'})});
layer.on('load',function(){clearTimeout(loadTimer);if(!failed){ready=true;send({type:'ready'});center()}});
map.on('movestart',function(){send({type:'moving'})});
map.on('moveend',function(){if(ready)center()});
window.setLocation=function(p){if(p&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude))map.setView([p.latitude,p.longitude],16,{animate:false})};
window.addEventListener('message',function(e){if(e.source===parent&&e.data&&e.data.type==='recenter')window.setLocation(e.data.coordinates)});
</script></body></html>`;
}
