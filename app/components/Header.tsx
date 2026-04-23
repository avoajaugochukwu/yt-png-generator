'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Forge' },
  { href: '/gridder', label: 'Gridder' },
  { href: '/package', label: 'Package' },
];

type HeaderUser = { name: string | null; email: string | null } | null;

export default function Header({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const displayName = user?.name || user?.email || null;

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

        {displayName && (
          <div className="ml-auto flex items-center gap-3">
            <span
              className="text-sm text-muted-foreground truncate max-w-[200px]"
              title={user?.email ?? undefined}
            >
              {displayName}
            </span>
            <a
              href="/api/auth/logout"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              Log out
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
