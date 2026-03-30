import ForgeForm from './components/ForgeForm';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-background font-sans">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-card-border bg-card">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative w-full max-w-5xl mx-auto px-6 py-10 sm:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-bold text-lg shadow-lg">
              V
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              VideoAssetForge
            </h1>
          </div>
          <p className="text-muted text-[15px] max-w-xl leading-relaxed">
            Generate PNG overlays and timeline data from your video scripts using AI.
            Paste a script, customize your style, and download production-ready assets.
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="w-full max-w-5xl mx-auto px-6 py-8 sm:px-8">
        <ForgeForm />
      </main>
    </div>
  );
}
