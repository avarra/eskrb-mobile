import { Directory, File, Paths } from 'expo-file-system';

import { uid } from '@/domain/day';

/** Photos live in the app's document directory so they survive restarts; only the path goes in the DB. */
export const photosDir = new Directory(Paths.document, 'photos');

export async function savePhoto(sourceUri: string): Promise<string> {
  if (!photosDir.exists) photosDir.create({ intermediates: true, idempotent: true });
  const ext = /\.(png|heic|jpe?g)$/i.exec(sourceUri)?.[1]?.toLowerCase() ?? 'jpg';
  const target = new File(photosDir, `${uid()}.${ext}`);
  const source = new File(sourceUri);
  await source.copy(target);
  // Don't leave the picker's / camera's temporary copy of a wound photo lying around in caches.
  if (/\/(tmp|Caches)\//.test(sourceUri)) {
    try {
      source.delete();
    } catch {
      // best effort
    }
  }
  return target.uri;
}

export function deleteAllPhotos(): void {
  if (photosDir.exists) photosDir.delete();
}
