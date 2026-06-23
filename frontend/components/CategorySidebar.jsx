import Link from 'next/link';

const ICONS = {
  shopping: '🛒', 'e-commerce': '📦', fashion: '👗', clothing: '👕',
  'food-&-dining': '🍔', travel: '✈️', payments: '💳', wallet: '👜',
  electronics: '💻', beauty: '💄', grocery: '🛍️', health: '💊',
  entertainment: '🎬', sports: '⚽', home: '🏠', education: '📚',
};

export default function CategorySidebar({ categories = [], activeSlug }) {
  return (
    <aside className="w-52 shrink-0 hidden md:block">
      <div className="card p-3 sticky top-20">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2">Categories</p>
        <ul className="space-y-0.5">
          <li>
            <Link href="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                ${!activeSlug ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
              <span>🏷️</span>
              <span className="flex-1">All Coupons</span>
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link href={`/category/${cat.slug}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                  ${activeSlug === cat.slug ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                <span>{ICONS[cat.slug] || '🏷️'}</span>
                <span className="flex-1 truncate">{cat.name}</span>
                {cat.couponCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0
                    ${activeSlug === cat.slug ? 'bg-white bg-opacity-30 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {cat.couponCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
