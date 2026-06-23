'use strict';

const { Router } = require('express');
const prisma = require('../db/client');

const router = Router();

/**
 * GET /api/coupons
 * Query params: page, limit, merchant, category, type, source, search
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = { isActive: true };

    if (req.query.merchant) {
      where.merchant = { slug: req.query.merchant };
    }
    if (req.query.type) {
      where.type = req.query.type;
    }
    if (req.query.source) {
      where.source = req.query.source;
    }
    if (req.query.category) {
      where.categories = {
        some: { category: { slug: req.query.category } },
      };
    }
    if (req.query.search) {
      where.OR = [
        { title: { contains: req.query.search, mode: 'insensitive' } },
        { description: { contains: req.query.search, mode: 'insensitive' } },
        { code: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'asc' },    // 1=direct code, 2=bank code, 3=deal
          { isVerified: 'desc' },
          { clicks: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          merchant: { select: { id: true, name: true, slug: true, logo: true } },
          categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    res.json({
      data: coupons,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/coupons/:id
 * Returns single coupon + increments click count
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        merchant: true,
        categories: { include: { category: true } },
      },
    });

    if (!coupon) return res.status(404).json({ error: 'Not found' });

    // Async click increment — don't await, fire and forget
    prisma.coupon.update({ where: { id }, data: { clicks: { increment: 1 } } }).catch(() => {});

    res.json(coupon);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/coupons/:id/click
 * Explicit click tracking endpoint (called when user copies code)
 */
router.post('/:id/click', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await prisma.coupon.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
