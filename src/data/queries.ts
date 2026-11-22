import { MutationCache, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { NewCheckIn, NewLog } from '@/data/api';
import { normalizeToken } from '@/data/auth';
import { ApiError } from '@/data/http';
import { api, device } from '@/data';

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
  return useMutation({ mutationFn: (messageId: string) => api.markMessageRead(messageId), onSuccess: invalidate });
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
    mutationFn: device.signOut,
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
