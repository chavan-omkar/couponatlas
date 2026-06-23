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
        // P2002 = fingerprint conflict (already exists) — silent skip
        if (err.code === 'P2002') continue;
        // P2000 = value too long — log the full raw object so we can see which field
        if (err.code === 'P2000') {
          logger.warn(`[${sourceName}] P2000 on "${raw.title}" — lengths: title=${raw.title?.length} code=${raw.code?.length} desc=${raw.description?.length} url=${raw.sourceUrl?.length} src=${raw.source?.length} discount=${raw.discount?.length}`);
        } else {
          logger.warn(`[${sourceName}] Failed to upsert "${raw.title}": [${err.code}] ${err.message}`);
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

// Truncate helper — prevents P2000 if scraped text is unexpectedly long
const trunc = (str, max) => (str && str.length > max ? str.slice(0, max) : str);

/**
 * Upsert a single scraped coupon into the DB.
 * Uses fingerprint for deduplication.
 */
async function upsertCoupon(raw, scraper) {
  const merchantSlug = trunc(scraper.slugify(raw.merchantName), 120);
  const fingerprint = scraper.fingerprint(merchantSlug, raw.code, raw.title);

  // Upsert merchant
  const merchant = await prisma.merchant.upsert({
    where: { slug: merchantSlug },
    update: {},
    create: {
      name: trunc(raw.merchantName, 120),
      slug: merchantSlug,
    },
  });

  // Upsert categories
  const categoryRecords = [];
  for (const catName of raw.categories || []) {
    const catSlug = trunc(catName.toLowerCase().replace(/\s+/g, '-'), 60);
    const cat = await prisma.category.upsert({
      where: { slug: catSlug },
      update: {},
      create: { name: trunc(catName, 60), slug: catSlug },
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
      title: trunc(raw.title, 200),
      code: trunc(raw.code, 28) || null,
      type: trunc(raw.type, 9) || 'deal',
      discount: trunc(raw.discount, 58) || null,
      description: trunc(raw.description, 490) || null,
      expiryDate: raw.expiryDate || null,
      priority: raw.priority ?? 3,
      merchantId: merchant.id,
      sourceUrl: trunc(raw.sourceUrl, 390),
      source: trunc(raw.source, 28),
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
