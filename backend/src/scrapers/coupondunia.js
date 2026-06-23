'use strict';

const BaseScraper = require('./base-scraper');
const logger = require('../utils/logger');

class CouponDuniaScraper extends BaseScraper {
  constructor() {
    super('CouponDunia');
    this.baseUrl = 'https://www.coupondunia.in';
    this.stores = [
      // 🛒 Shopping / E-commerce
      { path: '/amazon',        name: 'Amazon',       cats: ['Shopping', 'E-commerce'] },
      { path: '/flipkart',      name: 'Flipkart',     cats: ['Shopping', 'E-commerce'] },
      { path: '/meesho',        name: 'Meesho',       cats: ['Shopping', 'Fashion'] },
      { path: '/snapdeal',      name: 'Snapdeal',     cats: ['Shopping', 'E-commerce'] },
      { path: '/tatacliq',      name: 'Tata CLiQ',    cats: ['Shopping', 'E-commerce'] },
      { path: '/jiomart',       name: 'JioMart',      cats: ['Shopping', 'Grocery'] },
      { path: '/bigbasket',     name: 'BigBasket',    cats: ['Grocery'] },
      { path: '/blinkit',       name: 'Blinkit',      cats: ['Grocery'] },
      // 👗 Fashion & Beauty
      { path: '/myntra',        name: 'Myntra',       cats: ['Fashion', 'Clothing'] },
      { path: '/ajio',          name: 'AJIO',         cats: ['Fashion', 'Clothing'] },
      { path: '/nykaa',         name: 'Nykaa',        cats: ['Beauty', 'Fashion'] },
      { path: '/nykaa-fashion', name: 'Nykaa Fashion',cats: ['Fashion', 'Clothing'] },
      { path: '/bewakoof',      name: 'Bewakoof',     cats: ['Fashion', 'Clothing'] },
      { path: '/mamaearth',     name: 'Mamaearth',    cats: ['Beauty', 'Health'] },
      // 🍔 Food & Dining
      { path: '/swiggy',        name: 'Swiggy',       cats: ['Food & Dining'] },
      { path: '/zomato',        name: 'Zomato',       cats: ['Food & Dining'] },
      { path: '/dominos',       name: "Domino's",     cats: ['Food & Dining'] },
      { path: '/mcdonalds',     name: "McDonald's",   cats: ['Food & Dining'] },
      { path: '/pizzahut',      name: 'Pizza Hut',    cats: ['Food & Dining'] },
      // ✈️ Travel & Hotels
      { path: '/makemytrip',    name: 'MakeMyTrip',   cats: ['Travel'] },
      { path: '/goibibo',       name: 'Goibibo',      cats: ['Travel'] },
      { path: '/cleartrip',     name: 'Cleartrip',    cats: ['Travel'] },
      { path: '/oyo',           name: 'OYO',          cats: ['Travel', 'Hotels'] },
      { path: '/irctc',         name: 'IRCTC',        cats: ['Travel'] },
      // 💳 Payments & Wallets
      { path: '/paytm',         name: 'Paytm',        cats: ['Payments', 'Wallet'] },
      { path: '/phonepe',       name: 'PhonePe',      cats: ['Payments', 'Wallet'] },
      // 💻 Electronics
      { path: '/croma',         name: 'Croma',        cats: ['Electronics'] },
      { path: '/vijay-sales',   name: 'Vijay Sales',  cats: ['Electronics'] },
      // 🏠 Home & Living
      { path: '/pepperfry',     name: 'Pepperfry',    cats: ['Home & Living'] },
      { path: '/ikea',          name: 'IKEA',         cats: ['Home & Living'] },
    ];
  }

  cleanText(raw) {
    if (!raw) return null;
    return raw
      .replace(/\.cls-[\w-]+\{[^}]*\}/g, '')
      .replace(/\d+\s+Peo?ple\s+Used\s+(Today|This Week)/gi, '')
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
        const coupons = await this.scrapeStorePage(`${this.baseUrl}${store.path}`, store.name, store.cats);
        allCoupons.push(...coupons);
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
      } catch (err) {
        logger.error(`[${this.name}] Failed ${store.path}: ${err.message}`);
      }
    }
    return allCoupons;
  }

  async scrapeStorePage(url, merchantName, categories) {
    const page = await this.newPage();
    const coupons = [];

    try {
      await this.navigate(page, url);
      await page.waitForSelector('[class*="coupon"], [class*="offer"], [class*="deal"]', { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1000);

      const cards = await page.evaluate(() => {
        const results = [];
        const selectors = ['[class*="coupon-card"]','[class*="coupon-item"]','[class*="offer-card"]','[class*="deal-card"]','.coupon'];
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
          const title = getText(['h3','h2','[class*="title"]','[class*="heading"]','strong']).trim();
          if (!title || title.length < 5) continue;
          let code = null;
          const codeEl = card.querySelector('[data-coupon-code],[data-code],[class*="coupon-code"],[class*="code-text"]');
          if (codeEl) {
            code = codeEl.getAttribute('data-coupon-code') || codeEl.getAttribute('data-code') || (codeEl.innerText||'').trim();
          }
          const discount = getText(['[class*="discount"]','[class*="off"]','[class*="save"]']).trim();
          const description = getText(['[class*="description"]','[class*="desc"]','p']).trim();
          const expiry = getText(['time','[class*="expir"]','[class*="valid"]']).trim();
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
          merchantName,
          sourceUrl: url,
          source: 'coupondunia',
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

module.exports = CouponDuniaScraper;
