import { getCoupons, getMerchant, getCategories } from '../../../lib/api';
import CouponGrid from '../../../components/CouponGrid';
import CategorySidebar from '../../../components/CategorySidebar';
import AdUnit from '../../../components/AdUnit';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const merchant = await getMerchant(params.slug).catch(() => null);
  return {
    title: merchant ? `${merchant.name} Coupons & Promo Codes | CouponHive` : 'Store Coupons',
    description: `Latest ${merchant?.name || ''} coupons, promo codes, and deals. Verified and updated daily.`,
  };
}

export default async function StorePage({ params, searchParams }) {
  const { page = '1' } = searchParams || {};

  const [{ data: coupons, meta }, merchant, categories] = await Promise.all([
    getCoupons({ merchant: params.slug, page, limit: 24 }).catch(() => ({ data: [], meta: {} })),
    getMerchant(params.slug).catch(() => null),
    getCategories().catch(() => []),
  ]);

  return (
    <div className="flex gap-6">
      <CategorySidebar categories={categories} />

      <div className="flex-1 min-w-0">
        {/* Store header */}
        {merchant && (
          <div className="card p-5 mb-6 flex items-center gap-4">
            {merchant.logo ? (
              <img src={merchant.logo} alt={merchant.name} className="w-14 h-14 object-contain rounded-xl border" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 text-2xl font-bold">
                {merchant.name[0]}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{merchant.name} Coupons</h1>
              <p className="text-sm text-gray-500">{merchant.couponCount} active coupons</p>
            </div>
          </div>
        )}

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
