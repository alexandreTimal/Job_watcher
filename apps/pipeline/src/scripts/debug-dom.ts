import { chromium } from "playwright";

async function debugHellowork() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.hellowork.com/fr-fr/emploi/recherche.html?k=développeur&l=Lyon", { waitUntil: "networkidle", timeout: 30_000 });

  const cookieBtn = await page.$('button:has-text("Accepter"), button:has-text("Tout accepter")');
  if (cookieBtn) { await cookieBtn.click(); await page.waitForTimeout(1000); }

  const html = await page.evaluate(() => {
    const card = document.querySelector('[data-cy="serpCard"]');
    return card?.outerHTML?.slice(0, 3000) ?? "NOT FOUND";
  });

  console.log(html);
  await browser.close();
}

debugHellowork();
