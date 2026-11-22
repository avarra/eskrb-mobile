import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { BuddyAvatar } from '@/components/buddy/buddy-avatar';
import { BuddyComposer, type ComposerHandle } from '@/components/buddy/buddy-composer';
import { BuddyIcon } from '@/components/buddy/buddy-icons';
import { CheerSheet } from '@/components/buddy/cheer-sheet';
import { ConfirmSheet } from '@/components/buddy/confirm-sheet';
import { NudgeCard } from '@/components/buddy/nudge-card';
import { SafetyLine } from '@/components/buddy/safety-line';
import { SheetButton } from '@/components/buddy/sheet-buttons';
import { ThreadBubble } from '@/components/buddy/thread-bubble';
import { TodayDots } from '@/components/buddy/today-dots';
import { PillButton } from '@/components/pill-button';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { sl } from '@/copy/sl';
import type { BuddyMessage, Cheer } from '@/data/api';
import { ApiError } from '@/data/http';
import {
  BUDDY_POLL,
  useBuddy,
  useBuddyMessages,
  useEpisode,
  useLeaveBuddy,
  useMarkBuddyRead,
  useMe,
  useReportBuddyMessage,
  useSendCheer,
} from '@/data/queries';
import { buddyErrorKey, buddyLines, initialOf, nudgeCheer, onlyCongratulate, pickCheers, withInstrumental } from '@/domain/buddy';
import { relativeWhen, whenLine } from '@/domain/format';
import { colors, shadow, size } from '@/theme/tokens';

/** A time line goes above a message that starts a new stretch of conversation. */
const GAP_MS = 60 * 60_000;

type Row = { kind: 'msg'; message: BuddyMessage } | { kind: 'when'; id: string; text: string };

/** Newest first, for the inverted list: messages with a time line above each new stretch. */
function threadRows(messages: BuddyMessage[]): Row[] {
  const rows: Row[] = [];
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    if (!prev || Date.parse(m.createdAt) - Date.parse(prev.createdAt) > GAP_MS) rows.push({ kind: 'when', id: `when:${m.id}`, text: whenLine(m.createdAt) });
    rows.push({ kind: 'msg', message: m });
  });
  return rows.reverse();
}

