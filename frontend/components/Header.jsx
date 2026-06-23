'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) router.push(`/?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏷️</span>
          <span className="font-extrabold text-xl text-brand-600 hidden sm:block">CouponHive</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coupons, stores, brands..."
              className="w-full border border-gray-300 rounded-full px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
        </form>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-600 shrink-0">
          <Link href="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <Link href="/stores" className="hover:text-brand-600 transition-colors">Stores</Link>
          <Link href="/category/all" className="hover:text-brand-600 transition-colors">Categories</Link>
        </nav>
      </div>
    </header>
  );
}
