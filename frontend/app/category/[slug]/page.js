import { getCoupons, getCategories } from '../../../lib/api';
import CouponGrid from '../../../components/CouponGrid';
import CategorySidebar from '../../../components/CategorySidebar';
import AdUnit from '../../../components/AdUnit';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const name = params.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${name} Coupons & Deals | CouponHive`,
    description: `Best ${name} coupons, promo codes and deals updated daily.`,
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { page = '1' } = searchParams || {};
  const categoryName = params.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const [{ data: coupons, meta }, categories] = await Promise.all([
    getCoupons({ category: params.slug, page, limit: 24 }).catch(() => ({ data: [], meta: {} })),
    getCategories().catch(() => []),
  ]);

  return (
    <div className="flex gap-6">
      <CategorySidebar categories={categories} activeSlug={params.slug} />

      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">{categoryName} Coupons & Deals</h1>
          <p className="text-sm text-gray-500 mt-1">{meta?.total ?? 0} coupons</p>
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
            <CouponGrid coupons={coupons} />
          </div>
          <div className="hidden xl:block shrink-0 sticky top-24 self-start">
            <AdUnit zone="sidebar" />
          </div>
        </div>
      </div>
    </div>
  );
}
