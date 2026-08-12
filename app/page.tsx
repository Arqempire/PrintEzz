import Link from 'next/link';
import { Printer, QrCode, ArrowRight, ShieldCheck, Zap, Smartphone, CheckCircle2 } from 'lucide-react';

export default function RootHomePage() {
  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 blur-3xl rounded-full pointer-events-none" />

      <header className="max-w-5xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Printer className="w-5 h-5" />
          </div>
          <span className="font-black text-xl text-slate-100 tracking-tight">PrintEzz</span>
        </div>

        <Link
          href="/shop/demo-shop/admin"
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3.5 py-2 rounded-xl transition-all hover:bg-indigo-950/40"
        >
          Shopkeeper Dashboard →
        </Link>
      </header>

      <section className="max-w-3xl mx-auto w-full text-center space-y-6 py-12 z-10">
        <div className="inline-flex items-center space-x-2 bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 px-3.5 py-1.5 rounded-full text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 fill-current text-indigo-400" />
          <span>No App Install Required • Phone Browser Native</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
          Self-Service QR Printing <br className="hidden md:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
            From Any Phone Browser
          </span>
        </h1>

        <p className="text-base text-slate-400 max-w-xl mx-auto">
          Scan the shop's QR code, select documents, choose B&W or Color, pay instantly via UPI, and pick up your print out of the tray.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/shop/demo-shop"
            className="w-full sm:w-auto py-4 px-8 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base rounded-2xl flex items-center justify-center space-x-3 shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Smartphone className="w-5 h-5" />
            <span>Try Customer Demo Flow</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/shop/demo-shop/admin"
            className="w-full sm:w-auto py-4 px-8 glass-card hover:bg-slate-800 text-slate-200 font-bold text-base rounded-2xl flex items-center justify-center space-x-2 border border-slate-700 transition-all"
          >
            <Printer className="w-5 h-5 text-indigo-400" />
            <span>Open Shopkeeper Admin</span>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4 z-10">
        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-2">
          <QrCode className="w-6 h-6 text-indigo-400" />
          <h3 className="font-bold text-sm text-slate-200">1. Instant QR Access</h3>
          <p className="text-xs text-slate-400">
            Zero app installation required. Customers reach the print flow directly via phone camera scan.
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-2">
          <Zap className="w-6 h-6 text-emerald-400" />
          <h3 className="font-bold text-sm text-slate-200">2. UPI Checkout</h3>
          <p className="text-xs text-slate-400">
            Live dynamic price calculation (B&W/Color, copies, duplex) with instant UPI verification.
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-slate-800 space-y-2">
          <ShieldCheck className="w-6 h-6 text-violet-400" />
          <h3 className="font-bold text-sm text-slate-200">3. Privacy & 24h Auto-Delete</h3>
          <p className="text-xs text-slate-400">
            Files stored in Cloudflare R2 with scheduled Supabase Edge Function cleanup after 24 hours.
          </p>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto w-full pt-8 border-t border-slate-800/60 text-center text-xs text-slate-500 z-10">
        PrintEzz • Self-Service QR Print Shop Web Application
      </footer>
    </main>
  );
}
