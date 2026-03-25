import ForgeForm from './components/ForgeForm';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-black font-sans">
      <main className="w-full max-w-6xl px-6 py-12 sm:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            VideoAssetForge
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Generate PNG overlays and timeline data from your video scripts or
            audio using AI.
          </p>
        </header>

        <ForgeForm />
      </main>
    </div>
  );
}
