import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors } from '@/theme/tokens';

function barColor(v: number) {
  if (v >= 7) return '#FF8A5C';
  if (v >= 6) return '#FFA37A';
  return colors.heatMid;
}

/** Last three pain values as warm bars plus a dashed slot for today, with one plain sentence. */
export function PainTrend({ values, todayDone }: { values: number[]; todayDone: boolean }) {
  const shown = values.slice(-3);
  const list = shown.join(', ');
  const first = shown[0];
  const lastV = shown[shown.length - 1];
  const sentence =
    shown.length === 0
      ? sl.notes.trendNone
      : shown.length > 1 && lastV < first
        ? sl.notes.trendDown(list)
        : shown.length > 1 && lastV > first
          ? sl.notes.trendUp(list)
          : sl.notes.trendSame(list);
  const slots = shown.length + (todayDone ? 0 : 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }} accessible accessibilityLabel={sentence}>
      <Svg width={slots * 30} height={64}>
        {shown.map((v, i) => {
          const h = 6 + v * 5;
          return <Rect key={i} x={i * 30} y={58 - h} width={20} height={h} rx={6} fill={barColor(v)} />;
        })}
        {!todayDone && (
          <Rect x={shown.length * 30 + 1} y={30} width={20} height={28} rx={6} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2} strokeDasharray="4 4" />
        )}
      </Svg>
      <Text variant="meta" color={colors.ink2} style={{ flex: 1 }}>
        {sentence}
      </Text>
    </View>
  );
}
