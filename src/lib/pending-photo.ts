import { useSyncExternalStore } from 'react';

// Hands the photo from the camera modal back to the note screen without routing params.
let uri: string | null = null;
const listeners = new Set<() => void>();

export const pendingPhoto = {
  set(next: string | null) {
    uri = next;
    listeners.forEach((l) => l());
  },
  get: () => uri,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function usePendingPhoto(): string | null {
  return useSyncExternalStore(pendingPhoto.subscribe, pendingPhoto.get, pendingPhoto.get);
}
