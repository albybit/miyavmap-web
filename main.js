/* MiyavMap Web v0 — theme toggle + lazy map teaser (LANDING_SPEC §3/§4).
   pins.json is a static, committed snapshot ({lat, lng, rarity, name}) — a screenshot
   in data form, not a sync. Current file is PLACEHOLDER data pending the real export
   from the seeded neighborhood; the map centers itself on whatever the file contains. */

// ── theme toggle ─────────────────────────────────────────
const root = document.documentElement;
const stored = localStorage.getItem("mm-theme");
if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

document.getElementById("themeToggle").addEventListener("click", () => {
  const dark = root.getAttribute("data-theme") === "dark" ||
    (!root.hasAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("mm-theme", next);
});

// ── lazy map teaser ──────────────────────────────────────
// Leaflet (vendored) + pins.json load only when the band nears the viewport,
// so tiles cost nothing for visitors who never scroll to the map.
const mapEl = document.getElementById("map");
const TIER_LABEL = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

new IntersectionObserver((entries, obs) => {
  if (!entries.some(e => e.isIntersecting)) return;
  obs.disconnect();
  const leaflet = document.createElement("script");
  leaflet.src = "vendor/leaflet.js";
  leaflet.onload = initMap;
  document.head.appendChild(leaflet);
}, { rootMargin: "300px" }).observe(mapEl);

async function initMap() {
  const pins = await (await fetch("pins.json")).json();
  const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]));

  const map = L.map(mapEl, {
    center: bounds.getCenter(),
    zoom: 13,
    minZoom: 12,            // the teaser stays a teaser (LANDING_SPEC §4)
    maxZoom: 17,
    maxBounds: bounds.pad(1.5),
    scrollWheelZoom: false, // no scroll-jacking mid-page; drag + buttons still work
    keyboard: true
  });
  // Leaflet's default prefix carries an emoji — no emoji in UI chrome (README rule 7)
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  for (const p of pins) {
    L.marker([p.lat, p.lng], {
      icon: L.icon({
        iconUrl: `assets/pin-${p.rarity}.svg`,
        iconSize: [32, 40],   // 48×60 asset at 32 px wide, anchored at the tip
        iconAnchor: [16, 40],
        tooltipAnchor: [0, -40],
        className: "pin-classic"
      }),
      alt: `${p.name}, ${TIER_LABEL[p.rarity]} street cat`
    }).addTo(map)
      .bindTooltip(`${p.name} — ${TIER_LABEL[p.rarity]}`, { direction: "top" });
  }
}
