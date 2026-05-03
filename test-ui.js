// test-ui.js - Comprehensive UI verification across all device sizes
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3090';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

const VIEWPORTS = [
  // === MOBILE ===
  { name: '01_mobile_sm_360', label: 'Mobile nhỏ (360px)', width: 360, height: 800, isMobile: true },
  { name: '02_mobile_md_390', label: 'iPhone 14 (390px)', width: 390, height: 844, isMobile: true },
  { name: '03_mobile_lg_430', label: 'iPhone 14 Pro Max (430px)', width: 430, height: 932, isMobile: true },
  // === TABLET ===
  { name: '04_tablet_sm_600', label: 'Tablet nhỏ (600px)', width: 600, height: 960, isMobile: false },
  { name: '05_tablet_md_768', label: 'iPad (768px)', width: 768, height: 1024, isMobile: false },
  { name: '06_tablet_lg_1024', label: 'iPad Pro (1024px)', width: 1024, height: 1366, isMobile: false },
  // === DESKTOP ===
  { name: '07_desktop_1280', label: 'Desktop (1280px)', width: 1280, height: 800, isMobile: false },
  { name: '08_desktop_1440', label: 'Desktop FHD (1440px)', width: 1440, height: 900, isMobile: false },
];

const PAGES_TO_CHECK = [
  { name: 'dashboard', fn: 'dashboard' },
  { name: 'workorders', fn: 'workorders' },
  { name: 'assets', fn: 'assets' },
];

async function login(page) {
  await page.waitForSelector('#login-username', { timeout: 8000 });
  await page.evaluate(() => {
    document.getElementById('login-username').value = 'admin';
    document.getElementById('login-password').value = 'admin123';
  });
  await page.evaluate(() => doLogin());
  await page.waitForSelector('#app', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));
}

async function checkBottomNav(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('bottom-nav');
    if (!el) return { found: false };
    const style = getComputedStyle(el);
    return { found: true, display: style.display, height: el.offsetHeight, visible: style.display !== 'none' };
  });
}

(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const issues = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n📐 ${vp.label} (${vp.width}x${vp.height})`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, hasTouch: vp.isMobile });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await login(page);

    // Check bottom nav behavior
    const nav = await checkBottomNav(page);
    const shouldShowNav = vp.width <= 768;
    if (shouldShowNav && (!nav.found || !nav.visible)) {
      console.log(`  ❌ Bottom Nav: MISSING on mobile! (display:${nav.display})`);
      issues.push(`${vp.label}: Bottom Nav missing`);
    } else if (!shouldShowNav && nav.visible) {
      console.log(`  ❌ Bottom Nav: Should be HIDDEN on desktop`);
      issues.push(`${vp.label}: Bottom Nav visible on desktop`);
    } else {
      console.log(`  ✅ Bottom Nav: ${nav.visible ? `VISIBLE (${nav.height}px)` : 'correctly hidden'}`);
    }

    // Screenshot each page
    for (const pg of PAGES_TO_CHECK) {
      await page.evaluate((fn) => navigate(fn), pg.fn);
      await new Promise(r => setTimeout(r, 500));
      const file = path.join(SCREENSHOTS_DIR, `${vp.name}_${pg.name}.png`);
      await page.screenshot({ path: file });
      console.log(`  📸 ${pg.name}: ${path.basename(file)}`);
    }

    await page.close();
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  if (issues.length === 0) {
    console.log('✅ ALL VIEWPORTS PASSED - Ready to deploy to NAS!');
  } else {
    console.log(`❌ ${issues.length} issue(s) found:`);
    issues.forEach(i => console.log(`  - ${i}`));
    process.exit(1);
  }
})();
