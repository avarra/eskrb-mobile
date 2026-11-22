# eSkrb: recovery buddy ("kolega") in the mobile app

This plan builds the buddy feature from `BuddySpec.md` (agreed spec v0) in this app. The designs are in `design/buddy.html`, rendered to `design/shots/buddy/`, with notes in `design/BUDDY.md`. The backend and dashboard parts of the spec live in the backend repo; this plan lists only what the app needs from them.

**Estimate:** about 3 h for the mobile screen per the spec, closer to 4–5 h with the home row, sheets, tests and the device pass.

## Decisions before building

1. **Copy.** Use the reworded strings in `design/BUDDY.md` ("pregled", not "prijava"; formal "na vas"; no gendered verbs). Cheer texts live on the server, so give the backend the table for its catalogue seed. A native speaker reviews them before the demo.
2. **Finished vs. ended (a spec conflict).** The spec says a message to an ended pair returns 409, but also says "ended/finished pairs only offer `finished`". Proposal: when the *buddy's* episode ends, the pair stays `active` with `buddy.finished = true` and the server accepts only the `finished` cheer. Text messages get 409. The pair becomes `ended` when the staff unpair it, a patient leaves, or *my* episode ends. The design (`buddy-ended`) assumes this. Agree it with the backend.
3. **Push payload.** Buddy pushes carry `data: { kind: 'buddy' }` so a tap opens `/buddy`. The text stays generic, as in the spec.
4. **Entry point.** The buddy row on home appears only when `status !== 'none'`. `/buddy` with `status: 'none'` shows the empty screen, which is reachable from a stale push or right after an unpair.

## Contract the app builds against

From the spec, with the decisions above:

```ts
// GET /me/buddy
{ status: 'none' | 'active' | 'ended',
  buddy: { firstName, dayNumber, checkedInToday, streak, missedDays, finished } | null,
  unread: number,
  moments: MomentKey[],          // no time-of-day rule applied
  cheers: { id, moment, label, text }[] }
// GET /me/buddy/messages?after=<id>   oldest → newest
{ id, fromMe, kind: 'cheer' | 'text', text, source: 'typed' | 'dictated' | null, createdAt }[]
// POST /me/buddy/messages {text, source} · POST /me/buddy/cheers {cheerId}
// POST /me/buddy/read · POST /me/buddy/messages/:id/report · DELETE /me/buddy
// 409 / 429 come with a readable Slovenian `detail` (shown as is via errorDetail).
```

