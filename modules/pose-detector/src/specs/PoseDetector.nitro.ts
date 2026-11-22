import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera/lib/specs/instances/Frame.nitro';

/**
 * One ML Kit pose landmark. `x`/`y` are pixels in the *upright, un-mirrored* image (what the sensor
 * sees, rotated so "up" is up; x grows right, y grows down). `z` is ML Kit's relative depth, only
 * useful for comparisons.
 */
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  /** ML Kit's in-frame likelihood, 0..1. */
  likelihood: number;
  /**
   * Position in the raw `Frame`'s own pixel space (un-rotated buffer). Feed it to
   * `frame.convertFramePointToCameraPoint()` and then `camera.convertCameraPointToViewPoint()` to draw
   * on the preview; VisionCamera then handles rotation, mirroring and the preview crop.
   */
  frameX: number;
  frameY: number;
}

export interface Pose {
  /** 33 landmarks in ML Kit's order (0 = nose … 23/24 hips, 25/26 knees, 27/28 ankles …). */
  landmarks: PoseLandmark[];
  /** Upright image size in pixels (the coordinate space of `landmarks`). */
  width: number;
  height: number;
}

/** Runs ML Kit's accurate pose model on VisionCamera v5 frames, synchronously (call from `onFrame`). */
export interface PoseDetector extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** Returns `undefined` when no person is detected. Does not dispose the frame. */
  detect(frame: Frame): Pose | undefined;
}
