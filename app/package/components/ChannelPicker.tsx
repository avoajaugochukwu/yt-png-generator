'use client';

import { CHANNELS, type Channel } from '@/lib/channels';

interface Props {
  channel: Channel;
  onChange: (c: Channel) => void;
}

export default function ChannelPicker({ channel, onChange }: Props) {
  const channels = Object.values(CHANNELS);

  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-light">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">Channel</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {channels.map((c) => {
          const isSelected = c.id === channel;
          return (
            <button
              key={c.id}
              onClick={() => onChange(c.id)}
              className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? 'border-accent bg-accent-light'
                  : 'border-card-border hover:border-accent/50 hover:bg-surface'
              }`}
            >
              <span className="text-sm font-semibold text-foreground">{c.label}</span>
              <span className="text-[11px] text-muted">
                {c.imageMode === 'deterministic' ? 'Custom images' : 'AI images'} ·{' '}
                {c.supportedScriptTypes.filter((t) => c.thumbnail[t]).join(', ') || 'no specs'}
              </span>
            </button>
          );
        })}
        <div className="flex flex-col items-start gap-1 rounded-lg border border-dashed border-card-border p-3 opacity-60">
          <span className="text-sm font-semibold text-muted">More channels</span>
          <span className="text-[11px] text-muted-light">More coming soon</span>
        </div>
      </div>
    </div>
  );
}
