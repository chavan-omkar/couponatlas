'use strict';

const { Router } = require('express');
const prisma = require('../db/client');

const router = Router();

/** Simple API key guard */
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(adminAuth);

/**
 * GET /api/admin/jobs — recent scrape jobs
 */
router.get('/jobs', async (req, res, next) => {
  try {
    const jobs = await prisma.scrapeJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [totalCoupons, activeCoupons, totalMerchants, totalCategories, recentJobs] =
      await Promise.all([
        prisma.coupon.count(),
        prisma.coupon.count({ where: { isActive: true } }),
        prisma.merchant.count(),
        prisma.category.count(),
        prisma.scrapeJob.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            source: true,
            status: true,
            couponsFound: true,
            newCoupons: true,
            completedAt: true,
          },
        }),
      ]);

    res.json({ totalCoupons, activeCoupons, totalMerchants, totalCategories, recentJobs });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/coupons/:id — soft delete
 */
router.delete('/coupons/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/coupons/:id/verify — mark verified
 */
router.patch('/coupons/:id/verify', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const coupon = await prisma.coupon.update({
      where: { id },
      data: { isVerified: true },
    });
    res.json(coupon);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
