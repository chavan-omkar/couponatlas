'use strict';

const BaseScraper = require('./base-scraper');
const logger = require('../utils/logger');

class CouponDuniaScraper extends BaseScraper {
  constructor() {
    super('CouponDunia');
    this.baseUrl = 'https://www.coupondunia.in';
    this.stores = [
      { path: '/amazon',   name: 'Amazon' },
      { path: '/flipkart', name: 'Flipkart' },
      { path: '/myntra',   name: 'Myntra' },
      { path: '/ajio',     name: 'AJIO' },
      { path: '/nykaa',    name: 'Nykaa' },
      { path: '/swiggy',   name: 'Swiggy' },
      { path: '/zomato',   name: 'Zomato' },
      { path: '/meesho',   name: 'Meesho' },
      { path: '/snapdeal', name: 'Snapdeal' },
      { path: '/paytm',    name: 'Paytm' },
    ];
  }

  /** Remove SVG CSS, usage stats, button text from scraped strings */
  cleanText(raw) {
    if (!raw) return null;
    return raw
      .replace(/\.cls-[\w-]+\{[^}]*\}/g, '')   // strip .cls-xxx{...} CSS
      .replace(/\d+\s+People\s+Used\s+Today/gi, '')
      .replace(/\bVerified\b/gi, '')
      .replace(/See\s+more[\s\S]*?See\s+less/gi, '')
      .replace(/Get\s+Coupon/gi, '')
      .replace(/Get\s+Deal/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /** Extract just the coupon code — strip any trailing button text */
  cleanCode(raw) {
    if (!raw) return null;
    // Remove "GET COUPON", "COPY", "GET DEAL" suffixes
    const cleaned = raw
      .replace(/GET\s+COUPON/gi, '')
      .replace(/GET\s+DEAL/gi, '')
      .replace(/COPY/gi, '')
      .replace(/\s+/g, '')
      .trim();
    // Must look like a real code: 3-20 uppercase alphanumeric chars
    if (/^[A-Z0-9]{3,20}$/.test(cleaned)) return cleaned;
    return null;
  }

  async scrape() {
    const allCoupons = [];
    for (const store of this.stores) {
      try {
        const coupons = await this.scrapeStorePage(
          `${this.baseUrl}${store.path}`,
          store.name
        );
        allCoupons.push(...coupons);
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
      } catch (err) {
        logger.error(`[${this.name}] Failed ${store.path}: ${err.message}`);
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
        .waitForSelector('[class*="coupon"], [class*="offer"], [class*="deal"]', { timeout: 10000 })
        .catch(() => {});

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1000);

      const cards = await page.evaluate(() => {
        const results = [];
        const selectors = [
          '[class*="coupon-card"]', '[class*="coupon-item"]',
          '[class*="offer-card"]', '[class*="deal-card"]', '.coupon',
        ];

        let containers = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) { containers = Array.from(found); break; }
        }

        for (const card of containers) {
          const getText = (sels) => {
            for (const s of sels) {
              const el = card.querySelector(s);
              if (el) return el.innerText || el.textContent || '';
            }
            return '';
          };

          const title = getText(['h3', 'h2', '[class*="title"]', '[class*="heading"]', 'strong']).trim();
          if (!title || title.length < 5) continue;

          // Code: prefer data attributes over innerText to avoid button label pollution
          let code = null;
          const codeEl = card.querySelector('[data-coupon-code], [data-code], [class*="coupon-code"], [class*="code-text"]');
          if (codeEl) {
            code = codeEl.getAttribute('data-coupon-code')
              || codeEl.getAttribute('data-code')
              || (codeEl.innerText || '').trim();
          }

          const discount = getText(['[class*="discount"]', '[class*="off"]', '[class*="save"]']).trim();
          const description = getText(['[class*="description"]', '[class*="desc"]', 'p']).trim();
          const expiry = getText(['time', '[class*="expir"]', '[class*="valid"]']).trim();

          results.push({ title, code, discount, description, expiryRaw: expiry, type: code ? 'code' : 'deal' });
        }
        return results;
      });

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
          merchantName,   // use the hardcoded name, not scraped h1
          sourceUrl: url,
          source: 'coupondunia',
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
    if (/myntra|ajio|nykaa/.test(name)) return ['Fashion', 'Clothing'];
    if (/swiggy|zomato/.test(name)) return ['Food & Dining'];
    if (/paytm|phonepe/.test(name)) return ['Payments', 'Wallet'];
    return ['Shopping'];
  }
}

module.exports = CouponDuniaScraper;
