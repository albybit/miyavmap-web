#!/usr/bin/env node
/* One-off READ-ONLY exporter for the landing page's pins.json (LANDING_SPEC §4).
   Zero npm dependencies — plain Node 18+ (fetch built in).

   What it does:
     1. Reads apiKey + projectId from the app's google-services.json.
     2. Signs in ANONYMOUSLY (the read class firestore.rules already grants),
        deletes that throwaway session again when done.
     3. Reads `cards` via the Firestore REST API — no writes of any kind.
     4. Keeps only {lat, lng, rarity, name}: not-hidden, geolocated, newest first,
        capped at --max (default 40). Nothing sensitive ships: no ids, no owners,
        no photos (LANDING_SPEC §4).

   Usage:
     node tools/export-pins.mjs [--config path/to/google-services.json]
       [--center 41.90,12.49 --radius-km 3]   # trim to the seeded neighborhood
       [--max 40] [--out pins.json]

   Note: if the Android API key is restricted to Android apps in Google Cloud
   console, the anonymous sign-in step fails with 403 — export via the Firebase
   console instead, or temporarily use an unrestricted browser key. */

import { readFileSync, writeFileSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const configPath = arg("config",
  new URL("../../../catchcat/app/google-services.json", import.meta.url).pathname);
const outPath = arg("out", new URL("../pins.json", import.meta.url).pathname);
const maxPins = Number(arg("max", 40));
const center = arg("center", "").split(",").map(Number);
const radiusKm = Number(arg("radius-km", 0));

const gs = JSON.parse(readFileSync(configPath, "utf8"));
const projectId = gs.project_info.project_id;
const apiKey = gs.client[0].api_key[0].current_key;
console.log(`Project: ${projectId}`);

// 1 — throwaway anonymous session (same access class as the app's guests)
const authRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
  { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }) });
if (!authRes.ok) throw new Error(`Anonymous sign-in failed (${authRes.status}): ${await authRes.text()}`);
const { idToken } = await authRes.json();

try {
  // 2 — one-shot read of cards (field-masked; no writes, no listeners)
  const queryRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: "cards" }],
        select: { fields: ["catName", "rarity", "latitude", "longitude", "hidden", "timestamp"]
          .map(fieldPath => ({ fieldPath })) },
        limit: 1000
      } }) });
  if (!queryRes.ok) throw new Error(`Firestore query failed (${queryRes.status}): ${await queryRes.text()}`);

  const val = f => f == null ? undefined
    : f.doubleValue ?? (f.integerValue != null ? Number(f.integerValue) : undefined)
      ?? f.stringValue ?? f.booleanValue;
  const rows = (await queryRes.json())
    .filter(r => r.document)
    .map(r => Object.fromEntries(
      Object.entries(r.document.fields ?? {}).map(([k, f]) => [k, val(f)])));

  const distKm = (a, b, c, d) => {
    const rad = x => x * Math.PI / 180, R = 6371;
    const h = Math.sin(rad(c - a) / 2) ** 2 +
      Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const pins = rows
    .filter(c => c.hidden !== true && c.latitude && c.longitude && c.catName && c.rarity)
    .filter(c => !(center.length === 2 && radiusKm > 0) ||
      distKm(center[0], center[1], c.latitude, c.longitude) <= radiusKm)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, maxPins)
    .map(c => ({
      lat: Number(c.latitude.toFixed(4)),   // already fuzzed server-side; ~110 m grid
      lng: Number(c.longitude.toFixed(4)),
      rarity: c.rarity.toLowerCase(),       // matches assets/pin-<rarity>.svg
      name: c.catName
    }));

  writeFileSync(outPath, JSON.stringify(pins, null, 2).replace(/\n {4}/g, " ").replace(/\n {2}}/g, " }") + "\n");
  console.log(`Read ${rows.length} cards → wrote ${pins.length} pins to ${outPath}`);
  console.log("Review the file before committing: names + fuzzed coords + tiers only.");
} finally {
  // 3 — clean up the throwaway anonymous account
  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }) }).catch(() => {});
}
