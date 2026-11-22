import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ReplyBox } from '@/components/reply-box';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TopBar } from '@/components/top-bar';
import { WARD } from '@/config';
import { sl } from '@/copy/sl';
import type { TimelineItem } from '@/data/api';
import { useEpisode, useMarkMessageRead, useTimeline } from '@/data/queries';
import { initials, relativeWhen } from '@/domain/format';
import { colors } from '@/theme/tokens';

/** One care-team message and a reply box. */
export default function MessageView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useEpisode();
  const { data: timeline } = useTimeline(me?.episode.id);
  const markRead = useMarkMessageRead();

  const msg = timeline?.items.find((i): i is Extract<TimelineItem, { kind: 'message' }> => i.kind === 'message' && i.message.id === id)?.message;
  // Also when only the server still counts it unread (read here before read state synced, or on another phone).
  const unread = !!msg && (!msg.readAt || (me?.unreadMessages ?? 0) > 0);
  const episodeId = me?.episode.id;
  const { mutate: mark } = markRead;
  useEffect(() => {
    if (unread && id && episodeId) mark({ episodeId, messageId: id });
  }, [unread, id, episodeId, mark]);

  const when = msg ? relativeWhen(msg.createdAt) : null;

  return (
    <Screen padBottom={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.header}>
          <Avatar initials={initials(msg?.fromName ?? '')} size={64} />
          <View style={{ flex: 1 }}>
            <Text variant="title" style={{ fontSize: 28, lineHeight: 32 }} accessibilityRole="header">
              {msg?.fromName ?? ''}
            </Text>
            {when && (
              <Text variant="meta" color={colors.ink2}>
                {sl.message.ward(WARD, sl.common.at(when.day, when.time))}
              </Text>
            )}
          </View>
        </View>
        <Sheet>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text variant="letter" color={colors.sheetInk} style={{ marginTop: 14 }}>
              {msg?.body ?? ''}
            </Text>
          </ScrollView>
          {me && <ReplyBox episodeId={me.episode.id} onSent={() => router.replace('/notes')} />}
        </Sheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, marginBottom: 24 },
});
