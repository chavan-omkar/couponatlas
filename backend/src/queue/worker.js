'use strict';

require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { runScraper } = require('../scrapers');
const logger = require('../utils/logger');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * BullMQ worker — processes scrape jobs from the queue.
 * Run this as a separate process: `npm run worker`
 */
const worker = new Worker(
  'scrape-queue',
  async (job) => {
    const { source, triggeredBy } = job.data;
    logger.info(`[Worker] Processing job: source=${source}, triggeredBy=${triggeredBy}`);

    const stats = await runScraper(source, triggeredBy);
    return stats;
  },
  {
    connection,
    concurrency: 1, // One scraper at a time to avoid detection
    limiter: {
      max: 2,
      duration: 60000, // Max 2 jobs per minute
    },
  }
);

worker.on('completed', (job, result) => {
  logger.info(`[Worker] Job ${job.id} done: ${JSON.stringify(result)}`);
});

worker.on('failed', (job, err) => {
  logger.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  logger.error(`[Worker] Worker error: ${err.message}`);
});

logger.info('[Worker] Scrape worker started, waiting for jobs...');

module.exports = worker;