function errorText(e: unknown): string {
  const key = buddyErrorKey(e instanceof ApiError ? e.status : undefined, e instanceof ApiError ? e.detail : undefined);
  return sl.buddy.errors[key];
}

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** The recovery buddy ("kolega"): who they are, today's two dots, the thread, cheers and short messages. */
export default function BuddyScreen() {
  const { data: state, isLoading, isError, refetch, isRefetching } = useBuddy({ poll: BUDDY_POLL.screen });
  const { data: episode } = useEpisode();
  const { data: me } = useMe();
  const hasPair = !!state && state.status !== 'none';
  const { data: messages = [] } = useBuddyMessages({ enabled: hasPair, poll: BUDDY_POLL.thread });
  const sendCheer = useSendCheer();
  const markRead = useMarkBuddyRead();
  const report = useReportBuddyMessage();
  const leave = useLeaveBuddy();
  const focused = useIsFocused();
  const composer = useRef<ComposerHandle>(null);

  const [sheet, setSheet] = useState<'cheers' | 'leave' | null>(null);
  const [reporting, setReporting] = useState<BuddyMessage | null>(null);
  const [landedText, setLandedText] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!landedText) return;
    const t = setTimeout(() => setLandedText(null), 2500);
    return () => clearTimeout(t);
  }, [landedText]);

  // Read on focus, and whenever a new message from the buddy arrives while the screen is in front.
  const latestTheirs = useMemo(() => [...messages].reverse().find((m) => !m.fromMe)?.id, [messages]);
  const lastMarked = useRef<string | undefined>(undefined);
  const { mutate: mark } = markRead;
  const unread = state?.unread ?? 0;
  useEffect(() => {
    if (!focused || !hasPair) return;
    if (unread > 0 || (latestTheirs && latestTheirs !== lastMarked.current)) {
      lastMarked.current = latestTheirs;
      mark();
    }
  }, [focused, hasPair, unread, latestTheirs, mark]);

  const rows = useMemo(() => threadRows(messages), [messages]);
  const landedId = useMemo(() => (landedText ? [...messages].reverse().find((m) => m.fromMe && m.kind === 'cheer')?.id : undefined), [landedText, messages]);

  if (isLoading) return <Screen>{null}</Screen>;
  if (isError || !state) {
    return (
      <Screen>
        <TopBar onBack={goBack} />
        <View style={styles.center}>
          <Text variant="question" accessibilityRole="header">
            {sl.offline.title}
          </Text>
          <Text variant="body" color={colors.ink2}>
            {sl.offline.body}
          </Text>
        </View>
        <PillButton variant="solid" label={sl.offline.retry} onPress={() => refetch()} busy={isRefetching} />
      </Screen>
    );
  }

  if (state.status === 'none') return <NoBuddy myName={me?.name ?? ''} />;

  const buddy = state.buddy;
  const myDone = !!episode?.todayCheckInDone;
  const lines = buddyLines(state, myDone, now);
  const live = state.status === 'active' && !!buddy && !buddy.finished;
  const congratulateOnly = onlyCongratulate(state);
  const cheers = pickCheers({ state, myCheckInDone: myDone, now });
  const name = buddy?.firstName ?? sl.buddy.title;
  const ended = state.status === 'ended';

  const pick = (c: Cheer) => {
    setLandedText(null);
    sendCheer.reset();
    sendCheer.mutate(c, {
      onSuccess: () => {
        setSheet(null);
        setLandedText(c.text);
        if (c.starter) composer.current?.prefill(c.starter);
      },
    });
  };
  const remind = nudgeCheer(state);

  return (
    <Screen padBottom={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <TopBar onBack={goBack} />
          </View>
          {live && (
            <Pressable
              onPress={() => {
                leave.reset();
                setSheet('leave');
              }}
              accessibilityRole="button"
              accessibilityLabel={sl.buddy.more}
              hitSlop={4}
              style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}
            >
              <BuddyIcon name="more" color={colors.ink} />
            </Pressable>
          )}
        </View>

        {buddy ? (
          <View style={styles.header}>
            <BuddyAvatar name={buddy.firstName} size={72} />
            <View style={{ flex: 1 }}>
              <Text variant="title" accessibilityRole="header" numberOfLines={1}>
                {buddy.firstName}
              </Text>
              {lines.header && (
                <Text variant="meta" color={colors.ink2}>
                  {lines.header}
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {live && lines.nudge && remind ? (
          <NudgeCard
            text={lines.nudge}
            myDone={myDone}
            busy={sendCheer.isPending && sendCheer.variables?.id === remind.id}
            error={sendCheer.isError && sendCheer.variables?.id === remind.id ? errorText(sendCheer.error) : null}
            onRemind={() => pick(remind)}
          />
        ) : live && buddy && lines.pair ? (
          <View style={styles.pair} accessible accessibilityLabel={sl.buddy.dotsA11y(myDone, buddy.checkedInToday, buddy.firstName)}>
            <TodayDots me={myDone} buddy={buddy.checkedInToday} />
            <Text variant="meta" style={{ flex: 1, lineHeight: 23 }}>
              {lines.pair}
            </Text>
          </View>
        ) : ended ? (
          <View style={styles.endcard}>
            <Text variant="entryTitle" accessibilityRole="header">
              {sl.buddy.ended.title}
            </Text>
            {messages.length > 0 && (
              <Text variant="meta" color={colors.ink2} style={{ marginTop: 4 }}>
                {sl.buddy.ended.body}
              </Text>
            )}
          </View>
        ) : null}

        <View style={{ height: 18 }} />

        {ended && !buddy && messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 16 }}>
            <PillButton variant="solid" label={sl.buddy.none.home} onPress={() => router.replace('/')} />
          </View>
        ) : (
          <Sheet>
            <FlatList
              data={rows}
              inverted
              keyExtractor={(r) => (r.kind === 'msg' ? r.message.id : r.id)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.thread}
              renderItem={({ item }) => {
                if (item.kind === 'when') {
                  return (
                    <Text variant="meta" color={colors.sheetInk2} align="center" style={styles.when}>
                      {item.text}
                    </Text>
                  );
                }
                const m = item.message;
                const when = relativeWhen(m.createdAt);
                return (
                  <View style={{ paddingTop: 10 }}>
                    <ThreadBubble
                      message={m}
                      who={m.fromMe ? sl.buddy.you : name}
                      when={sl.common.at(when.day, when.time)}
                      landed={m.id === landedId}
                      onReport={m.fromMe ? undefined : () => setReporting(m)}
                    />
                  </View>
                );
              }}
            />
            {buddy && <SafetyLine />}
            {live && buddy ? (
              <BuddyComposer
                ref={composer}
                buddyName={buddy.firstName}
                collapsed={!!lines.nudge}
                onGreet={() => {
                  sendCheer.reset();
                  setSheet('cheers');
                }}
              />
            ) : congratulateOnly && cheers.length > 0 ? (
              <SheetButton
                variant="solid"
                icon="wave"
                label={sl.buddy.congratulate}
                onPress={() => {
                  sendCheer.reset();
                  setSheet('cheers');
                }}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </Sheet>
        )}
      </KeyboardAvoidingView>

      <CheerSheet
        visible={sheet === 'cheers'}
        buddyName={name}
        cheers={cheers}
        sendingId={sendCheer.isPending ? (sendCheer.variables?.id ?? null) : null}
        error={sendCheer.isError ? errorText(sendCheer.error) : null}
        onPick={pick}
        onWrite={
          live
            ? () => {
                setSheet(null);
                composer.current?.focus();
              }
            : undefined
        }
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={!!reporting}
        title={sl.buddy.report.title}
        quote={reporting?.text}
        body={sl.buddy.report.body}
        action={sl.buddy.report.action}
        busy={report.isPending}
        error={report.isError ? sl.buddy.errors.reportFailed : null}
        onConfirm={() =>
          reporting &&
          report.mutate(reporting.id, {
            onSuccess: () => {
              setReporting(null);
              AccessibilityInfo.announceForAccessibility(sl.buddy.report.done);
            },
          })
        }
        onClose={() => {
          report.reset();
          setReporting(null);
        }}
      />
      <ConfirmSheet
        visible={sheet === 'leave'}
        title={sl.buddy.leave.title(buddy ? withInstrumental(buddy.firstName) : null)}
        body={sl.buddy.leave.body}
        action={sl.buddy.leave.action}
        busy={leave.isPending}
        error={leave.isError ? sl.buddy.errors.leaveFailed : null}
        onConfirm={() => leave.mutate(undefined, { onSuccess: () => setSheet(null) })}
        onClose={() => setSheet(null)}
      />
    </Screen>
  );
}

/** No buddy (yet): reachable from a stale push or right after an unpair. Says what a buddy would see. */
function NoBuddy({ myName }: { myName: string }) {
  return (
    <Screen>
      <TopBar onBack={goBack} />
      <View style={{ flexGrow: 1 }} />
      <View style={styles.emptyDots} accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={styles.emptyLine} />
        <View style={styles.emptyMe}>
          <Text variant="title" color={colors.ground} maxFontSizeMultiplier={1} style={{ fontSize: 40, lineHeight: 48 }}>
            {initialOf(myName)}
          </Text>
        </View>
        <View style={styles.emptyQ} />
      </View>
      <View style={{ flexGrow: 1 }} />
      <Text variant="title" accessibilityRole="header">
        {sl.buddy.none.title}
      </Text>
      <Text variant="body" color={colors.ink2} style={{ marginTop: 12 }}>
        {sl.buddy.none.body}
      </Text>
      <View style={{ height: 28 }} />
      <PillButton variant="solid" label={sl.buddy.none.home} onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 16 },
  top: { flexDirection: 'row', alignItems: 'center' },
  more: { width: 48, height: size.control, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    marginTop: 18,
    backgroundColor: colors.tonal,
    boxShadow: shadow.tonal,
  },
  endcard: { borderRadius: 28, paddingVertical: 18, paddingHorizontal: 20, marginTop: 16, backgroundColor: colors.tonal, boxShadow: shadow.tonal },
  thread: { paddingTop: 12 },
  when: { fontSize: 16, lineHeight: 21, marginTop: 16 },
  emptyDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 56 },
  emptyLine: { position: 'absolute', left: '50%', width: 56, marginLeft: -28, borderTopWidth: 3, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.5)' },
  emptyMe: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 30px 50px -24px rgba(0,0,0,0.6)',
  },
  emptyQ: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.5)' },
});
