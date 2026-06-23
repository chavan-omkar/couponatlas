'use strict';

const prisma = require('../db/client');
const CouponDuniaScraper = require('./coupondunia');
const GrabOnScraper = require('./grabon');
const CouponzGuruScraper = require('./couponzguru');
const FoodDirectScraper = require('./food-direct');
const logger = require('../utils/logger');

const SCRAPERS = {
  coupondunia: CouponDuniaScraper,
  grabon: GrabOnScraper,
  couponzguru: CouponzGuruScraper,
  'food-direct': FoodDirectScraper,
};

/**
 * Run a scraper by name, persist results to DB, return stats.
 * @param {string} sourceName  - 'coupondunia' | 'grabon'
 * @param {string} triggeredBy - 'scheduler' | 'admin'
 */
async function runScraper(sourceName, triggeredBy = 'scheduler') {
  const ScraperClass = SCRAPERS[sourceName];
  if (!ScraperClass) throw new Error(`Unknown scraper: ${sourceName}`);

  const scraper = new ScraperClass();

  // Create job record
  const job = await prisma.scrapeJob.create({
    data: {
      source: sourceName,
      targetUrl: scraper.baseUrl,
      status: 'running',
      triggeredBy,
      startedAt: new Date(),
    },
  });

  let couponsFound = 0;
  let newCoupons = 0;

  try {
    const rawCoupons = await scraper.run();
    couponsFound = rawCoupons.length;

    for (const raw of rawCoupons) {
      try {
        await upsertCoupon(raw, scraper);
        newCoupons++;
      } catch (err) {
        // Fingerprint conflict = already exists, skip
        if (err.code !== 'P2002') {
          logger.warn(`[${sourceName}] Failed to upsert coupon "${raw.title}": ${err.message}`);
        }
      }
    }

    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: 'done',
        couponsFound,
        newCoupons,
        completedAt: new Date(),
      },
    });

    logger.info(`[${sourceName}] Done. Found: ${couponsFound}, New: ${newCoupons}`);
    return { couponsFound, newCoupons };
  } catch (err) {
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: err.message, completedAt: new Date() },
    });
    throw err;
  }
}

/**
 * Upsert a single scraped coupon into the DB.
 * Uses fingerprint for deduplication.
 */
async function upsertCoupon(raw, scraper) {
  const merchantSlug = scraper.slugify(raw.merchantName);
  const fingerprint = scraper.fingerprint(merchantSlug, raw.code, raw.title);

  // Upsert merchant
  const merchant = await prisma.merchant.upsert({
    where: { slug: merchantSlug },
    update: {},
    create: { name: raw.merchantName, slug: merchantSlug },
  });

  // Upsert categories
  const categoryRecords = [];
  for (const catName of raw.categories || []) {
    const catSlug = catName.toLowerCase().replace(/\s+/g, '-');
    const cat = await prisma.category.upsert({
      where: { slug: catSlug },
      update: {},
      create: { name: catName, slug: catSlug },
    });
    categoryRecords.push(cat);
  }

  // Upsert coupon (unique on fingerprint)
  const coupon = await prisma.coupon.upsert({
    where: { fingerprint },
    update: {
      isActive: true,
      priority: raw.priority ?? 3,
      updatedAt: new Date(),
    },
    create: {
      title: raw.title,
      code: raw.code || null,
      type: raw.type || 'deal',
      discount: raw.discount || null,
      description: raw.description || null,
      expiryDate: raw.expiryDate || null,
      priority: raw.priority ?? 3,
      merchantId: merchant.id,
      sourceUrl: raw.sourceUrl,
      source: raw.source,
      fingerprint,
    },
  });

  // Attach categories
  for (const cat of categoryRecords) {
    await prisma.couponCategory.upsert({
      where: { couponId_categoryId: { couponId: coupon.id, categoryId: cat.id } },
      update: {},
      create: { couponId: coupon.id, categoryId: cat.id },
    });
  }
}

module.exports = { runScraper, SCRAPERS };
