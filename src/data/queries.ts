import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Answers, NewLog } from '@/data/api';
import { api, device } from '@/data';

export const queryClient = new QueryClient({
  defaultOptions: {
    // Local data: always fresh, no retries, no refetch storms.
    queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

export const keys = {
  episode: ['episode'] as const,
  timeline: (episodeId: string) => ['timeline', episodeId] as const,
  setting: (key: string) => ['setting', key] as const,
};

export function useEpisode() {
  return useQuery({ queryKey: keys.episode, queryFn: () => api.getMyEpisode() });
}

export function useTimeline(episodeId: string | undefined) {
  return useQuery({
    queryKey: keys.timeline(episodeId ?? ''),
    queryFn: () => api.getTimeline(episodeId ?? ''),
    enabled: !!episodeId,
  });
}

/** Refetch everything, including queries of screens that are not mounted right now (e.g. home during setup),
 *  so a screen never renders stale local data after a write. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ refetchType: 'all' });
}

export function usePostCheckIn() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ episodeId, answers }: { episodeId: string; answers: Answers }) => api.postCheckIn(episodeId, answers),
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

export function useCreateEpisode() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: device.createEpisode, onSuccess: invalidate });
}

export function useSetting(key: string) {
  return useQuery({ queryKey: keys.setting(key), queryFn: () => device.getSetting(key) });
}

export function useSetSetting() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: ({ key, value }: { key: string; value: string }) => device.setSetting(key, value), onSuccess: invalidate });
}
