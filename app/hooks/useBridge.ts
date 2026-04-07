'use client';

import { useEffect } from 'react';

interface BridgeEvent {
  source: string;
  imageUrl: string;
}

export function useBridge(
  onImage: ((imageUrl: string) => void) | null,
  onError: (message: string) => void,
) {
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<BridgeEvent>).detail;
      if (!detail || detail.source !== 'google-images-extension') return;
      if (!detail.imageUrl || typeof detail.imageUrl !== 'string') {
        onError('Received invalid image data from extension');
        return;
      }
      if (!onImage) {
        onError('No active grid cell selected — click a cell first');
        return;
      }
      onImage(detail.imageUrl);
    }

    window.addEventListener('yt-script-image-from-extension', handler);
    return () => window.removeEventListener('yt-script-image-from-extension', handler);
  }, [onImage, onError]);
}
