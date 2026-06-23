import Link from 'next/link';

const ICONS = {
  shopping: '🛒',
  'e-commerce': '📦',
  fashion: '👗',
  clothing: '👕',
  'food-&-dining': '🍔',
  travel: '✈️',
  payments: '💳',
  wallet: '👜',
  electronics: '💻',
  beauty: '💄',
};

export default function CategorySidebar({ categories = [], activeSlug }) {
  return (
    <aside className="w-56 shrink-0">
      <div className="card p-4 sticky top-20">
        <h2 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wide">Categories</h2>
        <ul className="space-y-1">
          <li>
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                !activeSlug ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>🏷️</span> All Coupons
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/category/${cat.slug}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSlug === cat.slug
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{ICONS[cat.slug] || '🏷️'}</span>
                <span className="flex-1">{cat.name}</span>
                {cat.couponCount > 0 && (
                  <span className="text-xs text-gray-400">{cat.couponCount}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
