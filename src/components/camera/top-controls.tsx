import { StyleSheet, View } from 'react-native';
import type { FlashMode } from 'react-native-vision-camera';

import { RoundControl } from '@/components/camera/round-control';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors } from '@/theme/tokens';

export type TimerSeconds = 0 | 3 | 10;

type Props = {
  flash: FlashMode;
  onFlash: (next: FlashMode) => void;
  showFlash: boolean;
  torch: boolean;
  onTorch: (next: boolean) => void;
  showTorch: boolean;
  timer: TimerSeconds;
  onTimer: (next: TimerSeconds) => void;
  grid: boolean;
  onGrid: (next: boolean) => void;
};

const nextFlash: Record<FlashMode, FlashMode> = { auto: 'on', on: 'off', off: 'auto' };
const flashIcon = { auto: 'flashAuto', on: 'flash', off: 'flashOff' } as const;
const nextTimer: Record<TimerSeconds, TimerSeconds> = { 0: 3, 3: 10, 10: 0 };
const timerLabel: Record<TimerSeconds, string> = { 0: sl.camera.timer.off, 3: sl.camera.timer.s3, 10: sl.camera.timer.s10 };

/** Column of toggles on the right edge. Controls the current lens can't do are left out. */
export function TopControls(p: Props) {
  return (
    <View style={styles.column}>
      {p.showFlash && (
        <RoundControl
          icon={flashIcon[p.flash]}
          label={sl.camera.flash[p.flash]}
          active={p.flash === 'on'}
          onPress={() => p.onFlash(nextFlash[p.flash])}
        />
      )}
      {p.showTorch && <RoundControl icon="torch" label={sl.camera.torch} active={p.torch} onPress={() => p.onTorch(!p.torch)} />}
      <View>
        <RoundControl icon="timer" label={timerLabel[p.timer]} active={p.timer > 0} onPress={() => p.onTimer(nextTimer[p.timer])} />
        {p.timer > 0 && (
          <View style={styles.badge} pointerEvents="none">
            <Text variant="metaStrong" color="#1B1B1B" style={styles.badgeText}>
              {p.timer}
            </Text>
          </View>
        )}
      </View>
      <RoundControl icon="grid" label={sl.camera.grid} active={p.grid} onPress={() => p.onGrid(!p.grid)} />
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 12, alignItems: 'center' },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, lineHeight: 18 },
});
