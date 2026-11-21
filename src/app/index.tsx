import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { DayRing } from '@/components/day-ring';
import { MessageRow } from '@/components/message-row';
import { Orb } from '@/components/orb';
import { PillButton } from '@/components/pill-button';
import { ReminderSheet } from '@/components/reminder-sheet';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { STAFF } from '@/config';
import { sl } from '@/copy/sl';
import { useEpisode, useSetSetting, useSetting, useTimeline } from '@/data/queries';
import { longDate } from '@/domain/format';
import { enableDailyReminder } from '@/lib/reminder';
import { colors, size, space } from '@/theme/tokens';

const ASKED = 'notificationsAsked';

export default function Home() {
  const { data: me, isLoading } = useEpisode();
  const { data: timeline } = useTimeline(me?.episode.id);
  const asked = useSetting(ASKED);
  const setSetting = useSetSetting();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());

  // Keep the date honest if the app stays open past midnight.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const unread = useMemo(
    () => timeline?.items.find((i) => i.kind === 'message' && i.message.fromUserId === STAFF.id && !i.message.readAt),
    [timeline],
  );

  if (isLoading) return <Screen>{null}</Screen>;
  if (!me) return <Redirect href="/setup" />;

  const total = me.protocol.durationDays;
  const done = me.todayCheckInDone;
  const ringSize = Math.min(size.ring, width - space.side * 2);
  const orbSize = Math.round((ringSize * size.startOrb) / size.ring);
  const showReminderAsk = asked.isSuccess && asked.data === null;

  const answerReminder = async (allow: boolean) => {
    setSetting.mutate({ key: ASKED, value: '1' });
    if (allow) await enableDailyReminder();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        <Pressable
          onLongPress={() => router.push('/debug')}
          delayLongPress={2000}
          accessible={false}
          style={{ alignSelf: 'flex-start' }}
        >
          <Text variant="body" color={colors.ink2} style={{ marginTop: 16, lineHeight: 26 }}>
            {longDate(now)}
          </Text>
        </Pressable>
        <Text variant="title" accessibilityRole="header" style={{ marginTop: 6 }}>
          {sl.common.dayOf(me.dayNumber, total)}
        </Text>

        {unread?.kind === 'message' && (
          <MessageRow createdAt={unread.message.createdAt} onPress={() => router.push(`/message/${unread.message.id}`)} />
        )}

        <View style={styles.grow} />

        <DayRing day={me.dayNumber} total={total} todayDone={done} size={ringSize}>
          <Orb
            diameter={orbSize}
            onPress={() => router.push('/checkin')}
            disabled={done}
            accessibilityLabel={done ? sl.home.doneA11y : sl.home.startA11y}
            accessibilityHint={done ? undefined : sl.home.startHint}
          >
            <Text variant="startButton" color={colors.ground} align="center" maxFontSizeMultiplier={1.15}>
              {done ? sl.home.done : sl.home.start}
            </Text>
            <Text variant="meta" color={colors.sheetInk2} align="center" maxFontSizeMultiplier={1.15}>
              {done ? sl.home.doneHint : sl.home.startHint}
            </Text>
          </Orb>
        </DayRing>
        <Text variant="meta" color={colors.ink2} align="center" style={{ marginTop: 4 }} accessibilityLabel={`${sl.home.ringCaption} ${sl.home.ringA11y(me.dayNumber, total)}`}>
          {sl.home.ringCaption}
        </Text>
        <Pressable
          onPress={() => router.push('/notes')}
          accessibilityRole="link"
          accessibilityLabel={sl.home.allNotes}
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
        >
          <Text variant="metaStrong" style={styles.linkText}>
            {sl.home.allNotes}
          </Text>
        </Pressable>

        <View style={styles.grow} />

        <PillButton label={sl.home.addNote} icon="mic" onPress={() => router.push('/note')} />
      </ScrollView>
      <ReminderSheet visible={showReminderAsk} onAnswer={answerReminder} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  grow: { flexGrow: 1, minHeight: 20 },
  link: { alignSelf: 'center', minHeight: size.control, justifyContent: 'center', paddingHorizontal: 20 },
  linkText: { textDecorationLine: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' },
});
