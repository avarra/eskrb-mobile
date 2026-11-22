import { MutationCache, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import type { BuddyMessage, BuddyState, Cheer, LogSource, NewCheckIn, NewLog } from '@/data/api';
import { normalizeToken } from '@/data/auth';
import { ApiError } from '@/data/http';
import { api, device } from '@/data';
import { mergeMessages, PENDING_PREFIX } from '@/domain/buddy';
import { unregisterPushToken } from '@/lib/push';

export const queryClient = new QueryClient({
  // Screens show a short message; keep the real error visible while developing.
  mutationCache: new MutationCache({ onError: (e) => __DEV__ && console.warn(e) }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry network hiccups once; auth and not-found answers are final.
      retry: (count, e) => count < 1 && !(e instanceof ApiError && e.status < 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});

export const keys = {
  session: ['session'] as const,
  me: ['me'] as const,
  episode: ['episode'] as const,
  timeline: (episodeId: string) => ['timeline', episodeId] as const,
  setting: (key: string) => ['setting', key] as const,
  buddy: ['buddy'] as const,
  buddyMessages: ['buddy', 'messages'] as const,
};

/** Whether a token is stored. Local, so never stale. */
export function useSession() {
  return useQuery({ queryKey: keys.session, queryFn: device.hasToken, staleTime: Infinity });
}

export function useMe(enabled = true) {
  return useQuery({ queryKey: keys.me, queryFn: () => api.getMe(), enabled, staleTime: 5 * 60_000 });
}

export function useEpisode(enabled = true) {
  return useQuery({ queryKey: keys.episode, queryFn: () => api.getMyEpisode(), enabled });
}

export function useTimeline(episodeId: string | undefined) {
  return useQuery({
    queryKey: keys.timeline(episodeId ?? ''),
    queryFn: () => api.getTimeline(episodeId ?? ''),
    enabled: !!episodeId,
    // Care-team replies arrive without push for now.
    refetchInterval: 60_000,
  });
}

/** Refetch everything, including queries of screens that are not mounted right now, so no screen shows stale data after a write. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ refetchType: 'all' });
}

export function usePostCheckIn() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ episodeId, input }: { episodeId: string; input: NewCheckIn }) => api.postCheckIn(episodeId, input),
    onSuccess: invalidate,
  });
}

export function usePostLog() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ episodeId, input }: { episodeId: string; input: NewLog }) => api.postLog(episodeId, input),
    onSuccess: invalidate,
  });
}

export function usePostMessage() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ episodeId, body }: { episodeId: string; body: string }) => api.postMessage(episodeId, body),
    onSuccess: invalidate,
  });
}

export function useMarkMessageRead() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ episodeId, messageId }: { episodeId: string; messageId: string }) => api.markMessageRead(episodeId, messageId),
    onSuccess: invalidate,
  });
}

export type SignInError = 'invalid' | 'notPatient' | 'network';

/** Validate a token with GET /me, then store it. Rejects with a `SignInError` code. */
export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (raw: string) => {
      const token = normalizeToken(raw);
      let me;
      try {
        me = await api.getMe(token);
      } catch (e) {
        throw new Error(e instanceof ApiError && (e.status === 401 || e.status === 403) ? 'invalid' : 'network');
      }
      if (me.role !== 'patient') throw new Error('notPatient');
      await device.signIn(token);
      return me;
    },
    onSuccess: async (me) => {
      qc.clear();
      qc.setQueryData(keys.me, me);
      qc.setQueryData(keys.session, true);
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    // Unregister while the bearer token is still stored.
    mutationFn: async () => {
      await unregisterPushToken();
      await device.signOut();
    },
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(keys.session, false);
    },
  });
}

export function useSetting(key: string) {
  return useQuery({ queryKey: keys.setting(key), queryFn: () => device.getSetting(key), staleTime: Infinity });
}

export function useSetSetting() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: ({ key, value }: { key: string; value: string }) => device.setSetting(key, value), onSuccess: invalidate });
}

// ---- Recovery buddy ----

