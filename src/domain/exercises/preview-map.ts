type Size = { width: number; height: number };

/**
 * Maps a point in upright, un-mirrored image pixels onto a preview that fills `view` with
 * aspect-fill ('cover', VisionCamera's default) and is mirrored for the front camera.
 *
 * We do this ourselves because chaining VisionCamera's `convertFramePointToCameraPoint` into
 * `convertCameraPointToViewPoint` rotates the point twice (the skeleton came out upside down).
 */
export function uprightToView(
  p: { x: number; y: number },
  image: Size,
  view: Size,
  mirrored: boolean,
): { x: number; y: number } {
  const scale = Math.max(view.width / image.width, view.height / image.height);
  const offsetX = (image.width * scale - view.width) / 2;
  const offsetY = (image.height * scale - view.height) / 2;
  const x = p.x * scale - offsetX;
  const y = p.y * scale - offsetY;
  return { x: mirrored ? view.width - x : x, y };
}
