// Hidden tester tools (long-press the date on home for 2 seconds). Plain list, not designed.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { API_URL } from '@/config';
import { useEpisode, useMe, useSignOut } from '@/data/queries';
import { canDictateOnDevice } from '@/lib/dictation';
import { cancelAllReminders, fireReminderIn } from '@/lib/reminder';
import { colors, size } from '@/theme/tokens';

export default function Debug() {
  const { data: ep } = useEpisode();
  const { data: user } = useMe();
  const signOut = useSignOut();
  const [status, setStatus] = useState('');

  const confirmSignOut = () =>
    Alert.alert('Odjava?', 'Za ponovno prijavo potrebujete dostopno kodo.', [
      { text: 'Prekliči', style: 'cancel' },
      {
        text: 'Odjava',
        style: 'destructive',
        onPress: async () => {
          await cancelAllReminders();
          signOut.mutate(undefined, { onSuccess: () => router.replace('/setup') });
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
        <Row
          label="Preveri narekovanje (sl-SI na napravi)"
          onPress={async () => setStatus(`Narekovanje na napravi: ${(await canDictateOnDevice()) ? 'da' : 'ne'}`)}
        />
        <Text variant="body" color={colors.ink2}>
          {[`Strežnik: ${API_URL}`, `Uporabnik: ${user?.name ?? '-'}`, `Epizoda: ${ep?.episode.id ?? '-'}`, `Dan: ${ep?.dayNumber ?? '-'}`].join('\n')}
        </Text>
        <Row label="Odjava" danger onPress={confirmSignOut} />
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
});
