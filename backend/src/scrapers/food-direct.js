'use strict';

const BaseScraper = require('./base-scraper');
const logger = require('../utils/logger');

/**
 * Food chain direct scraper.
 * Goes straight to brand offer/promo pages — highest quality codes,
 * no middleman aggregator noise.
 */
class FoodDirectScraper extends BaseScraper {
  constructor() {
    super('FoodDirect');
    this.baseUrl = null; // multi-domain
    this.brands = [
      {
        name: "Domino's",
        url: 'https://www.dominos.co.in/offers',
        cats: ['Food & Dining'],
        selectors: {
          container: '[class*="offer"], [class*="promo"], [class*="deal"], .coupon, [class*="voucher"]',
          title: ['h2', 'h3', 'h4', '[class*="title"]', '[class*="heading"]'],
          code: ['[class*="code"]', '[data-code]', '[class*="coupon"]', 'strong'],
          discount: ['[class*="discount"]', '[class*="off"]', '[class*="save"]'],
          description: ['p', '[class*="desc"]', '[class*="detail"]'],
        },
      },
      {
        name: 'Pizza Hut',
        url: 'https://www.pizzahut.co.in/offers',
        cats: ['Food & Dining'],
        selectors: {
          container: '[class*="offer"], [class*="deal"], [class*="promo"]',
          title: ['h2', 'h3', '[class*="title"]'],
          code: ['[class*="code"]', '[data-code]', 'strong'],
          discount: ['[class*="discount"]', '[class*="off"]'],
          description: ['p', '[class*="desc"]'],
        },
      },
      {
        name: "KFC",
        url: 'https://online.kfc.co.in/offers',
        cats: ['Food & Dining'],
        selectors: {
          container: '[class*="offer"], [class*="promo"], [class*="deal"]',
          title: ['h2', 'h3', '[class*="title"]', '[class*="heading"]'],
          code: ['[class*="code"]', '[data-code]', 'strong'],
          discount: ['[class*="discount"]', '[class*="save"]'],
          description: ['p', '[class*="desc"]'],
        },
      },
      {
        name: "McDonald's",
        url: 'https://www.mcdonalds.co.in/deals',
        cats: ['Food & Dining'],
        selectors: {
          container: '[class*="deal"], [class*="offer"], [class*="promo"]',
          title: ['h2', 'h3', 'h4', '[class*="title"]'],
          code: ['[class*="code"]', '[data-code]', 'strong'],
          discount: ['[class*="discount"]', '[class*="off"]'],
          description: ['p', '[class*="desc"]'],
        },
      },
      {
        name: 'Subway',
        url: 'https://www.subway.com/en-IN/MenuNutrition/Menu/Deals',
        cats: ['Food & Dining'],
        selectors: {
          container: '[class*="deal"], [class*="offer"], [class*="item"]',
          title: ['h2', 'h3', '[class*="title"]', '[class*="name"]'],
          code: ['[class*="code"]', 'strong'],
          discount: ['[class*="price"]', '[class*="discount"]'],
          description: ['p', '[class*="desc"]'],
        },
      },
      {
        name: 'Burger King',
        url: 'https://www.burgerking.in/offers',
        cats: ['Food & Dining'],
        selectors: {
          container: '[class*="offer"], [class*="deal"], [class*="coupon"]',
          title: ['h2', 'h3', '[class*="title"]'],
          code: ['[class*="code"]', '[data-code]', 'strong'],
          discount: ['[class*="discount"]', '[class*="off"]'],
          description: ['p', '[class*="desc"]'],
        },
      },
      {
        name: 'Starbucks',
        url: 'https://www.starbucks.in/coffeehouse/promotions',
        cats: ['Food & Dining'],
        selectors: {
          container: '[class*="promo"], [class*="offer"], article',
          title: ['h2', 'h3', '[class*="title"]'],
          code: ['[class*="code"]', 'strong'],
          discount: ['[class*="discount"]', '[class*="off"]'],
          description: ['p', '[class*="desc"]'],
        },
      },
    ];
  }

  cleanText(raw) {
    if (!raw) return null;
    return raw
      .replace(/\.cls-[\w-]+\{[^}]*\}/g, '')
      .replace(/\d+\s+Peo?ple\s+Used/gi, '')
      .replace(/\bVerified\b/gi, '')
      .replace(/Get\s+Code/gi, '')
      .replace(/Get\s+Deal/gi, '')
      .replace(/Order\s+Now/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || null;
  }

  cleanCode(raw) {
    if (!raw) return null;
    const cleaned = raw
      .replace(/GET\s+CODE/gi, '')
      .replace(/APPLY/gi, '')
      .replace(/COPY/gi, '')
      .replace(/\s+/g, '')
      .toUpperCase()
      .trim();
    // Real promo codes: 3-20 uppercase alphanumeric chars
    if (/^[A-Z0-9]{3,20}$/.test(cleaned)) return cleaned;
    return null;
  }

  async scrape() {
    const tasks = this.brands.map((brand) => () => this.scrapeBrandPage(brand));
    return this.runConcurrent(tasks, 4);
  }

  async scrapeBrandPage(brand) {
    const page = await this.newPage();
    const coupons = [];

    try {
      await this.navigate(page, brand.url);
      await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1500);

      const { selectors, name: merchantName, cats, url } = brand;

      const cards = await page.evaluate((sels) => {
        const results = [];
        let containers = [];

        for (const sel of sels.container.split(', ')) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) { containers = Array.from(found); break; }
        }

        // If no structured containers found, try to find any promo-looking blocks
        if (containers.length === 0) {
          containers = Array.from(document.querySelectorAll('section, article, .card, [class*="item"]')).slice(0, 20);
        }

        for (const card of containers) {
          const getText = (selList) => {
            for (const s of selList) {
              const el = card.querySelector(s);
              if (el) return (el.innerText || el.textContent || '').trim();
            }
            return '';
          };

          const title = getText(sels.title);
          if (!title || title.length < 4) continue;

          // Code: check data attrs first, then visible text
          let code = null;
          const codeEl = card.querySelector('[data-code], [data-coupon], [data-clipboard-text]');
          if (codeEl) {
            code = codeEl.getAttribute('data-code')
              || codeEl.getAttribute('data-coupon')
              || codeEl.getAttribute('data-clipboard-text');
          }
          if (!code) code = getText(sels.code);

          results.push({
            title,
            code: code || null,
            discount: getText(sels.discount),
            description: getText(sels.description),
            type: code ? 'code' : 'deal',
          });
        }
        return results;
      }, selectors);

      for (const card of cards) {
        const title = this.cleanText(card.title);
        if (!title || title.length < 4) continue;

        const code = this.cleanCode(card.code);
        coupons.push({
          title,
          code,
          type: card.type,
          discount: this.cleanText(card.discount) || null,
          description: this.cleanText(card.description) || null,
          expiryDate: null,
          priority: this.detectPriority(code),
          merchantName,
          sourceUrl: url,
          source: 'direct',
          categories: cats,
        });
      }

      logger.info(`[${this.name}] ${merchantName} → ${coupons.length} coupons`);
    } finally {
      await page.context().close();
    }

    return coupons;
  }
}

module.exports = FoodDirectScraper;
