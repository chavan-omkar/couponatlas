'use client';

import { useState } from 'react';
import { trackClick } from '../lib/api';

function cleanText(raw) {
  if (!raw) return null;
  return raw
    .replace(/\.cls-[\w-]+\{[^}]*\}/g, '')
    .replace(/\d+\s+Peo?ple\s+Used\s+(Today|This Week)/gi, '')
    .replace(/\bVerified\b/gi, '')
    .replace(/See\s+more[\s\S]*?See\s+less/gi, '')
    .replace(/Get\s+Coupon/gi, '')
    .replace(/Get\s+Deal/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || null;
}

// Pick a vibrant color per merchant for their avatar
const MERCHANT_COLORS = {
  amazon:   'bg-yellow-400 text-yellow-900',
  flipkart: 'bg-blue-500 text-white',
  myntra:   'bg-pink-500 text-white',
  ajio:     'bg-purple-600 text-white',
  nykaa:    'bg-rose-500 text-white',
  swiggy:   'bg-orange-500 text-white',
  zomato:   'bg-red-500 text-white',
  meesho:   'bg-fuchsia-500 text-white',
  snapdeal: 'bg-red-600 text-white',
  paytm:    'bg-sky-500 text-white',
};

function merchantColor(slug) {
  return MERCHANT_COLORS[slug] || 'bg-gray-700 text-white';
}

export default function CouponCard({ coupon }) {
  const [copied, setCopied] = useState(false);
  const merchant = coupon.merchant;
  const categories = coupon.categories?.map((c) => c.category) || [];
  const title = cleanText(coupon.title);
  const discount = cleanText(coupon.discount);
  const description = cleanText(coupon.description);
  const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
  const colorClass = merchantColor(merchant?.slug || '');

  async function handleCopy() {
    if (!coupon.code) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = coupon.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    trackClick(coupon.id).catch(() => {});
    setTimeout(() => setCopied(false), 3000);
  }

  function handleDealClick() {
    trackClick(coupon.id).catch(() => {});
    window.open(coupon.sourceUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className={`card card-lift flex flex-col animate-fade-in ${isExpired ? 'opacity-50' : ''}`}>
      {/* Colored top strip */}
      <div className={`h-1.5 rounded-t-2xl ${coupon.type === 'code' ? 'bg-gradient-to-r from-orange-400 to-pink-400' : 'bg-gradient-to-r from-green-400 to-teal-400'}`} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Merchant row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {merchant?.logo ? (
              <img src={merchant.logo} alt={merchant.name} className="w-9 h-9 object-contain rounded-xl border border-gray-100" />
            ) : (
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${colorClass}`}>
                {merchant?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <p className="font-bold text-sm text-gray-900 leading-tight">{merchant?.name}</p>
              {categories.length > 0 && (
                <p className="text-[11px] text-gray-400">{categories.map(c => c.name).join(' · ')}</p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-col items-end gap-1">
            {coupon.isVerified && (
              <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                ✓ Verified
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${coupon.type === 'code' ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-600'}`}>
              {coupon.type === 'code' ? 'Promo Code' : 'Deal'}
            </span>
          </div>
        </div>

        {/* Discount */}
        {discount && (
          <div className="inline-block self-start">
            <span className="text-lg font-black text-gray-900">{discount}</span>
          </div>
        )}

        {/* Title */}
        {title && (
          <p className="text-sm text-gray-700 leading-snug line-clamp-2 font-medium">{title}</p>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Expiry */}
        {coupon.expiryDate && (
          <p className={`text-xs flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
            <span>{isExpired ? '❌' : '⏳'}</span>
            {isExpired
              ? 'Expired'
              : `Expires ${new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
        )}

        {/* Action */}
        <div className="mt-auto pt-1">
          {coupon.code ? (
            <button
              onClick={handleCopy}
              className={`w-full relative code-shine flex items-center justify-between rounded-xl px-4 py-2.5 font-mono text-sm font-bold border-2 border-dashed transition-all duration-200 cursor-pointer select-none
                ${copied
                  ? 'bg-green-50 border-green-400 text-green-700'
                  : 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400'
                }`}
            >
              <span className="tracking-widest text-base">{coupon.code}</span>
              <span className={`text-xs font-sans font-bold px-2.5 py-1 rounded-lg ml-2 shrink-0 transition-all
                ${copied ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                {copied ? '✓ Copied!' : 'Copy'}
              </span>
            </button>
          ) : (
            <button
              onClick={handleDealClick}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
            >
              <span>Get Deal</span>
              <span className="text-base">→</span>
            </button>
          )}
        </div>

        {/* Source */}
        <p className="text-[10px] text-gray-300 text-right -mb-1 capitalize">via {coupon.source}</p>
      </div>
    </div>
  );
}
