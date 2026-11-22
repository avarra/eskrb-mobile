import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { zoomLabel, type ZoomStop } from '@/lib/camera-zoom';
import { colors } from '@/theme/tokens';

type Props = {
  stops: ZoomStop[];
  /** Current raw zoom (updated when a pinch ends or a pill is pressed). */
  zoom: number;
  neutral: number;
  onSelect: (zoom: number) => void;
};

/** Lens buttons. The pill nearest the current zoom is lit and shows the exact value (e.g. "1,6×"). */
export function ZoomPills({ stops, zoom, neutral, onSelect }: Props) {
  if (stops.length < 2) return null;
  // The active pill is the highest stop at or below the current zoom.
  const activeIndex = stops.reduce((acc, s, i) => (zoom >= s.zoom * 0.98 ? i : acc), 0);
  return (
    <View style={styles.row}>
      {stops.map((s, i) => {
        const active = i === activeIndex;
        const label = active ? zoomLabel(zoom, neutral) : s.label;
        return (
          <Pressable
            key={s.zoom}
            onPress={() => onSelect(s.zoom)}
            accessibilityRole="button"
            accessibilityLabel={sl.camera.zoom(s.label)}
            accessibilityState={{ selected: active }}
            hitSlop={6}
            style={[styles.pill, active && styles.active]}
          >
            <Text variant="metaStrong" color={active ? colors.today : colors.ink} style={styles.text}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pill: { minWidth: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  active: { backgroundColor: 'rgba(0,0,0,0.55)' },
  text: { fontSize: 16, lineHeight: 20, fontVariant: ['tabular-nums'] },
});
