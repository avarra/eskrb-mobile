// The one place that picks the data implementation.
import type { Api } from '@/data/api';
import { BUDDY_SCENARIOS, type BuddyScenario, withBuddyFixture } from '@/data/buddy-fixture';
import { remoteApi } from '@/data/remote-api';

/** Dev only: EXPO_PUBLIC_BUDDY_FIXTURE=<scenario> answers the buddy calls from memory (see buddy-fixture.ts). */
const buddyFixture = process.env.EXPO_PUBLIC_BUDDY_FIXTURE;
const scenario = BUDDY_SCENARIOS.find((s): s is BuddyScenario => s === buddyFixture);

export const api: Api = __DEV__ && scenario ? withBuddyFixture(remoteApi, scenario) : remoteApi;

/** Device-only operations (sign-in, settings). */
export { device } from '@/data/device';
