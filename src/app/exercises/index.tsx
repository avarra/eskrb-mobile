import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { sl } from '@/copy/sl';
import { exercises } from '@/domain/exercises/catalog';
import { colors, radius, space } from '@/theme/tokens';

/** Picks which exercise to track. Order comes from the catalog (later: from the backend plan). */
export default function ExercisesScreen() {
  return (
    <Screen>
      <TopBar onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="title" accessibilityRole="header">
          {sl.exercises.title}
        </Text>
        <Text variant="body" color={colors.ink2}>
          {sl.exerciseLive.pick}
        </Text>

        {exercises.map((exercise, i) => {
          const copy = sl.exercises[exercise.id];
          return (
            <Pressable
              key={exercise.id}
              onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: exercise.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1}. ${copy.title}`}
              accessibilityHint={copy.cameraHint}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.number}>
                <Text variant="bodyStrong" color={colors.ground}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="entryTitle">{copy.title}</Text>
                <Text variant="meta" color={colors.ink2}>
                  {copy.cameraHint}
                </Text>
              </View>
              <Icon name="chev" color={colors.ink2} />
            </Pressable>
          );
        })}

        <Text variant="meta" color={colors.ink2} style={{ marginTop: space.s }}>
          {sl.exercises.suitability}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: space.l, paddingBottom: space.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.l,
    padding: space.l,
    borderRadius: radius.card,
    backgroundColor: colors.tonal,
    borderWidth: 1,
    borderColor: colors.tonalLine,
  },
  number: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
