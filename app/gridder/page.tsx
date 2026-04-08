import GridderForm from './components/GridderForm';

export default function GridderPage() {
  return (
    <div className="flex flex-col flex-1 bg-background font-sans">
      <main className="w-full max-w-6xl mx-auto px-6 py-8 sm:px-8">
        <GridderForm />
      </main>
    </div>
  );
}
