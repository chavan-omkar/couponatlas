'use client';

/**
 * AdUnit — AdSense-ready ad placement component.
 *
 * Usage:
 *   <AdUnit zone="leaderboard" />    → 728×90 top banner
 *   <AdUnit zone="sidebar" />        → 300×250 medium rectangle
 *   <AdUnit zone="infeed" />         → responsive in-feed ad
 *   <AdUnit zone="footer" />         → 970×90 footer leaderboard
 *
 * To activate real ads:
 * 1. Replace the placeholder div with your AdSense <ins> tag
 * 2. Set NEXT_PUBLIC_ADSENSE_CLIENT in .env
 * 3. Remove the "Ad Placeholder" label
 */

const AD_CONFIG = {
  leaderboard: {
    label: 'Top Banner',
    className: 'w-full h-24 max-w-4xl mx-auto',
    adSlot: process.env.NEXT_PUBLIC_AD_SLOT_LEADERBOARD,
  },
  sidebar: {
    label: 'Sidebar',
    className: 'w-[300px] h-[250px]',
    adSlot: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR,
  },
  infeed: {
    label: 'In-Feed',
    className: 'w-full h-24',
    adSlot: process.env.NEXT_PUBLIC_AD_SLOT_INFEED,
  },
  footer: {
    label: 'Footer Banner',
    className: 'w-full h-20 max-w-5xl mx-auto',
    adSlot: process.env.NEXT_PUBLIC_AD_SLOT_FOOTER,
  },
};

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function AdUnit({ zone = 'infeed', className = '' }) {
  const config = AD_CONFIG[zone];
  if (!config) return null;

  // Production: render real AdSense tag
  if (ADSENSE_CLIENT && config.adSlot) {
    return (
      <div className={`overflow-hidden ${config.className} ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={config.adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Development: render placeholder
  return (
    <div
      className={`flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-xs font-medium ${config.className} ${className}`}
      aria-label="Advertisement"
    >
      Ad · {config.label}
    </div>
  );
}
