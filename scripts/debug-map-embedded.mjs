/**
 * Test embedded map shell used in ChatArea (600px container).
 */
import { chromium } from "playwright";

const BASE = process.env.MAP_TEST_URL ?? "http://localhost:3002";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const tileUrls = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("openstreetmap")) tileUrls.push(url);
  });

  console.log("Load home, inject embedded MapArea via client navigation to /map?embedded=1 test page");

  // Use a minimal test route: we'll mount map in a 600px box via evaluate on /map
  await page.goto(`${BASE}/map`, { waitUntil: "domcontentloaded" });

  // Shrink viewport container to simulate embedded panel
  await page.evaluate(() => {
    const root = document.querySelector(".h-screen");
    if (root) {
      root.classList.remove("h-screen");
      root.style.height = "600px";
      root.style.width = "100%";
    }
  });

  await page.waitForTimeout(5000);

  const canvas = await page.$(".maplibregl-canvas");
  const box = canvas ? await canvas.boundingBox() : null;
  const loading = await page.locator("text=正在加载底图").isVisible().catch(() => false);

  console.log("canvas:", Boolean(canvas), "size:", box, "tiles:", tileUrls.length, "loading:", loading);

  const pass =
    Boolean(canvas) &&
    !loading &&
    (box?.height ?? 0) >= 400 &&
    tileUrls.length > 0;

  console.log(pass ? "PASS" : "FAIL");
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
