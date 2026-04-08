import ForgeForm from './components/ForgeForm';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-background font-sans">
      <main className="w-full max-w-5xl mx-auto px-6 py-8 sm:px-8">
        <ForgeForm />
      </main>
    </div>
  );
}
