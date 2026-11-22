import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';
import { Alert } from 'react-native';

import { sl } from '@/copy/sl';
import { pendingPhoto, usePendingPhoto } from '@/lib/pending-photo';

type Options = {
  /** How many photos may still be added; > 1 allows multi-select in the gallery. */
  limit: number;
  /** New local file URIs, from the camera modal (one) or the gallery (up to `limit`). */
  onPicked: (uris: string[]) => void;
  /** Adds a destructive "remove" choice to the sheet. */
  onRemove?: () => void;
};

/** "Take photo / pick from gallery" sheet. The camera modal hands its photo back through `pendingPhoto`. */
export function usePhotoPicker({ limit, onPicked, onRemove }: Options) {
  const pending = usePendingPhoto();
  const picked = useEffectEvent(onPicked);

  useEffect(() => {
    if (!pending) return;
    pendingPhoto.set(null);
    picked([pending]);
  }, [pending]);

  // Don't let a photo taken for this screen leak into the next one.
  useEffect(() => () => pendingPhoto.set(null), []);

  return () => {
    Alert.alert(sl.note.photoSource, undefined, [
      ...(limit > 0
        ? [
            { text: sl.note.takePhoto, onPress: () => router.push('/camera') },
            {
              text: sl.note.fromGallery,
              onPress: async () => {
                // iOS cannot present the picker while the alert is still animating away.
                await new Promise((resolve) => setTimeout(resolve, 450));
                const r = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  quality: 0.8,
                  allowsMultipleSelection: limit > 1,
                  selectionLimit: limit,
                  orderedSelection: true,
                });
                if (!r.canceled && r.assets.length) onPicked(r.assets.slice(0, limit).map((a) => a.uri));
              },
            },
          ]
        : []),
      ...(onRemove ? [{ text: sl.note.removePhoto, style: 'destructive' as const, onPress: onRemove }] : []),
      { text: sl.common.cancel, style: 'cancel' as const },
    ]);
  };
}
