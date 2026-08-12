import React from 'react';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-start selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md min-h-screen flex flex-col justify-between px-4 pt-safe pb-safe relative shadow-2xl bg-slate-950/60 border-x border-slate-800/40">
        {children}
      </div>
    </div>
  );
}
