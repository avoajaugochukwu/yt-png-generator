'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Forge' },
  { href: '/gridder', label: 'Gridder' },
  { href: '/package', label: 'Package' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-card-border bg-card">
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 flex items-center gap-6 h-14">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-bold text-sm shadow">
            V
          </div>
          <span className="font-semibold text-foreground tracking-tight">
            VideoAssetForge
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
