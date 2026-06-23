'use strict';

const { chromium } = require('playwright');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Bank/card keywords that indicate a card-specific promo code
const BANK_CODE_PATTERN = /HDFC|SBI|ICICI|AXIS|KOTAK|YESBANK|IDFC|BOBCARD|CANARA|PNB|UNION|AMEX|VISA|RUPAY|MASTER|CITI|INDUS|FEDERAL|PAYTMBANK|AIRTEL/i;

class BaseScraper {
  constructor(name) {
    this.name = name;
    this.browser = null;
    this.proxyList = process.env.PROXY_LIST
      ? process.env.PROXY_LIST.split(',').map((p) => p.trim())
      : [];
  }

  fingerprint(merchantSlug, code, title) {
    const raw = `${merchantSlug}|${(code || '').toLowerCase().trim()}|${title.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  /**
   * Determine coupon priority:
   * 1 = direct usable code (copy & paste, works for anyone)
   * 2 = bank/card-specific code (only works with specific card)
   * 3 = deal / no code needed
   */
  detectPriority(code) {
    if (!code) return 3;
    if (BANK_CODE_PATTERN.test(code)) return 2;
    return 1;
  }

  randomProxy() {
    if (!this.proxyList.length) return null;
    return this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
  }

  async launchBrowser() {
    const proxy = this.randomProxy();
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      ...(proxy ? { proxy: { server: proxy } } : {}),
    });
    logger.info(`[${this.name}] Browser launched`);
  }

  async closeBrowser() {
    if (this.browser) { await this.browser.close(); this.browser = null; }
  }

  async newPage() {
    const ctx = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-IN',
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    return page;
  }

  async navigate(page, url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        return;
      } catch (err) {
        logger.warn(`[${this.name}] Navigate attempt ${attempt}/${retries} failed: ${err.message}`);
        if (attempt === retries) throw err;
        await page.waitForTimeout(1500 * attempt);
      }
    }
  }

  slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  }

  parseExpiry(str) {
    if (!str) return null;
    try {
      const daysMatch = str.match(/in\s+(\d+)\s+days?/i);
      if (daysMatch) { const d = new Date(); d.setDate(d.getDate() + parseInt(daysMatch[1])); return d; }
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch { return null; }
  }

  /**
   * Run tasks concurrently with a limit.
   * Each task is a function () => Promise<result[]>
   * Returns flat array of all results.
   *
   * @param {Function[]} tasks
   * @param {number} limit - max parallel tasks (default 5)
   */
  async runConcurrent(tasks, limit = 5) {
    const results = [];
    const queue = [...tasks];
    const active = new Set();

    return new Promise((resolve, reject) => {
      const next = () => {
        if (queue.length === 0 && active.size === 0) {
          return resolve(results.flat());
        }
        while (active.size < limit && queue.length > 0) {
          const task = queue.shift();
          const p = task()
            .then((r) => { results.push(r); })
            .catch((err) => { logger.warn(`[${this.name}] Task error: ${err.message}`); results.push([]); })
            .finally(() => { active.delete(p); next(); });
          active.add(p);
        }
      };
      next();
    });
  }

  async scrape() {
    throw new Error(`${this.name}.scrape() not implemented`);
  }

  async run() {
    await this.launchBrowser();
    try {
      return await this.scrape();
    } finally {
      await this.closeBrowser();
    }
  }
}

module.exports = BaseScraper;
