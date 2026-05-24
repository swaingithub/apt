const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080/app-dashboard.html', { waitUntil: 'domcontentloaded' });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.evaluate(() => {
    if (typeof openBuilder === 'function') openBuilder();
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.screenshot({ path: '/Users/apple/.gemini/antigravity/brain/ab3458c9-996a-4692-b589-082af92275f8/artifacts/builder.png', fullPage: true });

  await page.evaluate(() => {
    if (typeof switchPreviewPlatform === 'function') switchPreviewPlatform('android');
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.screenshot({ path: '/Users/apple/.gemini/antigravity/brain/ab3458c9-996a-4692-b589-082af92275f8/artifacts/builder-android.png', fullPage: true });
  
  await browser.close();
})();
