'use client';

import { useState } from 'react';
import { trackClick } from '../lib/api';

export default function CouponCard({ coupon }) {
  const [copied, setCopied] = useState(false);

  const merchant = coupon.merchant;
  const categories = coupon.categories?.map((c) => c.category) || [];

  async function handleCopy() {
    if (!coupon.code) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      trackClick(coupon.id).catch(() => {});
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for browsers that block clipboard
      const ta = document.createElement('textarea');
      ta.value = coupon.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  function handleDealClick() {
    trackClick(coupon.id).catch(() => {});
    window.open(coupon.sourceUrl, '_blank', 'noopener,noreferrer');
  }

  const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();

  return (
    <div className={`card p-4 flex flex-col gap-3 relative ${isExpired ? 'opacity-60' : ''}`}>
      {/* Verified badge */}
      {coupon.isVerified && (
        <span className="absolute top-3 right-3 bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          Verified
        </span>
      )}

      {/* Header: merchant + categories */}
      <div className="flex items-center gap-2">
        {merchant?.logo ? (
          <img src={merchant.logo} alt={merchant.name} className="w-8 h-8 object-contain rounded" />
        ) : (
          <div className="w-8 h-8 rounded bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
            {merchant?.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div>
          <p className="font-semibold text-sm text-gray-900">{merchant?.name}</p>
          {categories.length > 0 && (
            <p className="text-xs text-gray-400">{categories.map((c) => c.name).join(' · ')}</p>
          )}
        </div>
      </div>

      {/* Discount badge */}
      {coupon.discount && (
        <div className="inline-block self-start bg-brand-50 text-brand-600 text-sm font-bold px-3 py-1 rounded-lg">
          {coupon.discount}
        </div>
      )}

      {/* Title */}
      <p className="text-sm text-gray-700 leading-snug line-clamp-2">{coupon.title}</p>

      {/* Description */}
      {coupon.description && (
        <p className="text-xs text-gray-400 line-clamp-2">{coupon.description}</p>
      )}

      {/* Expiry */}
      {coupon.expiryDate && (
        <p className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
          {isExpired ? 'Expired' : `Expires ${new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </p>
      )}

      {/* Action */}
      <div className="mt-auto">
        {coupon.code ? (
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-between rounded-lg border-2 border-dashed px-3 py-2 text-sm font-mono font-semibold transition-all
              ${copied
                ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-brand-400 bg-brand-50 text-brand-700 hover:bg-brand-100 cursor-pointer'
              }`}
          >
            <span className="tracking-widest">{coupon.code}</span>
            <span className="text-xs font-sans ml-2 shrink-0">
              {copied ? '✓ Copied' : 'Copy'}
            </span>
          </button>
        ) : (
          <button
            onClick={handleDealClick}
            className="w-full btn-primary text-sm text-center"
          >
            Get Deal →
          </button>
        )}
      </div>

      {/* Source label */}
      <p className="text-[10px] text-gray-300 text-right -mb-1 capitalize">via {coupon.source}</p>
    </div>
  );
}
