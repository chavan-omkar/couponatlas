'use strict';

const BaseScraper = require('./base-scraper');
const logger = require('../utils/logger');

/**
 * GrabOn scraper
 * Target: https://www.grabon.in
 * Structure: store pages at /[merchant]-coupons/
 */
class GrabOnScraper extends BaseScraper {
  constructor() {
    super('GrabOn');
    this.baseUrl = 'https://www.grabon.in';
    this.storeUrls = [
      '/amazon-coupons/',
      '/flipkart-coupons/',
      '/myntra-coupons/',
      '/ajio-coupons/',
      '/nykaa-coupons/',
      '/swiggy-coupons/',
      '/zomato-coupons/',
      '/meesho-coupons/',
      '/snapdeal-coupons/',
      '/paytm-coupons/',
    ];
  }

  async scrape() {
    const allCoupons = [];

    for (const storePath of this.storeUrls) {
      try {
        const coupons = await this.scrapeStorePage(`${this.baseUrl}${storePath}`);
        allCoupons.push(...coupons);
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
      } catch (err) {
        logger.error(`[${this.name}] Failed to scrape ${storePath}: ${err.message}`);
      }
    }

    return allCoupons;
  }

  async scrapeStorePage(url) {
    const page = await this.newPage();
    const coupons = [];

    try {
      await this.navigate(page, url);

      await page
        .waitForSelector('[class*="coupon"], [class*="offer"], .coupons-list', {
          timeout: 10000,
        })
        .catch(() => {});

      // GrabOn uses infinite scroll — scroll down twice to load more
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await page.waitForTimeout(800);
      }

      const merchantName = await page
        .locator('h1, [class*="store-name"], [class*="merchant-name"]')
        .first()
        .textContent()
        .catch(() => {
          // Derive from URL: /amazon-coupons/ → amazon
          return url
            .split('/')
            .filter(Boolean)
            .pop()
            .replace('-coupons', '')
            .replace(/-/g, ' ');
        });

      const cards = await page.evaluate((sourceUrl) => {
        const results = [];

        const selectors = [
          '[class*="coupon-box"]',
          '[class*="coupon-card"]',
          '[class*="coupon-item"]',
          '[class*="offer-box"]',
          '[class*="deal-box"]',
          '.coupon',
          'li[class*="coupon"]',
        ];

        let containers = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 2) {
            containers = Array.from(found);
            break;
          }
        }

        for (const card of containers) {
          const getText = (sels) => {
            for (const s of sels) {
              const el = card.querySelector(s);
              if (el) return el.textContent.trim();
            }
            return null;
          };

          const title = getText([
            'h3',
            'h2',
            '[class*="title"]',
            '[class*="heading"]',
            'strong',
            '[class*="coupon-title"]',
          ]);

          if (!title || title.length < 5) continue;

          let code = getText([
            '[class*="coupon-code"]',
            '[class*="code-text"]',
            'input[type="text"]',
            '[class*="code"]',
          ]);

          // GrabOn sometimes stores code in input value
          const inputEl = card.querySelector('input[type="text"][value]');
          if (!code && inputEl) code = inputEl.value;

          // Filter out placeholder text
          if (code && /^(get|copy|show|reveal|click|no code|automatic)/i.test(code)) {
            code = null;
          }

          const discount = getText([
            '[class*="discount"]',
            '[class*="off"]',
            '[class*="cashback"]',
            '[class*="save"]',
          ]);

          const description = getText([
            '[class*="description"]',
            '[class*="terms"]',
            'p',
          ]);

          const expiry = getText([
            'time',
            '[class*="expire"]',
            '[class*="expiry"]',
            '[class*="valid"]',
          ]);

          results.push({
            title,
            code: code ? code.toUpperCase().trim() : null,
            type: code ? 'code' : 'deal',
            discount: discount || null,
            description: description || null,
            expiryRaw: expiry || null,
            sourceUrl,
          });
        }

        return results;
      }, url);

      for (const card of cards) {
        coupons.push({
          ...card,
          merchantName: merchantName?.trim() || 'Unknown',
          expiryDate: this.parseExpiry(card.expiryRaw),
          source: 'grabon',
          categories: this.inferCategories(merchantName || ''),
        });
      }

      logger.info(`[${this.name}] ${url} → ${coupons.length} coupons`);
    } finally {
      await page.context().close();
    }

    return coupons;
  }

  inferCategories(merchantName) {
    const name = merchantName.toLowerCase();
    if (/amazon|flipkart|snapdeal|meesho/.test(name)) return ['Shopping', 'E-commerce'];
    if (/myntra|ajio|nykaa|fashion/.test(name)) return ['Fashion', 'Clothing'];
    if (/swiggy|zomato|food/.test(name)) return ['Food & Dining'];
    if (/paytm|phonepe/.test(name)) return ['Payments', 'Wallet'];
    if (/hotel|travel|flight|makemytrip/.test(name)) return ['Travel'];
    return ['Shopping'];
  }
}

module.exports = GrabOnScraper;
