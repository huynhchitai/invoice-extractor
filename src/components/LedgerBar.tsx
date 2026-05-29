'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LedgerBar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isHow  = pathname === '/how-it-works';

  return (
    <nav
      className="sticky top-0 z-50 border-b-2 border-ink"
      style={{ background: 'var(--paper)', backdropFilter: 'blur(4px)' }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          {/* Mini ledger icon */}
          <span className="inline-flex flex-col gap-[3px]" aria-hidden="true">
            <span className="block h-[2px] w-5 bg-[var(--ledger)]" />
            <span className="block h-[2px] w-5 bg-[var(--ledger)]" />
            <span className="block h-[2px] w-3 bg-[var(--ledger)]" />
          </span>
          <span
            className="font-display text-base font-semibold tracking-tight"
            style={{ color: 'var(--ink)' }}
          >
            Invoice Extractor
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="ledger-eyebrow transition-colors"
            style={{ color: isHome ? 'var(--ledger)' : undefined }}
            aria-current={isHome ? 'page' : undefined}
          >
            Demo
          </Link>
          <Link
            href="/how-it-works"
            className="ledger-eyebrow transition-colors"
            style={{ color: isHow ? 'var(--ledger)' : undefined }}
            aria-current={isHow ? 'page' : undefined}
          >
            How it works
          </Link>
          <a
            href="https://github.com/huynhchitai"
            target="_blank"
            rel="noopener noreferrer"
            className="ledger-eyebrow transition-colors hover:text-[var(--ink)]"
          >
            Tai Huynh ↗
          </a>
        </div>
      </div>
    </nav>
  );
}
