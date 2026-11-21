import { router } from 'expo-router';
import { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';

import { PainTrend } from '@/components/pain-trend';
import { ReplyBox } from '@/components/reply-box';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TimelineEntry } from '@/components/timeline-entry';
import { TopBar } from '@/components/top-bar';
import { sl } from '@/copy/sl';
import type { TimelineItem } from '@/data/api';
import { useEpisode, useTimeline } from '@/data/queries';
import { colors } from '@/theme/tokens';

function keyOf(i: TimelineItem) {
  return i.kind === 'checkin' ? `c-${i.checkIn.id}` : i.kind === 'log' ? `l-${i.log.id}` : `m-${i.message.id}`;
}

/** Zapisi: pain trend, then everything newest first, with a reply box to the nurse. */
export default function Notes() {
  const { data: me } = useEpisode();
  const { data: timeline } = useTimeline(me?.episode.id);
  const list = useRef<FlatList<TimelineItem>>(null);
  const items = timeline?.items ?? [];
  const pains = items
    .filter((i): i is Extract<TimelineItem, { kind: 'checkin' }> => i.kind === 'checkin')
    .map((i) => i.checkIn.answers.pain)
    .filter((p): p is number => typeof p === 'number')
    .reverse();

  return (
    <Screen padBottom={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text variant="title" accessibilityRole="header" style={{ marginTop: 8, marginBottom: 6 }}>
          {sl.notes.title}
        </Text>
        <PainTrend values={pains} todayDone={!!me?.todayCheckInDone} />
        <Sheet>
          <FlatList
            ref={list}
            data={items}
            keyExtractor={keyOf}
            renderItem={({ item, index }) => <TimelineEntry item={item} first={index === 0} />}
            ListEmptyComponent={
              <Text variant="body" color={colors.sheetInk2} style={{ paddingVertical: 24 }}>
                {sl.notes.empty}
              </Text>
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
          {me && <ReplyBox episodeId={me.episode.id} onSent={() => list.current?.scrollToOffset({ offset: 0, animated: true })} />}
        </Sheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
