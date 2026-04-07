'use client';

import { useEffect } from 'react';

const IMAGE_URL_RE = /^https?:\/\/.+\.(jpe?g|png|gif|webp|svg|bmp|avif)(\?.*)?$/i;

export function useClipboardPaste(
  onImage: ((dataUri: string) => void) | null,
  onError: (message: string) => void,
) {
  useEffect(() => {
    function handler(e: ClipboardEvent) {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/'),
      );

      if (file) {
        e.preventDefault();
        if (!onImage) {
          onError('No active grid cell selected — click a cell first');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => onImage(reader.result as string);
        reader.onerror = () => onError('Failed to read pasted image');
        reader.readAsDataURL(file);
        return;
      }

      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text && IMAGE_URL_RE.test(text)) {
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;
        if (isInput) return;

        e.preventDefault();
        if (!onImage) {
          onError('No active grid cell selected — click a cell first');
          return;
        }
        onImage(text);
      }
    }

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [onImage, onError]);
}
