'use client';

import { useEffect } from 'react';

const HTTP_URL_RE = /^https?:\/\/\S+$/i;

function extractImgSrcFromHtml(html: string): string | null {
  const match = html.match(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  if (!match) return null;
  const src = match[1] ?? match[2] ?? match[3] ?? null;
  if (!src) return null;
  if (src.startsWith('data:image/')) return src;
  if (/^https?:\/\//i.test(src)) return src;
  return null;
}

export function useClipboardPaste(
  onImage: ((dataUri: string) => void) | null,
  onError: (message: string) => void,
) {
  useEffect(() => {
    function handler(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

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

      if (isInput) return;

      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text && HTTP_URL_RE.test(text)) {
        e.preventDefault();
        if (!onImage) {
          onError('No active grid cell selected — click a cell first');
          return;
        }
        onImage(text);
        return;
      }

      const html = e.clipboardData?.getData('text/html');
      const imgSrc = html ? extractImgSrcFromHtml(html) : null;
      if (imgSrc) {
        e.preventDefault();
        if (!onImage) {
          onError('No active grid cell selected — click a cell first');
          return;
        }
        onImage(imgSrc);
      }
    }

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [onImage, onError]);
}
