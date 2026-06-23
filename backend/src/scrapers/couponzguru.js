'use strict';

const BaseScraper = require('./base-scraper');
const logger = require('../utils/logger');

/**
 * CouponzGuru scraper — https://www.couponzguru.in
 * Known for high-quality, verified codes with explicit discount values.
 */
class CouponzGuruScraper extends BaseScraper {
  constructor() {
    super('CouponzGuru');
    this.baseUrl = 'https://www.couponzguru.in';
    this.stores = [
      { path: '/amazon',          name: 'Amazon',       cats: ['Shopping', 'E-commerce'] },
      { path: '/flipkart',        name: 'Flipkart',     cats: ['Shopping', 'E-commerce'] },
      { path: '/myntra',          name: 'Myntra',       cats: ['Fashion', 'Clothing'] },
      { path: '/ajio',            name: 'AJIO',         cats: ['Fashion', 'Clothing'] },
      { path: '/nykaa',           name: 'Nykaa',        cats: ['Beauty', 'Fashion'] },
      { path: '/swiggy',          name: 'Swiggy',       cats: ['Food & Dining'] },
      { path: '/zomato',          name: 'Zomato',       cats: ['Food & Dining'] },
      { path: '/meesho',          name: 'Meesho',       cats: ['Shopping', 'Fashion'] },
      { path: '/makemytrip',      name: 'MakeMyTrip',   cats: ['Travel'] },
      { path: '/goibibo',         name: 'Goibibo',      cats: ['Travel'] },
      { path: '/oyo',             name: 'OYO',          cats: ['Travel', 'Hotels'] },
      { path: '/paytm',           name: 'Paytm',        cats: ['Payments', 'Wallet'] },
      { path: '/bigbasket',       name: 'BigBasket',    cats: ['Grocery'] },
      { path: '/dominos',         name: "Domino's",     cats: ['Food & Dining'] },
      { path: '/pizzahut',        name: 'Pizza Hut',    cats: ['Food & Dining'] },
      { path: '/croma',           name: 'Croma',        cats: ['Electronics'] },
      { path: '/mamaearth',       name: 'Mamaearth',    cats: ['Beauty', 'Health'] },
      { path: '/pepperfry',       name: 'Pepperfry',    cats: ['Home & Living'] },
    ];
  }

  cleanText(raw) {
    if (!raw) return null;
    return raw
      .replace(/\.cls-[\w-]+\{[^}]*\}/g, '')
      .replace(/\d+\s+times?\s+used/gi, '')
      .replace(/\d+\s+Peo?ple\s+Used/gi, '')
      .replace(/\bVerified\b/gi, '')
      .replace(/See\s+more[\s\S]*?See\s+less/gi, '')
      .replace(/Get\s+Code/gi, '')
      .replace(/Get\s+Deal/gi, '')
      .replace(/Show\s+Code/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || null;
  }

  cleanCode(raw) {
    if (!raw) return null;
    const cleaned = raw
      .replace(/GET\s+CODE/gi, '')
      .replace(/SHOW\s+CODE/gi, '')
      .replace(/GET\s+DEAL/gi, '')
      .replace(/COPY/gi, '')
      .replace(/\s+/g, '')
      .toUpperCase()
      .trim();
    if (/^[A-Z0-9]{3,20}$/.test(cleaned)) return cleaned;
    return null;
  }

  async scrape() {
    const tasks = this.stores.map(
      (store) => () => this.scrapeStorePage(`${this.baseUrl}${store.path}`, store.name, store.cats)
    );
    return this.runConcurrent(tasks, 5);
  }

  async scrapeStorePage(url, merchantName, categories) {
    const page = await this.newPage();
    const coupons = [];

    try {
      await this.navigate(page, url);
      await page.waitForSelector('[class*="coupon"], [class*="offer"], [class*="code"]', { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1000);

      const cards = await page.evaluate(() => {
        const results = [];
        const selectors = [
          '[class*="coupon-box"]', '[class*="coupon-card"]', '[class*="coupon-item"]',
          '[class*="offer-box"]', '.coupon', 'li[class*="coupon"]',
        ];

        let containers = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 1) { containers = Array.from(found); break; }
        }

        for (const card of containers) {
          const getText = (sels) => {
            for (const s of sels) {
              const el = card.querySelector(s);
              if (el) return el.innerText || el.textContent || '';
            }
            return '';
          };

          const title = getText(['h3', 'h2', '[class*="title"]', '[class*="heading"]', 'strong', 'b']).trim();
          if (!title || title.length < 4) continue;

          // CouponzGuru often stores code in data-clipboard-text attribute
          let code = null;
          const codeEl = card.querySelector('[data-clipboard-text], [data-code], [class*="code"]');
          if (codeEl) {
            code = codeEl.getAttribute('data-clipboard-text')
              || codeEl.getAttribute('data-code')
              || (codeEl.innerText || '').trim();
          }

          const discount = getText(['[class*="discount"]', '[class*="off"]', '[class*="percent"]', '[class*="save"]']).trim();
          const description = getText(['[class*="desc"]', '[class*="detail"]', 'p']).trim();
          const expiry = getText(['[class*="expir"]', '[class*="valid"]', 'time']).trim();

          results.push({ title, code, discount, description, expiryRaw: expiry, type: code ? 'code' : 'deal' });
        }
        return results;
      });

      for (const card of cards) {
        const title = this.cleanText(card.title);
        if (!title) continue;
        const code = this.cleanCode(card.code);
        coupons.push({
          title,
          code,
          type: card.type,
          discount: this.cleanText(card.discount) || null,
          description: this.cleanText(card.description) || null,
          expiryDate: this.parseExpiry(card.expiryRaw),
          priority: this.detectPriority(code),
          merchantName,
          sourceUrl: url,
          source: 'couponzguru',
          categories,
        });
      }

      logger.info(`[${this.name}] ${merchantName} → ${coupons.length} coupons`);
    } finally {
      await page.context().close();
    }
    return coupons;
  }
}

module.exports = CouponzGuruScraper;