`MomentKey` = `not_checked_in | missed_days | checked_in | both_checked_in | streak_3|7|14|30 | day_7|14|21|halfway | returned | finished | always`. Parse unknown keys leniently (drop them, don't throw), so the server can add moments without an app release.

## Work, in order

### 1. Data layer
- `src/data/api.ts`: add the Zod schemas `buddyState`, `buddyMessage` and `cheer`, the types, and six methods on `Api` with JSDoc naming each endpoint, as the existing methods do.
- `src/data/remote-api.ts`: the implementations. Timestamps go through the existing `utc` transform. `moments` is filtered against the known keys.
- `src/data/queries.ts`:
  - `keys.buddy`, `keys.buddyMessages`.
  - `useBuddy({ poll })`: refetches every 30 s on home and 20 s on the buddy screen, and only while that screen is focused. Find the focus hook in the Expo Router v58 docs (`useIsFocused` or `useFocusEffect`) before you write it.
  - `useBuddyMessages(enabled)`: polls every 5 s while the thread is open. It fetches incrementally with `after=<last id>` and merges into the cache.
  - Mutations: `useSendBuddyText`, `useSendCheer`, `useMarkBuddyRead`, `useReportBuddyMessage`, `useLeaveBuddy`. A cheer is added to the thread optimistically, which is what the landing animation needs, and rolled back on error. All of them invalidate `keys.buddy`.
- Tests in `src/data/api.test.ts`: the schemas accept null `buddy`, unknown moments and a missing `source`.

### 2. Domain logic (pure, tested)
`src/domain/buddy.ts` + `buddy.test.ts`:
- `pickCheers({ state, myCheckInDone, now }) → Cheer[]` (max 4). It starts from the server's `moments` and adds `both_checked_in` only when `myCheckInDone && buddy.checkedInToday`. It drops `not_checked_in` before 17:00 local time (`NUDGE_HOUR = 17`). Moment-specific cheers come first, ordered nudge → milestone → checked_in, then evergreen ones (`always`) fill up to 4. If `buddy.finished` or `status === 'ended'`, it returns only `finished` cheers.
- `showNudgeCard(...)`: true when it is past the nudge hour, the buddy has not checked in, the pair is active and not finished, and `not_checked_in` is among the moments (the server already applied the daily cap).
- `validateBuddyText(text)` returns `ok`, `empty`, `tooLong` (more than 300) or `link`. The client check only shapes the UI; the server stays authoritative.
- `todayDots(myDone, buddyDone)` for the signature.
- The sender never sees `missedDays` as a number; `missedDays` only feeds moment choice on the server. Add a test that no rendered string contains it.

### 3. Copy
`src/copy/sl.ts`: a `buddy` block with every string from `design/BUDDY.md`: the home row ("Nov pozdrav ob {time}", "Oba pregleda oddana."), the thread, the composer placeholder `Napišite ${firstName}` (needs the dative, so decide it during the native review; fallback "Napišite sporočilo"), the sheets, the empty and ended states, the nudge card, the errors and the a11y labels. Cheer labels and texts come from the server, not from here.

### 4. Components (`src/components/buddy/`)
Build them from the existing tokens. Copy the pattern of each existing component named below; don't change those components.
- `buddy-avatar.tsx`: a white disc with a blue initial, at sizes 48 and 72. `Avatar` stays peach for staff.
- `buddy-row.tsx`: the home row, modelled on `message-row.tsx`: the name, the "Nov pozdrav ob …" or status line, the unread dot (`colors.today`) and a chevron. The whole row is the tap target.
- `today-dots.tsx`: the signature. Two 16 px dots joined by a line. A dot turning from open to done springs with Reanimated, the same spring as the day ring, and gives `Haptics.notificationAsync(Success)`. With `useReducedMotion()`, the change is instant.
- `thread-bubble.tsx`: three variants (theirs, mine, cheer), the "Pozdrav" label, a long-press plus `accessibilityActions` for report, and an a11y label of "Marija, danes ob 16.05: …".
- `safety-line.tsx`: the 18 px underlined link to the team messages (`/notes`).
- `buddy-composer.tsx`: the 64 px field with an inner microphone. Reuse `useDictation` from `src/lib/dictation.ts`: the Soniox temporary key, with the device fallback. Show the dictated hint and the counter, and send `source: 'dictated'` if any dictation happened. Under it sit "Pozdrav" (tonal) and "Pošlji" (solid, disabled when invalid).
- `cheer-sheet.tsx`: a bottom sheet like `reminder-sheet.tsx`. Options are cards with the label and »text«, plus "Napišite svoje sporočilo", which closes the sheet and focuses the composer. A 409/429 shows `errorDetail()` inline in the sheet.
- `confirm-sheet.tsx`: a generic sheet with a title, an optional quote, a line of text, one solid action and "Prekliči". Report and leave both use it.
- `nudge-card.tsx`: the tonal card on the ground, with the dots, the line and "Spomnite na pregled", which sends the `not_checked_in` cheer.

### 5. Screen and routing
- `src/app/buddy.tsx`:
  - `TopBar` (back, "⋯" → leave sheet), the header (avatar, first name, "Dan N · N dni zapored"; the streak shows only when it is 2 or more), then `TodayDots` or `NudgeCard`, then the white `Sheet` with the thread.
  - The thread is an inverted `FlatList` (newest at the bottom), with `KeyboardAvoidingView` as in `message/[id].tsx`.
  - `POST /me/buddy/read` runs on focus and whenever new buddy messages arrive while focused.
  - States: `none` → the empty screen; `ended` → read-only, with no composer; finished buddy → only the "Čestitajte" button; offline → the existing `sl.offline` pattern.
- `src/app/_layout.tsx`: register `<Stack.Screen name="buddy" />`.
- `src/app/index.tsx`: render `BuddyRow` under the nurse `MessageRow` when `useBuddy` reports a pair. This is the only change to an existing screen.
- `src/lib/push-route.ts`: `case 'buddy': return '/buddy'`. Add `'/buddy'` to `PushRoute` and a test case in `push-route.test.ts`.

### 6. Verify
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`.
- Walk through it in the simulator against the seeded pair (luka + nina) and the two free patients:
  1. Staff pair two patients in the dashboard, and the home row appears within 30 s.
  2. Send a cheer and check that the other phone shows the *receiver* text.
  3. A typed message, then a dictated one.
  4. The caps: a second nudge the same day, and a 4th cheer, each show the server's `detail`.
  5. Report a message, and the dashboard shows the badge.
  6. Leave, and the other side sees "Povezava se je zaključila.".
  7. The push opens `/buddy`, and no push arrives between 21:00 and 08:00.
- Check the screens against `design/shots/buddy/*.png` at large text sizes (Dynamic Type / font scale 1.3). The 64 px controls and the safety line must not clip.

## Backend / dashboard dependencies (other repo)
The app is blocked on these for an end-to-end test, not for building. Until they exist, build against a fixture `Api` that returns the JSON above.
- The `BuddyPair` and `BuddyMessage` tables and the patient endpoints, with the caps (one nudge a day, `missed_days` every few days, 3 cheers a day, about 30 texts an hour), link rejection, and 409/429 with Slovenian `detail`.
- A cheer catalogue seeded with the reworded copy.
- Generic pushes with `kind: 'buddy'`, at most one per pair per recipient every 10 minutes, and quiet hours 21–08.
- The decision on finished vs. ended above.
- The dashboard "Buddies" page and "New pair" modal with the consent checkbox, plus the seed of one pair and two free patients.

## Not in this plan
The spec's "Not in v0" list: auto-matching, leaderboards, groups, photos, shared pain or mood, LLM scanning, websockets.
