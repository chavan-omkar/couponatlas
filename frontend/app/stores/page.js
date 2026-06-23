import { getMerchants } from '../../lib/api';

export const revalidate = 300;

export const metadata = {
  title: 'All Stores & Brands | CouponAtlas',
  description: 'Browse coupons and promo codes from 50+ top stores — Amazon, Flipkart, Swiggy, Zomato, Myntra and more.',
};

const CATEGORY_MAP = {
  amazon: '🛒', flipkart: '🛒', meesho: '🛒', snapdeal: '🛒', jiomart: '🛒',
  myntra: '👗', ajio: '👗', nykaa: '💄', bewakoof: '👕',
  swiggy: '🍔', zomato: '🍔', dominos: '🍕', 'pizza-hut': '🍕', kfc: '🍗',
  mcdonalds: '🍟', subway: '🥪', 'burger-king': '🍔', starbucks: '☕',
  makemytrip: '✈️', goibibo: '✈️', oyo: '🏨', cleartrip: '✈️',
  paytm: '💳', phonepe: '💳',
  bigbasket: '🧺', blinkit: '🧺',
  croma: '💻', mamaearth: '🌿', pepperfry: '🛋️',
};

function MerchantCard({ merchant }) {
  const emoji = CATEGORY_MAP[merchant.slug] || '🏪';
  const initial = merchant.name[0].toUpperCase();

  return (
    <a
      href={`/stores/${merchant.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all duration-200 p-5 flex flex-col items-center text-center gap-3"
    >
      {merchant.logo ? (
        <img
          src={merchant.logo}
          alt={merchant.name}
          className="w-14 h-14 object-contain rounded-xl border border-gray-100"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)' }}>
          <span className="text-2xl">{emoji}</span>
        </div>
      )}

      <div>
        <p className="font-bold text-gray-900 text-sm group-hover:text-orange-600 transition-colors leading-tight">
          {merchant.name}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {merchant.couponCount} {merchant.couponCount === 1 ? 'coupon' : 'coupons'}
        </p>
      </div>

      <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
        View Deals →
      </span>
    </a>
  );
}

export default async function StoresPage() {
  const merchants = await getMerchants().catch(() => []);

  // Group by first letter for alphabetical browsing
  const groups = merchants.reduce((acc, m) => {
    const letter = m.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(m);
    return acc;
  }, {});

  const letters = Object.keys(groups).sort();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">All Stores</h1>
        <p className="text-gray-500 text-sm mt-1">
          {merchants.length} stores — click any to browse their latest coupons
        </p>
      </div>

      {/* Top stores by coupon count */}
      {merchants.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Popular Stores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {merchants.slice(0, 12).map((m) => (
              <MerchantCard key={m.id} merchant={m} />
            ))}
          </div>
        </section>
      )}

      {/* A–Z listing */}
      {letters.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Browse A–Z</h2>

          {/* Letter jump nav */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {letters.map((l) => (
              <a
                key={l}
                href={`#letter-${l}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-gray-100 hover:bg-orange-100 hover:text-orange-600 text-gray-600 transition-colors"
              >
                {l}
              </a>
            ))}
          </div>

          {letters.map((letter) => (
            <div key={letter} id={`letter-${letter}`} className="mb-8 scroll-mt-24">
              <h3 className="text-lg font-black text-orange-500 mb-3 border-b border-orange-100 pb-1">{letter}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {groups[letter].map((m) => (
                  <MerchantCard key={m.id} merchant={m} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {merchants.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🏪</div>
          <p className="font-semibold">No stores yet</p>
          <p className="text-sm mt-1">Run the scraper to populate stores</p>
        </div>
      )}
    </div>
  );
}
