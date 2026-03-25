'use client';

interface InputSectionProps {
  scriptText: string;
  onScriptChange: (text: string) => void;
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
  isLoading: boolean;
}

export default function InputSection({
  scriptText,
  onScriptChange,
  audioFile,
  onAudioFileChange,
  isLoading,
}: InputSectionProps) {
  async function handleScriptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onScriptChange(text);
  }

  function handleAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onAudioFileChange(file);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Paste your video script
        </label>
        <textarea
          className="w-full h-48 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          placeholder="Paste your video script here..."
          value={scriptText}
          onChange={(e) => onScriptChange(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">
            Or upload a script file (.txt)
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={handleScriptFile}
            disabled={isLoading}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 file:cursor-pointer"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1.5">
            Or upload audio for transcription
          </label>
          <input
            type="file"
            accept=".mp3,.wav,.m4a"
            onChange={handleAudioFile}
            disabled={isLoading}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 file:cursor-pointer"
          />
          {audioFile && (
            <p className="mt-1.5 text-sm text-neutral-500">
              Selected: {audioFile.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
