'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) router.push(`/?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="text-2xl group-hover:scale-110 transition-transform duration-150">🗺️</span>
          <span className="font-black text-xl bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent hidden sm:block tracking-tight">
            CouponAtlas
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
          <div className={`relative transition-all duration-200 ${focused ? 'scale-[1.01]' : ''}`}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search coupons, stores, brands..."
              className="w-full border-2 border-gray-200 focus:border-orange-400 rounded-full px-5 py-2.5 pl-11 text-sm focus:outline-none transition-colors duration-150 bg-gray-50 focus:bg-white"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            {query && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-orange-600 transition-colors"
              >
                Search
              </button>
            )}
          </div>
        </form>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium shrink-0">
          <Link href="/" className="px-3 py-2 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors">
            Home
          </Link>
          <Link href="/stores" className="px-3 py-2 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors">
            Stores
          </Link>
          <Link href="/category/all" className="px-3 py-2 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors">
            Categories
          </Link>
        </nav>
      </div>
    </header>
  );
}
