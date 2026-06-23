'use strict';

const { Router } = require('express');
const prisma = require('../db/client');

const router = Router();

/** GET /api/merchants — list all merchants with coupon counts */
router.get('/', async (req, res, next) => {
  try {
    const merchants = await prisma.merchant.findMany({
      include: {
        _count: { select: { coupons: { where: { isActive: true } } } },
      },
      orderBy: { coupons: { _count: 'desc' } },
    });

    res.json(merchants.map((m) => ({ ...m, couponCount: m._count.coupons })));
  } catch (err) {
    next(err);
  }
});

/** GET /api/merchants/:slug */
router.get('/:slug', async (req, res, next) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { slug: req.params.slug },
      include: {
        _count: { select: { coupons: { where: { isActive: true } } } },
      },
    });
    if (!merchant) return res.status(404).json({ error: 'Not found' });
    res.json({ ...merchant, couponCount: merchant._count.coupons });
  } catch (err) {
    next(err);
  }
});

/** GET /api/categories */
router.get('/categories/all', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { coupons: true } },
      },
      orderBy: { coupons: { _count: 'desc' } },
    });
    res.json(categories.map((c) => ({ ...c, couponCount: c._count.coupons })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
