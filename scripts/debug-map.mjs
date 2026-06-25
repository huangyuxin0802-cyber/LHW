/**
 * Headless browser check: does /map mount maplibre and request OSM tiles?
 */
import { chromium } from "playwright";

const BASE = process.env.MAP_TEST_URL ?? "http://localhost:3002";
const MAP_PATH = "/map";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  const networkUrls = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("request", (req) => {
    const url = req.url();
    if (
      url.includes("openstreetmap") ||
      url.includes("maplibre") ||
      url.includes("style.json") ||
      url.includes("MapArea")
    ) {
      networkUrls.push(url);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`PAGE_ERROR: ${err.message}`);
  });

  console.log(`Navigating to ${BASE}${MAP_PATH} ...`);
  const response = await page.goto(`${BASE}${MAP_PATH}`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });

  console.log("HTTP status:", response?.status());

  await page.waitForTimeout(5000);

  const canvas = await page.$(".maplibregl-canvas");
  const loadingText = await page
    .locator("text=正在加载底图")
    .isVisible()
    .catch(() => false);

  const mapContainer = await page.$(".maplibregl-map");
  const containerBox = mapContainer
    ? await mapContainer.boundingBox()
    : null;

  const canvasBox = canvas ? await canvas.boundingBox() : null;

  console.log("\n--- DOM ---");
  console.log("maplibregl-map found:", Boolean(mapContainer));
  console.log("maplibregl-canvas found:", Boolean(canvas));
  console.log("still showing loading overlay:", loadingText);
  console.log("container size:", containerBox);
  console.log("canvas size:", canvasBox);

  console.log("\n--- Network (map-related) ---");
  if (networkUrls.length === 0) {
    console.log("(none)");
  } else {
    networkUrls.slice(0, 15).forEach((u) => console.log(u));
    if (networkUrls.length > 15) {
      console.log(`... and ${networkUrls.length - 15} more`);
    }
  }

  console.log("\n--- Console errors ---");
  if (consoleErrors.length === 0) {
    console.log("(none)");
  } else {
    consoleErrors.forEach((e) => console.log(e));
  }

  const osmTiles = networkUrls.filter((u) => u.includes("openstreetmap"));
  const pass =
    Boolean(canvas) &&
    !loadingText &&
    (canvasBox?.width ?? 0) > 100 &&
    (canvasBox?.height ?? 0) > 100 &&
    osmTiles.length > 0;

  console.log("\n--- Result ---");
  console.log(pass ? "PASS: map appears to have loaded" : "FAIL: map did not load properly");

  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(2);
});
