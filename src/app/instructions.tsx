import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { CareNoteCard } from '@/components/care-note-card';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { sl } from '@/copy/sl';
import type { CareNote } from '@/data/api';
import { useEpisode } from '@/data/queries';
import { colors } from '@/theme/tokens';

/** Medication instructions first (they drive the "meds taken?" question), then advice; each oldest first. */
function ordered(notes: readonly CareNote[]): CareNote[] {
  return [...notes.filter((n) => n.kind === 'medication'), ...notes.filter((n) => n.kind === 'advice')];
}

/** Navodila ekipe: the care team's medication instructions and advice for this episode. Read-only. */
export default function Instructions() {
  const { data: me } = useEpisode();
  const notes = ordered(me?.notes ?? []);

  return (
    <Screen>
      <TopBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Text variant="title" accessibilityRole="header" style={{ marginTop: 8, marginBottom: 16 }}>
        {sl.instructions.title}
      </Text>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {notes.length === 0 && (
          <Text variant="body" color={colors.ink2}>
            {sl.instructions.empty}
          </Text>
        )}
        {notes.map((n) => (
          <CareNoteCard key={n.id} note={n} />
        ))}
      </ScrollView>
    </Screen>
  );
}
