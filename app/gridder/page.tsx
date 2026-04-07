import Link from 'next/link';
import GridderForm from './components/GridderForm';

export default function GridderPage() {
  return (
    <div className="flex flex-col flex-1 bg-background font-sans">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-card-border bg-card">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative w-full max-w-6xl mx-auto px-6 py-10 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-bold text-lg shadow-lg">
              G
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                VideoAssetForge — Gridder
              </h1>
            </div>
          </div>
          <p className="text-muted text-[15px] max-w-xl leading-relaxed">
            Create composite thumbnail grids from multiple images. Select a
            layout, fill cells with images, and export a 16:9 PNG.
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to PNG Generator
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main className="w-full max-w-6xl mx-auto px-6 py-8 sm:px-8">
        <GridderForm />
      </main>
    </div>
  );
}
