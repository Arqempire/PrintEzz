import Link from 'next/link';
import { Printer, QrCode, ArrowRight, ShieldCheck, Zap, Smartphone, CheckCircle2, Lock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function RootHomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] flex flex-col justify-between p-4 sm:p-8 md:p-12 transition-colors duration-300">
      {/* Header Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary-green)] flex items-center justify-center text-white shadow-md">
            <Printer className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg text-[var(--text-main)] tracking-tight">PrintEzz</span>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link
            href="/shop/demo-shop/admin"
            className="text-xs font-semibold text-[var(--text-main)] hover:text-[var(--primary-green)] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-2xl mx-auto w-full text-center space-y-6 py-8 sm:py-12">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-normal tracking-tight text-[var(--primary-green)] font-serif-title leading-tight">
            Self-Service QR <br className="hidden sm:inline" />
            Printing
          </h1>
          <h2 className="text-lg sm:text-xl font-medium text-[var(--text-muted)] font-sans">
            From Any Phone Browser
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
          Simply scan the QR code at our hub, select your documents, pay securely, and pick up your prints instantly. Rooted in convenience.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col items-center justify-center gap-3 max-w-sm mx-auto w-full">
          <Link
            href="/shop/demo-shop"
            className="w-full py-3.5 px-6 bg-[var(--primary-green)] hover:opacity-90 text-white font-medium text-sm rounded-full flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-98"
          >
            <span>Try Customer Demo Flow</span>
          </Link>

          <Link
            href="/shop/demo-shop/admin"
            className="w-full py-3.5 px-6 bg-[var(--secondary-btn)] hover:opacity-90 text-[var(--text-main)] font-medium text-sm rounded-full flex items-center justify-center space-x-2 transition-all active:scale-98"
          >
            <span>Open Shopkeeper Admin</span>
          </Link>
        </div>

        {/* Feature Preview Frame */}
        <div className="pt-6">
          <div className="w-full max-w-md mx-auto p-4 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] border-b border-[var(--card-border)] pb-3">
              <span className="font-semibold text-[var(--text-main)]">Live Demo Hub</span>
              <span className="flex items-center text-[11px] text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Online & Ready
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--card-border)] text-left space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-green)] text-white flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-[var(--text-main)]">QuickPrint Hub (MG Road)</p>
                  <p className="text-[11px] text-[var(--text-muted)]">B&W: ₹2/pg • Color: ₹10/pg</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards List */}
      <section className="max-w-md mx-auto w-full space-y-4 py-4">
        {/* Feature 1 */}
        <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-start space-x-4">
          <div className="w-10 h-10 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif-title font-bold text-base text-[var(--primary-green)]">Instant QR Access</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              No apps to download. Just point your camera and start printing in seconds.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-start space-x-4">
          <div className="w-10 h-10 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center shrink-0 mt-0.5">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif-title font-bold text-base text-[var(--primary-green)]">UPI Checkout</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Fast, secure payments integrated directly into the browser flow.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-start space-x-4">
          <div className="w-10 h-10 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif-title font-bold text-base text-[var(--primary-green)]">Privacy First</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Your files are encrypted and automatically deleted after 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="max-w-2xl mx-auto w-full pt-10 pb-4 text-center space-y-4 text-xs text-[var(--text-muted)]">
        <h4 className="font-serif-title font-bold text-base text-[var(--primary-green)]">PrintEzz</h4>
        <div className="flex items-center justify-center space-x-6 text-xs text-[var(--text-muted)]">
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Terms</a>
          <a href="#" className="hover:underline">Support</a>
        </div>
        <p className="text-[11px] opacity-80">© 2026 PrintEzz. Rooted in convenience.</p>
      </footer>
    </main>
  );
}
