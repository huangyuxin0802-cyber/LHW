/**
 * Test map when navigating from dashboard (MessageNotificationProvider context).
 */
import { chromium } from "playwright";

const BASE = process.env.MAP_TEST_URL ?? "http://localhost:3002";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`PAGE_ERROR: ${err.message}`);
  });

  // Dashboard requires auth — expect redirect to login or 200 if session cookie exists
  console.log("1) Visit /dashboard ...");
  const dash = await page.goto(`${BASE}/dashboard`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  console.log("   status:", dash?.status(), "url:", page.url());

  console.log("2) Visit /map directly ...");
  await page.goto(`${BASE}/map`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);

  const canvas = await page.$(".maplibregl-canvas");
  const loading = await page.locator("text=正在加载底图").isVisible().catch(() => false);
  const box = canvas ? await canvas.boundingBox() : null;

  const realtimeErrors = consoleErrors.filter(
    (e) => e.includes("postgres_changes") || e.includes("inbox-notify")
  );

  console.log("\n--- Map ---");
  console.log("canvas:", Boolean(canvas), "size:", box, "loading overlay:", loading);

  console.log("\n--- Realtime / inbox errors ---");
  console.log(realtimeErrors.length ? realtimeErrors : "(none)");

  console.log("\n--- Other console errors ---");
  const other = consoleErrors.filter((e) => !realtimeErrors.includes(e));
  console.log(other.length ? other.slice(0, 5) : "(none)");

  const pass =
    Boolean(canvas) &&
    !loading &&
    (box?.width ?? 0) > 100 &&
    realtimeErrors.length === 0;

  console.log("\n--- Result ---", pass ? "PASS" : "FAIL");

  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
