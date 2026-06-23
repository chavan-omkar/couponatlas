import { getCoupons, getCategories } from '../lib/api';
import CouponGrid from '../components/CouponGrid';
import CategorySidebar from '../components/CategorySidebar';

export const revalidate = 300;

const CATEGORY_EMOJIS = {
  shopping: '🛒', 'e-commerce': '📦', fashion: '👗', clothing: '👕',
  'food-&-dining': '🍔', travel: '✈️', payments: '💳', wallet: '👜',
};

export default async function HomePage({ searchParams }) {
  const { search, category, merchant, page = '1' } = searchParams || {};

  const [{ data: coupons, meta }, categories] = await Promise.all([
    getCoupons({ search, category, merchant, page, limit: 24 }).catch(() => ({ data: [], meta: { total: 0, totalPages: 1, page: 1 } })),
    getCategories().catch(() => []),
  ]);

  const isFiltered = search || category || merchant;

  return (
    <div>
      {/* ── Hero ── */}
      {!isFiltered && (
        <div className="relative -mx-4 -mt-6 mb-8 px-4 py-14 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 40%, #ff3d9a 100%)' }}>
          {/* Background blobs */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full translate-x-32 translate-y-32" />

          <div className="relative text-center max-w-2xl mx-auto">
            <div className="text-5xl mb-3">🗺️</div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
              Your Map to Every Deal
            </h1>
            <p className="text-orange-100 text-base mb-6">
              {meta?.total ?? 0}+ verified coupons from top brands — updated automatically
            </p>

            {/* Stats pills */}
            <div className="flex justify-center gap-3 flex-wrap">
              {[
                { icon: '🏷️', label: `${meta?.total ?? 0}+ Coupons` },
                { icon: '🏪', label: '10+ Stores' },
                { icon: '🔄', label: 'Updated Every 6h' },
                { icon: '✅', label: 'Free Forever' },
              ].map((s) => (
                <span key={s.label} className="bg-white bg-opacity-20 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                  {s.icon} {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <CategorySidebar categories={categories} activeSlug={category} />

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Category quick-pills (only on homepage) */}
          {!isFiltered && categories.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-5">
              {categories.slice(0, 6).map((cat) => (
                <a
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-600 hover:text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full transition-all shadow-sm"
                >
                  <span>{CATEGORY_EMOJIS[cat.slug] || '🏷️'}</span>
                  {cat.name}
                  <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px]">{cat.couponCount}</span>
                </a>
              ))}
            </div>
          )}

          {/* Results heading */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {search ? `Results for "${search}"` : merchant ? `${merchant} Coupons` : category ? `${category.replace(/-/g, ' ')} Deals` : 'Latest Coupons & Deals'}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">{meta?.total ?? 0} coupons found</p>
            </div>
            {isFiltered && (
              <a href="/" className="text-xs text-orange-500 hover:text-orange-700 font-semibold border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
                ✕ Clear filters
              </a>
            )}
          </div>

          <CouponGrid coupons={coupons} />

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10 flex-wrap">
              {Array.from({ length: Math.min(meta.totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`?page=${p}${search ? `&search=${search}` : ''}${category ? `&category=${category}` : ''}`}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold border transition-all
                    ${p === parseInt(page)
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                    }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
