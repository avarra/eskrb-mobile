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

/**
 * A photo as a multipart file part. Expo replaces the global `fetch` with `expo/fetch`, which can't send React Native's
 * `{ uri, name, type }` parts (it throws before any request goes out); it reads an expo-file-system `File` through `bytes()`.
 */
export function photoPart(uri: string): File {
  return new File(uri);
}
