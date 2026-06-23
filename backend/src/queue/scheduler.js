'use strict';

const cron = require('node-cron');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const scrapeQueue = new Queue('scrape-queue', { connection });

const SCRAPE_SOURCES = ['coupondunia', 'grabon'];
const CRON_SCHEDULE = process.env.SCRAPE_CRON || '0 */6 * * *'; // every 6h default

function startScheduler() {
  logger.info(`[Scheduler] Starting with cron: ${CRON_SCHEDULE}`);

  cron.schedule(CRON_SCHEDULE, async () => {
    logger.info('[Scheduler] Triggering scheduled scrape for all sources');
    for (const source of SCRAPE_SOURCES) {
      await scrapeQueue.add(
        `scrape-${source}`,
        { source, triggeredBy: 'scheduler' },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 50,
          removeOnFail: 20,
        }
      );
      logger.info(`[Scheduler] Queued job for ${source}`);
    }
  });
}

/**
 * Enqueue an on-demand scrape (called from admin API)
 * @param {string} source
 */
async function triggerManualScrape(source) {
  const sources = source === 'all' ? SCRAPE_SOURCES : [source];
  const jobs = [];
  for (const s of sources) {
    const job = await scrapeQueue.add(
      `manual-scrape-${s}`,
      { source: s, triggeredBy: 'admin' },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 3000 },
        removeOnComplete: 20,
        removeOnFail: 10,
        priority: 1, // Higher priority than scheduled jobs
      }
    );
    jobs.push({ source: s, jobId: job.id });
    logger.info(`[Scheduler] Manual scrape queued for ${s}, jobId=${job.id}`);
  }
  return jobs;
}

module.exports = { startScheduler, triggerManualScrape, scrapeQueue };
