// The one place that picks the data implementation. When the REST API is ready, add
// `rest-api.ts` implementing `Api` and change this line; screens stay as they are.
import type { Api } from '@/data/api';
import { localApi, localDevice } from '@/data/local-api';

export const api: Api = localApi;

/** Device-only operations (setup, settings, debug). */
export const device = localDevice;
