'use strict';

const { chromium } = require('playwright');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * BaseScraper — all site-specific scrapers extend this.
 * Handles: browser lifecycle, proxy rotation, retry logic, fingerprinting.
 */
class BaseScraper {
  constructor(name) {
    this.name = name;
    this.browser = null;
    this.proxyList = process.env.PROXY_LIST
      ? process.env.PROXY_LIST.split(',').map((p) => p.trim())
      : [];
  }

  /** Generate dedup fingerprint for a coupon */
  fingerprint(merchantSlug, code, title) {
    const raw = `${merchantSlug}|${(code || '').toLowerCase().trim()}|${title.toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  /** Pick a random proxy from the list (or null if none configured) */
  randomProxy() {
    if (!this.proxyList.length) return null;
    return this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
  }

  async launchBrowser() {
    const proxy = this.randomProxy();
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    };
    if (proxy) {
      launchOptions.proxy = { server: proxy };
    }
    this.browser = await chromium.launch(launchOptions);
    logger.info(`[${this.name}] Browser launched${proxy ? ` via proxy ${proxy}` : ''}`);
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async newPage() {
    const ctx = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-IN',
    });
    const page = await ctx.newPage();

    // Hide automation signals
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    return page;
  }

  /**
   * Navigate to a URL with retry logic.
   * @param {import('playwright').Page} page
   * @param {string} url
   * @param {number} retries
   */
  async navigate(page, url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return;
      } catch (err) {
        logger.warn(`[${this.name}] Navigate attempt ${attempt}/${retries} failed: ${err.message}`);
        if (attempt === retries) throw err;
        await page.waitForTimeout(2000 * attempt);
      }
    }
  }

  /**
   * Slugify a merchant name → url-safe slug
   */
  slugify(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Parse a human-readable expiry string → Date or null
   * Handles: "31 Dec 2024", "31-12-2024", "Expires in 3 days", etc.
   */
  parseExpiry(str) {
    if (!str) return null;
    try {
      // "in X days" pattern
      const daysMatch = str.match(/in\s+(\d+)\s+days?/i);
      if (daysMatch) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(daysMatch[1]));
        return d;
      }
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  /**
   * Override in subclass — should return array of coupon objects:
   * { title, code, type, discount, description, expiryDate, merchantName, sourceUrl, categories }
   */
  async scrape() {
    throw new Error(`${this.name}.scrape() not implemented`);
  }

  /**
   * Run the full scrape with browser lifecycle management.
   */
  async run() {
    const results = [];
    await this.launchBrowser();
    try {
      const coupons = await this.scrape();
      results.push(...coupons);
      logger.info(`[${this.name}] Scraped ${results.length} coupons`);
    } finally {
      await this.closeBrowser();
    }
    return results;
  }
}

module.exports = BaseScraper;
