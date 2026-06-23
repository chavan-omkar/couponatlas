'use strict';

const BaseScraper = require('./base-scraper');
const logger = require('../utils/logger');

/**
 * CouponDunia scraper
 * Scrapes the "All Stores" listing and individual store pages.
 * Target: https://www.coupondunia.in
 */
class CouponDuniaScraper extends BaseScraper {
  constructor() {
    super('CouponDunia');
    this.baseUrl = 'https://www.coupondunia.in';
    // Top stores to scrape — extend this list via admin
    this.storeUrls = [
      '/amazon',
      '/flipkart',
      '/myntra',
      '/ajio',
      '/nykaa',
      '/swiggy',
      '/zomato',
      '/meesho',
      '/snapdeal',
      '/paytm',
    ];
  }

  async scrape() {
    const allCoupons = [];

    for (const storePath of this.storeUrls) {
      try {
        const coupons = await this.scrapeStorePage(`${this.baseUrl}${storePath}`);
        allCoupons.push(...coupons);
        // Polite delay between stores
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

      // Extract merchant name from the page heading or URL
      const merchantName = await page
        .locator('h1, .store-name, [class*="store-title"]')
        .first()
        .textContent()
        .catch(() => url.split('/').pop());

      // Wait for coupon cards to load
      await page
        .waitForSelector(
          '[class*="coupon"], [class*="offer"], [class*="deal"], .card',
          { timeout: 10000 }
        )
        .catch(() => {});

      // Scroll to trigger lazy-loading
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1000);

      // Extract all coupon cards using multiple selector strategies
      const cards = await page.evaluate((sourceUrl) => {
        const results = [];

        // Try multiple selectors for coupon containers
        const selectors = [
          '[class*="coupon-card"]',
          '[class*="coupon-item"]',
          '[class*="offer-card"]',
          '[class*="deal-card"]',
          '[class*="coupon_card"]',
          '.coupon',
          '.offer',
        ];

        let containers = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            containers = Array.from(found);
            break;
          }
        }

        for (const card of containers) {
          const getText = (selList) => {
            for (const s of selList) {
              const el = card.querySelector(s);
              if (el) return el.textContent.trim();
            }
            return null;
          };

          const title = getText([
            '[class*="title"]',
            '[class*="heading"]',
            'h3',
            'h2',
            'strong',
          ]);

          if (!title) continue;

          // Code: look for a "reveal code" button or a visible code element
          let code = getText([
            '[class*="coupon-code"]',
            '[class*="code"]',
            '[data-coupon-code]',
            '[class*="offer-code"]',
          ]);

          // Sometimes the code is in a data attribute
          if (!code) {
            const codeEl = card.querySelector('[data-coupon-code], [data-code]');
            code = codeEl
              ? codeEl.getAttribute('data-coupon-code') ||
                codeEl.getAttribute('data-code')
              : null;
          }

          // Remove "GET CODE", "COPY", placeholder text
          if (code && /^(get|copy|show|reveal|click)/i.test(code.trim())) {
            code = null;
          }

          const discount = getText([
            '[class*="discount"]',
            '[class*="off"]',
            '[class*="save"]',
            '[class*="percent"]',
          ]);

          const description = getText([
            '[class*="description"]',
            '[class*="desc"]',
            'p',
          ]);

          const expiry = getText([
            '[class*="expiry"]',
            '[class*="expire"]',
            '[class*="valid"]',
            'time',
          ]);

          // Determine type
          const type = code ? 'code' : 'deal';

          results.push({
            title,
            code: code ? code.toUpperCase().trim() : null,
            type,
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
          merchantName: merchantName?.trim() || url.split('/').pop(),
          expiryDate: this.parseExpiry(card.expiryRaw),
          source: 'coupondunia',
          categories: this.inferCategories(merchantName || ''),
        });
      }

      logger.info(`[${this.name}] ${url} → ${coupons.length} coupons`);
    } finally {
      await page.context().close();
    }

    return coupons;
  }

  /** Infer categories from merchant name */
  inferCategories(merchantName) {
    const name = merchantName.toLowerCase();
    if (/amazon|flipkart|snapdeal|meesho/.test(name)) return ['Shopping', 'E-commerce'];
    if (/myntra|ajio|nykaa|fashion/.test(name)) return ['Fashion', 'Clothing'];
    if (/swiggy|zomato|food/.test(name)) return ['Food & Dining'];
    if (/paytm|phonepe|gpay/.test(name)) return ['Payments', 'Wallet'];
    if (/hotel|travel|flight|makemytrip/.test(name)) return ['Travel'];
    return ['Shopping'];
  }
}

module.exports = CouponDuniaScraper;
