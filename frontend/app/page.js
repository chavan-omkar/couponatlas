import { getCoupons, getCategories } from '../lib/api';
import CouponGrid from '../components/CouponGrid';
import CategorySidebar from '../components/CategorySidebar';
import AdUnit from '../components/AdUnit';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default async function HomePage({ searchParams }) {
  const { search, category, merchant, page = '1' } = searchParams || {};

  const [{ data: coupons, meta }, categories] = await Promise.all([
    getCoupons({ search, category, merchant, page, limit: 24 }).catch(() => ({
      data: [],
      meta: { total: 0, totalPages: 1, page: 1 },
    })),
    getCategories().catch(() => []),
  ]);

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <CategorySidebar categories={categories} activeSlug={category} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Sidebar ad */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            {/* Page heading */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900">
                {search
                  ? `Results for "${search}"`
                  : merchant
                  ? `${merchant} Coupons`
                  : 'Latest Coupons & Deals'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{meta?.total ?? 0} coupons found</p>
            </div>

            <CouponGrid coupons={coupons} />

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: Math.min(meta.totalPages, 10) }, (_, i) => i + 1).map(
                  (p) => (
                    <a
                      key={p}
                      href={`?page=${p}${search ? `&search=${search}` : ''}${category ? `&category=${category}` : ''}`}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        p === parseInt(page)
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                      }`}
                    >
                      {p}
                    </a>
                  )
                )}
              </div>
            )}
          </div>

          {/* Right sidebar ad */}
          <div className="hidden xl:block shrink-0">
            <div className="sticky top-24">
              <AdUnit zone="sidebar" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
