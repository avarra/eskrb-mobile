import { NitroModules } from 'react-native-nitro-modules';

import type { PoseDetector } from './specs/PoseDetector.nitro';

/** Creates a detector (one ML Kit client). Create once per screen; it can be captured in a frame worklet. */
export function createPoseDetector(): PoseDetector {
  return NitroModules.createHybridObject<PoseDetector>('PoseDetector');
}

export type { Pose, PoseDetector, PoseLandmark } from './specs/PoseDetector.nitro';
