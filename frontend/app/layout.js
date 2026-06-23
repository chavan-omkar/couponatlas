import './globals.css';
import Header from '../components/Header';
import AdUnit from '../components/AdUnit';

export const metadata = {
  title: 'CouponAtlas — Best Coupons & Deals',
  description: 'Find the best coupons, promo codes, and deals from top Indian and global brands.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense script — replace ca-pub-XXXX with your publisher ID */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <Header />

        {/* Leaderboard ad — top of every page */}
        <div className="bg-white border-b border-gray-100 py-2 px-4 flex justify-center">
          <AdUnit zone="leaderboard" />
        </div>

        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

        {/* Footer ad */}
        <footer className="border-t border-gray-200 mt-10 py-6 px-4 bg-white">
          <div className="flex justify-center mb-4">
            <AdUnit zone="footer" />
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            © {new Date().getFullYear()} CouponAtlas. All rights reserved.
          </p>
        </footer>
      </body>
    </html>
  );
}
