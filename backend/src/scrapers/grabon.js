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
    this.stores = [
      { path: '/amazon-coupons/',   name: 'Amazon' },
      { path: '/flipkart-coupons/', name: 'Flipkart' },
      { path: '/myntra-coupons/',   name: 'Myntra' },
      { path: '/ajio-coupons/',     name: 'AJIO' },
      { path: '/nykaa-coupons/',    name: 'Nykaa' },
      { path: '/swiggy-coupons/',   name: 'Swiggy' },
      { path: '/zomato-coupons/',   name: 'Zomato' },
      { path: '/meesho-coupons/',   name: 'Meesho' },
      { path: '/snapdeal-coupons/', name: 'Snapdeal' },
      { path: '/paytm-coupons/',    name: 'Paytm' },
    ];
  }

  cleanText(raw) {
    if (!raw) return null;
    return raw
      .replace(/\.cls-[\w-]+\{[^}]*\}/g, '')
      .replace(/\d+\s+People\s+Used\s+(Today|This Week)/gi, '')
      .replace(/\bVerified\b/gi, '')
      .replace(/See\s+more[\s\S]*?See\s+less/gi, '')
      .replace(/Get\s+Coupon/gi, '')
      .replace(/Get\s+Deal/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || null;
  }

  cleanCode(raw) {
    if (!raw) return null;
    const cleaned = raw
      .replace(/GET\s+COUPON/gi, '')
      .replace(/GET\s+DEAL/gi, '')
      .replace(/COPY/gi, '')
      .replace(/\s+/g, '')
      .trim();
    if (/^[A-Z0-9]{3,20}$/.test(cleaned)) return cleaned;
    return null;
  }

  async scrape() {
    const allCoupons = [];

    for (const store of this.stores) {
      try {
        const coupons = await this.scrapeStorePage(`${this.baseUrl}${store.path}`, store.name);
        allCoupons.push(...coupons);
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
      } catch (err) {
        logger.error(`[${this.name}] Failed to scrape ${store.path}: ${err.message}`);
      }
    }

    return allCoupons;
  }

  async scrapeStorePage(url, merchantName) {
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
        const title = this.cleanText(card.title);
        if (!title) continue;
        coupons.push({
          title,
          code: this.cleanCode(card.code),
          type: card.type,
          discount: this.cleanText(card.discount) || null,
          description: this.cleanText(card.description) || null,
          expiryDate: this.parseExpiry(card.expiryRaw),
          merchantName,
          sourceUrl: url,
          source: 'grabon',
          categories: this.inferCategories(merchantName),
        });
      }

      logger.info(`[${this.name}] ${merchantName} → ${coupons.length} coupons`);
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
