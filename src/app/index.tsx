import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BuddyButton } from '@/components/buddy/buddy-button';
import { BuddyRow } from '@/components/buddy/buddy-row';
import { DayRing } from '@/components/day-ring';
import { MessageRow } from '@/components/message-row';
import { Orb } from '@/components/orb';
import { PillButton } from '@/components/pill-button';
import { ReminderSheet } from '@/components/reminder-sheet';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { sl } from '@/copy/sl';
import { BUDDY_POLL, useBuddy, useBuddyMessages, useEpisode, useSession, useSetSetting, useSetting, useSignOut, useTimeline } from '@/data/queries';
import { latestFromBuddy } from '@/domain/buddy';
import { clock, longDate } from '@/domain/format';
import { registerPushToken } from '@/lib/push';
import { enableDailyReminder } from '@/lib/reminder';
import { colors, size, space } from '@/theme/tokens';

const ASKED = 'notificationsAsked';
/** Below this the orb label gets cramped; on such tiny screens the ring may overlap its margins instead. */
const MIN_RING = 220;

export default function Home() {
  const session = useSession();
  const signedIn = session.data === true;
  const { data: me, isLoading, isError, refetch, isRefetching } = useEpisode(signedIn);
  const signOut = useSignOut();
  const { data: timeline } = useTimeline(me?.episode.id);
  const asked = useSetting(ASKED);
  const setSetting = useSetSetting();
  const { data: buddy } = useBuddy({ poll: BUDDY_POLL.home, enabled: signedIn });
  const buddyUnread = (buddy?.unread ?? 0) > 0;
  // Only to say when the newest unread message came; no polling of the thread from home.
  const { data: buddyThread } = useBuddyMessages({ enabled: buddyUnread, poll: false });
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());
  // Height left for the ring once the header rows and buttons have taken theirs.
  const [ringBoxH, setRingBoxH] = useState<number | null>(null);

  // Keep the date honest if the app stays open past midnight.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // The server's count wins (read on another phone, or before a reinstall); the local read time covers the moment
  // between opening a message and the episode refetching.
  const serverUnread = (me?.unreadMessages ?? 0) > 0;
  const unread = useMemo(
    () => (serverUnread ? timeline?.items.find((i) => i.kind === 'message' && i.message.fromRole !== 'patient' && !i.message.readAt) : undefined),
    [timeline, serverUnread],
  );

  if (session.isLoading) return <Screen>{null}</Screen>;
  if (!signedIn) return <Redirect href="/setup" />;
  if (isLoading) return <Screen>{null}</Screen>;
  if (isError || !me) {
    const copy = isError ? sl.offline : sl.noEpisode;
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          <Text variant="question" accessibilityRole="header">
            {copy.title}
          </Text>
          <Text variant="body" color={colors.ink2}>
            {copy.body}
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <PillButton variant="solid" label={copy.retry} onPress={() => refetch()} busy={isRefetching} />
          {!isError && <PillButton label={sl.noEpisode.signOut} onPress={() => signOut.mutate(undefined, { onSuccess: () => router.replace('/setup') })} />}
        </View>
      </Screen>
    );
  }

  const total = me.protocol.durationDays;
  const latest = buddyUnread ? latestFromBuddy(buddyThread) : undefined;
  const buddyLine = latest
    ? (latest.kind === 'cheer' ? sl.buddy.home.newCheer : sl.buddy.home.newText)(clock(latest.createdAt))
    : sl.buddy.home.unread;
  const done = me.todayCheckInDone;
  // Fit the ring to the leftover height so home never scrolls; floor keeps the orb label legible.
  const ringSize = Math.max(MIN_RING, Math.floor(Math.min(size.ring, width - space.side * 2, ringBoxH ?? Infinity)));
  const orbSize = Math.round((ringSize * size.startOrb) / size.ring);
  const showReminderAsk = asked.isSuccess && asked.data === null;

  const answerReminder = async (allow: boolean) => {
    setSetting.mutate({ key: ASKED, value: '1' });
    if (allow && (await enableDailyReminder())) await registerPushToken();
  };

  return (
    <Screen>
      <View style={styles.fill}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
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
          </View>
          <BuddyButton unread={buddyUnread} onPress={() => router.push('/buddy')} />
        </View>

        {unread?.kind === 'message' && (
          <MessageRow fromName={unread.message.fromName} createdAt={unread.message.createdAt} onPress={() => router.push(`/message/${unread.message.id}`)} />
        )}
        {/* The top-right button is the buddy entry; the row only announces something new, like the nurse row. */}
        {buddyUnread && buddy && (
          <BuddyRow name={buddy.buddy?.firstName ?? sl.buddy.title} line={buddyLine} unread onPress={() => router.push('/buddy')} />
        )}

        <View style={styles.ringBox} onLayout={(e) => setRingBoxH(e.nativeEvent.layout.height)}>
          {ringBoxH !== null && (
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
          )}
        </View>
        <Text variant="meta" color={colors.ink2} align="center" style={{ marginTop: 4 }} accessibilityLabel={`${sl.home.ringCaption} ${sl.home.ringA11y(me.dayNumber, total)}`}>
          {sl.home.ringCaption}
        </Text>
        {/* One row, so the care-team instructions link costs no height (home must never scroll). */}
        <View style={styles.links}>
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
          {me.notes.length > 0 && (
            <Pressable
              onPress={() => router.push('/instructions')}
              accessibilityRole="link"
              accessibilityLabel={sl.instructions.title}
              style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
            >
              <Text variant="metaStrong" style={styles.linkText}>
                {sl.instructions.link}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ gap: 12, marginTop: 8 }}>
          <PillButton label={sl.home.exercises} onPress={() => router.push('/exercises')} />
          <PillButton label={sl.home.addNote} icon="mic" onPress={() => router.push('/note')} />
        </View>
      </View>
      <ReminderSheet visible={showReminderAsk} onAnswer={answerReminder} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1 },
  // Takes all leftover height; the ring is sized to it, so the screen never needs to scroll.
  ringBox: { flex: 1, minHeight: 0, marginTop: 16, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  link: { alignSelf: 'center', minHeight: size.control, justifyContent: 'center', paddingHorizontal: 20 },
  linkText: { textDecorationLine: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' },
});
