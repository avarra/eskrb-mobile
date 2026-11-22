import type { CameraDevice } from 'react-native-vision-camera';

export type ZoomStop = { zoom: number; label: string };

/**
 * The raw zoom value that users call "1×".
 * iOS virtual devices start at the ultra-wide (raw 1 = 0.5×), so 1× is the first lens switch factor.
 * Android zoom ratios are already relative to the main lens, and its switch factors are always empty.
 */
export function neutralZoom(device: CameraDevice): number {
  const hasUltraWide = device.physicalDevices.some((d) => d.type === 'ultra-wide-angle');
  const neutral = hasUltraWide && device.zoomLensSwitchFactors.length > 0 ? device.zoomLensSwitchFactors[0] : 1;
  return Math.min(Math.max(neutral, device.minZoom), device.maxZoom);
}

export function zoomLabel(zoom: number, neutral: number): string {
  const rounded = Math.round((zoom / neutral) * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',')}×`;
}

/** Lens buttons: ultra-wide (if any), 1×, each further lens, or a digital 2× when the phone has no telephoto. */
export function zoomStops(device: CameraDevice): ZoomStop[] {
  const neutral = neutralZoom(device);
  const raw = new Set<number>();
  if (device.minZoom < neutral * 0.95) raw.add(device.minZoom);
  raw.add(neutral);
  const further = device.zoomLensSwitchFactors.filter((f) => f > neutral * 1.05 && f <= device.maxZoom);
  further.forEach((f) => raw.add(f));
  if (further.length === 0 && neutral * 2 <= device.maxZoom) raw.add(neutral * 2);
  return [...raw].sort((a, b) => a - b).map((zoom) => ({ zoom, label: zoomLabel(zoom, neutral) }));
}