/** Polling while the screen is in front: home every 30 s, the buddy screen every 20 s. No websockets (docs/buddy.md). */
export const BUDDY_POLL = { home: 30_000, screen: 20_000, thread: 5_000 } as const;

/** GET /me/buddy, refetched every `poll` ms, but only while the calling screen is focused. */
export function useBuddy({ poll, enabled = true }: { poll: number; enabled?: boolean }) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: keys.buddy,
    queryFn: () => api.getBuddy(),
    enabled,
    staleTime: 10_000,
    refetchInterval: focused ? poll : false,
  });
}

/** The `after` cursor: the newest message the server has confirmed. */
function lastConfirmed(messages: BuddyMessage[] | undefined): string | undefined {
  if (!messages) return undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && !m.id.startsWith(PENDING_PREFIX)) return m.createdAt;
  }
  return undefined;
}

/**
 * The thread, oldest first. The first fetch loads it all; later fetches ask only for newer messages and merge them in.
 * `poll` (ms) only while the screen is focused; pass false for a one-off read (the home row).
 */
export function useBuddyMessages({ enabled, poll }: { enabled: boolean; poll: number | false }) {
  const qc = useQueryClient();
  const focused = useIsFocused();
  return useQuery({
    queryKey: keys.buddyMessages,
    queryFn: async () => {
      const current = qc.getQueryData<BuddyMessage[]>(keys.buddyMessages);
      const after = lastConfirmed(current);
      if (!current || !after) return api.getBuddyMessages();
      return mergeMessages(current, await api.getBuddyMessages(after));
    },
    enabled,
    staleTime: 3_000,
    refetchInterval: focused && poll ? poll : false,
  });
}

function useInvalidateBuddy() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.buddy, exact: true });
}

/** Puts a sent message into the cached thread (replacing its optimistic copy). */
function useAppendMessage() {
  const qc = useQueryClient();
  return (sent: BuddyMessage, replaceId?: string) =>
    qc.setQueryData<BuddyMessage[]>(keys.buddyMessages, (old = []) =>
      mergeMessages(
        old.filter((m) => m.id !== replaceId),
        [sent],
      ),
    );
}

export function useSendBuddyText() {
  const invalidate = useInvalidateBuddy();
  const append = useAppendMessage();
  return useMutation({
    mutationFn: ({ text, source }: { text: string; source: LogSource }) => api.sendBuddyText(text, source),
    onSuccess: (sent) => {
      append(sent);
      return invalidate();
    },
  });
}

/** Sends a cheer. It lands in the thread at once (the landing animation needs that) and is rolled back on error. */
export function useSendCheer() {
  const qc = useQueryClient();
  const invalidate = useInvalidateBuddy();
  const append = useAppendMessage();
  return useMutation({
    mutationFn: (c: Cheer) => api.sendCheer(c.id),
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: keys.buddyMessages });
      const tempId = `${PENDING_PREFIX}${c.id}:${Date.now()}`;
      const optimistic: BuddyMessage = { id: tempId, fromMe: true, kind: 'cheer', text: c.text, source: null, createdAt: new Date().toISOString() };
      qc.setQueryData<BuddyMessage[]>(keys.buddyMessages, (old = []) => [...old, optimistic]);
      return { tempId };
    },
    onError: (_e, _c, ctx) => {
      if (ctx) qc.setQueryData<BuddyMessage[]>(keys.buddyMessages, (old = []) => old.filter((m) => m.id !== ctx.tempId));
    },
    onSuccess: (sent, _c, ctx) => {
      append(sent, ctx?.tempId);
      return invalidate();
    },
  });
}

export function useMarkBuddyRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markBuddyRead(),
    onSuccess: () => {
      qc.setQueryData<BuddyState>(keys.buddy, (old) => (old ? { ...old, unread: 0 } : old));
      return qc.invalidateQueries({ queryKey: keys.buddy, exact: true });
    },
  });
}

export function useReportBuddyMessage() {
  const invalidate = useInvalidateBuddy();
  return useMutation({ mutationFn: (messageId: string) => api.reportBuddyMessage(messageId), onSuccess: invalidate });
}

export function useLeaveBuddy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.leaveBuddy(),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.buddy }),
  });
}
