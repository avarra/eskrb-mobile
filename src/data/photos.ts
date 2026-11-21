import { File } from 'expo-file-system';

/** Don't leave the picker's / camera's temporary copy of a wound photo lying around in caches. */
export function deleteTempPhoto(uri: string): void {
  if (!/\/(tmp|Caches|cache)\//i.test(uri)) return;
  try {
    new File(uri).delete();
  } catch {
    // best effort
  }
}

/** File name and MIME type for a multipart upload, from the local file's extension. */
export function photoPart(uri: string): { uri: string; name: string; type: string } {
  const ext = /\.(png|heic|heif|webp|jpe?g)$/i.exec(uri)?.[1]?.toLowerCase() ?? 'jpg';
  const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  return { uri, name: `photo.${ext}`, type };
}

