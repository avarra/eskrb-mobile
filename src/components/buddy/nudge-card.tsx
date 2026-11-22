import { StyleSheet, View } from 'react-native';

import { PillButton } from '@/components/pill-button';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { colors, shadow } from '@/theme/tokens';

import { TodayDots } from './today-dots';

/** After 17.00, when the buddy hasn't checked in: a quiet tonal card with one solid "Spomnite na pregled". App only. */
export function NudgeCard({ text, myDone, busy, error, onRemind }: { text: string; myDone: boolean; busy: boolean; error: string | null; onRemind: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ marginTop: 6 }}>
          <TodayDots me={myDone} buddy={false} />
        </View>
        <Text variant="body" style={{ flex: 1 }}>
          {text}
        </Text>
      </View>
      <PillButton variant="solid" label={sl.buddy.nudge.action} onPress={onRemind} busy={busy} style={styles.pill} />
      {error && (
        <Text variant="meta" color={colors.ink} style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginTop: 16,
    backgroundColor: colors.tonal,
    boxShadow: shadow.tonal,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 14 },
  pill: { minHeight: 60, borderRadius: 30 },
});
