import CouponCard from './CouponCard';
import AdUnit from './AdUnit';

const AD_FREQUENCY = 6;

const PRIORITY_LABELS = {
  1: { icon: '🏷️', label: 'Promo Codes', sub: 'Copy & paste — works for everyone', color: 'text-orange-600 border-orange-200' },
  2: { icon: '🏦', label: 'Bank & Card Offers', sub: 'Requires a specific bank card at checkout', color: 'text-blue-600 border-blue-200' },
  3: { icon: '🎁', label: 'Deals & Offers', sub: 'No code needed — click to activate', color: 'text-teal-600 border-teal-200' },
};

function SectionHeader({ priority }) {
  const meta = PRIORITY_LABELS[priority];
  if (!meta) return null;
  return (
    <div className={`col-span-full flex items-center gap-3 mt-6 mb-1 pb-2 border-b ${meta.color}`}>
      <span className="text-xl">{meta.icon}</span>
      <div>
        <p className="font-black text-sm">{meta.label}</p>
        <p className="text-xs text-gray-400">{meta.sub}</p>
      </div>
    </div>
  );
}

export default function CouponGrid({ coupons = [] }) {
  if (coupons.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">🏷️</p>
        <p className="font-medium">No coupons found</p>
        <p className="text-sm mt-1">Try a different search or category</p>
      </div>
    );
  }

  const items = [];
  let lastPriority = null;
  let couponIndex = 0;

  coupons.forEach((coupon) => {
    // Insert section header when priority group changes
    const p = coupon.priority ?? 3;
    if (p !== lastPriority) {
      items.push(<SectionHeader key={`section-${p}`} priority={p} />);
      lastPriority = p;
    }

    items.push(<CouponCard key={coupon.id} coupon={coupon} />);

    // In-feed ad every AD_FREQUENCY coupons
    couponIndex++;
    if (couponIndex % AD_FREQUENCY === 0) {
      items.push(
        <div key={`ad-${couponIndex}`} className="col-span-full py-2">
          <AdUnit zone="infeed" />
        </div>
      );
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items}
    </div>
  );
}
