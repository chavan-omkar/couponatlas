import CouponCard from './CouponCard';
import AdUnit from './AdUnit';

const AD_FREQUENCY = 6; // Insert in-feed ad every N coupons

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
  coupons.forEach((coupon, i) => {
    items.push(<CouponCard key={coupon.id} coupon={coupon} />);

    // Insert in-feed ad every AD_FREQUENCY coupons (but not at the very end)
    if ((i + 1) % AD_FREQUENCY === 0 && i < coupons.length - 1) {
      items.push(
        <div key={`ad-${i}`} className="col-span-full py-2">
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
