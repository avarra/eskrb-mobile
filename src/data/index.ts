// The one place that picks the data implementation.
import type { Api } from '@/data/api';
import { remoteApi } from '@/data/remote-api';

export const api: Api = remoteApi;

/** Device-only operations (sign-in, settings). */
export { device } from '@/data/device';
