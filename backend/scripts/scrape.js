'use strict';

/**
 * Standalone scraper script — runs via GitHub Actions.
 * Usage: node scripts/scrape.js [source]
 *   source: 'coupondunia' | 'grabon' | 'all' (default: all)
 */

require('dotenv').config();

const { runScraper } = require('../src/scrapers');

const sources = {
  coupondunia: true,
  grabon: true,
};

async function main() {
  const target = process.argv[2] || 'all';
  const toRun = target === 'all' ? Object.keys(sources) : [target];

  if (toRun.some((s) => !sources[s])) {
    console.error(`Unknown source. Valid: ${Object.keys(sources).join(', ')}, all`);
    process.exit(1);
  }

  console.log(`[scrape] Starting: ${toRun.join(', ')}`);
  console.log(`[scrape] DB: ${process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://*****@')}`);

  let totalFound = 0;
  let totalNew = 0;

  for (const source of toRun) {
    console.log(`\n[scrape] ── ${source} ──`);
    try {
      const stats = await runScraper(source, 'github-actions');
      totalFound += stats.couponsFound;
      totalNew += stats.newCoupons;
      console.log(`[scrape] ${source} done → found: ${stats.couponsFound}, new: ${stats.newCoupons}`);
    } catch (err) {
      console.error(`[scrape] ${source} FAILED: ${err.message}`);
      // Don't exit — continue with next source
    }
  }

  console.log(`\n[scrape] ── Summary ──`);
  console.log(`[scrape] Total found: ${totalFound}, Total new: ${totalNew}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[scrape] Fatal error:', err);
  process.exit(1);
});
