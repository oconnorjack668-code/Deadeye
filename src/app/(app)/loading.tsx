// src/app/(app)/loading.tsx
// Shown instantly while a page's data loads, so taps on the nav feel immediate.
// The skeleton is there at 0 ms with one slow light sweep across it; the
// slogan pill (PageLoader) joins only if the page takes longer than 400 ms.
import { PageLoader } from '@/components/brand/PageLoader';

export default function Loading() {
  return (
    <div className="relative flex-1 overflow-hidden" aria-busy="true">
      <div className="p-4 md:p-8 max-w-7xl mx-auto" aria-hidden="true">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-zinc-800" />
            <div className="h-3 w-64 rounded bg-zinc-900" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-zinc-800 bg-zinc-900/70" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      </div>
      {/* One light band, moved by transform only */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="deadeye-sweep absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      </div>
      <PageLoader />
    </div>
  );
}
