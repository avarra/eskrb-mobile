// Hidden tester tools (long-press the date on home for 2 seconds). Plain list, not designed.
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { device } from '@/data';
import { useEpisode } from '@/data/queries';
import { canDictateOnDevice } from '@/lib/dictation';
import { cancelAllReminders, fireReminderIn } from '@/lib/reminder';
import { colors, font, size } from '@/theme/tokens';

export default function Debug() {
  const { data: me } = useEpisode();
  const qc = useQueryClient();
  const [day, setDay] = useState('');
  const [status, setStatus] = useState('');
  const episodeId = me?.episode.id;

  const run = (label: string, fn: () => Promise<unknown>) => async () => {
    try {
      await fn();
      await qc.invalidateQueries();
      setStatus(`${label}: v redu`);
    } catch (e) {
      setStatus(`${label}: napaka ${String(e)}`);
    }
  };

  const confirmReset = () =>
    Alert.alert('Ponastavi vse podatke?', 'Izbrisani bodo epizoda, pregledi, zapisi, sporočila in fotografije.', [
      { text: 'Prekliči', style: 'cancel' },
      {
        text: 'Ponastavi',
        style: 'destructive',
        onPress: async () => {
          await device.resetAll();
          await cancelAllReminders();
          qc.clear();
          router.replace('/setup');
        },
      },
    ]);

  return (
    <Screen>
      <TopBar onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Text variant="title" accessibilityRole="header">
          Orodja za testiranje
        </Text>
        <Row
          label="Opomnik čez 10 sekund"
          onPress={async () =>
            setStatus((await fireReminderIn(10)) ? 'Opomnik pride čez 10 sekund.' : 'Obvestila niso dovoljena. Vklopite jih v Nastavitvah.')
          }
        />
        <Row label="Dodaj odgovor sestre" disabled={!episodeId} onPress={run('Odgovor', () => device.addFakeReply(episodeId ?? ''))} />
        <Row label="Označi vse kot pregledano" disabled={!episodeId} onPress={run('Pregledano', () => device.markAllReviewed(episodeId ?? ''))} />
        <View style={styles.dayRow}>
          <TextInput
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
            placeholder={`Dan (zdaj ${me?.dayNumber ?? '-'})`}
            placeholderTextColor={colors.sheetInk2}
            accessibilityLabel="Številka dneva"
            style={styles.input}
          />
          <Row
            label="Nastavi dan"
            disabled={!episodeId || !/^\d+$/.test(day)}
            onPress={run('Dan', () => device.setDayNumber(episodeId ?? '', Math.max(1, Math.min(42, Number(day)))))}
            style={{ flex: 1 }}
          />
        </View>
        <Row
          label="Preveri narekovanje (sl-SI na napravi)"
          onPress={async () => setStatus(`Narekovanje na napravi: ${(await canDictateOnDevice()) ? 'da' : 'ne'}`)}
        />
        <Row label="Ponastavi vse podatke" danger onPress={confirmReset} />
        {status ? (
          <Text variant="body" color={colors.ink2} accessibilityLiveRegion="polite">
            {status}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, onPress, disabled, danger, style }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean; style?: object }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.row, danger && { backgroundColor: colors.urgent }, disabled && { opacity: 0.5 }, pressed && { opacity: 0.7 }, style]}
    >
      <Text variant="button">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: size.control, borderRadius: 16, backgroundColor: colors.tonal, paddingHorizontal: 18, justifyContent: 'center', paddingVertical: 10 },
  dayRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: {
    width: 140,
    minHeight: size.control,
    borderRadius: 16,
    backgroundColor: colors.sheet,
    paddingHorizontal: 16,
    fontFamily: font.regular,
    fontSize: 18,
    color: colors.sheetInk,
  },
});
