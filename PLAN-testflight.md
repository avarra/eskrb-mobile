# Build the eSkrb patient screens, local-only, ready for TestFlight

Paste everything below into a new Claude Code session opened in `/Users/aiken/repos/adahack2026/eskrb`.

---

## Goal

Turn the approved design into a working Expo app that stores everything on the phone, with no backend. Build it with EAS and upload it to TestFlight so an external testing group can try it. The app must later swap its local storage for the real REST API (`PLAN-mobile.md`) without the screens changing.

## Read first

1. `AGENTS.md`: the Expo rules for this repo. SDK 58: read the versioned docs at https://docs.expo.dev/versions/v58.0.0/ before touching any Expo API, and add packages with `pnpm expo install` (the repo uses pnpm).
2. `PLAN-mobile.md`: the data model, the protocol JSON, the rules, `patientAction` and the screen list.
3. `design/DIRECTION.md`: tokens, type, copy, screens and colour roles.
4. `design/mockup.html` and the PNGs in `design/shots/` (`home.png`, `home-ios.png`, `message.png`, `pain.png`, `pain-high.png`, `voice.png`, `urgent.png`, `notes.png`). These are the visual source of truth; match them.
5. Skills to load when you reach them: `building-native-ui`, `vercel-react-native-skills`, `react-native-vision-camera`.
6. `PLAN-next.md` is **out of scope** (Soniox and later features). Don't build any of it.

## Decisions already made (don't reopen)

- **Platforms:** iPhone first for TestFlight. Keep it working on Android, but no Play release now.
- **Colour:** blue ground `#1652C4`. All tokens are in `design/DIRECTION.md`; put them in one `src/theme/tokens.ts` and use only those.
- **Type:** Lexend on both platforms (`@expo-google-fonts/lexend`, weights 400, 500, 600, 700), loaded before the splash screen hides.
- **Copy:** all patient-facing text in Slovenian, formal "vi", taken from the mockups. Put strings in `src/copy/sl.ts`; no English in the UI.
- **Accessibility floor:** body text at least 18, controls at least 56 tall, the primary button 68 tall. Every control gets an `accessibilityLabel` and an `accessibilityRole`. Respect Dynamic Type up to at least the largest standard size without clipping.
- **No auth and no server.** One patient profile lives on the device.
- **No audio, anywhere.** Notes are text only, typed or dictated on the device. The recording is never written to a file, stored or sent; only the text the patient confirms is saved. No Soniox in this version.
- **Storage:** `expo-sqlite` with Drizzle ORM, with tables that mirror the contract's entities (Episode, CheckIn, Log, Flag, Message). Validate rows with Zod at the boundary.
- **Swappable data layer:** screens talk only to `src/data/api.ts`, an interface with the same methods and return shapes as the REST contract (`getMyEpisode`, `postCheckIn`, `postLog`, `getTimeline`, `postMessage`). The only implementation now is `src/data/local-api.ts`. TanStack Query sits on top of it.

## Routes (Expo Router, `src/app/`)

Delete the template's `explore.tsx`, the tabs and the demo components first.

| Route | Screen | Mockup |
|---|---|---|
| `/setup` | First run: "Kdaj ste imeli operacijo?" A large date choice (today, yesterday, or pick a date) plus the patient's first name. It creates the episode (`knee-replacement`, 42 days). Shown only when there is no episode. | none: use home's style |
| `/` | Home: date, "Dan N od 42", the nurse's message row (only when an unread message exists), the ring of 42 dots around "Začni pregled" (done days white, today yellow, the rest faint), and "Dodaj zapis". When today's check-in is done, the button reads "Pregled je oddan" and the today dot turns white. | `home.png` |
| `/checkin` | One question per screen, rendered generically from the protocol JSON by `type`, with step N of 8, Nazaj and Naprej. | `pain.png`, `pain-high.png` |
| `/result` | Driven only by `patientAction`. `none`: thank-you with today's dot filling in. `contact_team`: "Ekipa je obveščena" plus a call button to the ward (number from `src/config.ts`). `call_112`: the red urgent screen with a `tel:112` link. | `urgent.png` |
| `/note` | Quick log: one large editable text field with a big microphone button for on-device dictation (words appear in the field and stay editable), "Dodaj fotografijo" and "Pošlji". Leads to `/result`. | `voice.png`: the white card is the editable field (placeholder "Povejte ali napišite, kako ste.", yellow ring when focused), and the ringed button reads "Narekuj". |
| `/notes` | Timeline, newest first: pain trend bars, entries with "Pregledano", the nurse's messages, and a reply box at the bottom. | `notes.png` |
| `/message/[id]` | One staff message, the item it refers to, and a reply box. | `message.png` |
| `/debug` | Hidden (long-press the date on home for 2 seconds): fire the reminder in 10 seconds, add a fake nurse reply, mark everything reviewed, set the day number, reset all data. | none: plain list |

## Question controls (generic, from `protocol.questions[].type`)

- `scale` (pain 0–10, wellbeing 1–5): the wedge slider from `pain.png`. The track thickens to the right; the fill runs from `heat-low` to `heat-mid` or `heat-high` by value; the number sits in an 84pt thumb; a pill shows the pain word; the bottom of the screen warms to the heat colour. Build it with Gesture Handler and Reanimated. It snaps to integers and gives a selection haptic on each step (`expo-haptics`). The whole track accepts taps. It has `accessibilityRole="adjustable"` with increment and decrement actions. Words for 0 to 10: ne boli, blaga (1–3), zmerna (4–6), močna (7–8), neznosna (9–10), each with one plain sentence; wellbeing gets its own five words.
- `number` (temperature): a huge value, `37,2 °C` with a decimal comma, between big − and + buttons in 0.1 steps, starting at 36,8.
- `choice`: full-width tonal pills stacked vertically, 68 tall, with the selected one solid white. Map option ids to Slovenian labels (`less` → "Manjša", `same` → "Enaka", `more` → "Večja"; `dry` → "Suha", `red` → "Pordela", `discharge` → "Izcedek").
- `boolean`: two big pills, "Da" and "Ne".
- Tapping an answer selects it; Naprej moves on. The last step submits.

## Rules and flags (local)

`src/domain/rules.ts` evaluates `protocol.rules` against the check-in answers and returns flags plus `patientAction`: any `urgent` flag gives `call_112`, any `attention` flag gives `contact_team`, otherwise `none`. Unit-test it with the five rules from `PLAN-mobile.md`.

Notes are text. Dictation runs on the device only:
- Use `expo-speech-recognition` (read its README for the current API) with locale `sl-SI`, interim results on, and on-device recognition required (`requiresOnDeviceRecognition: true`). Don't enable any option that persists the recording.
- At startup, check that on-device recognition supports `sl-SI` on this phone. If it doesn't, hide the microphone and offer typing only. Never fall back to server-based recognition: Apple's or Google's servers would receive the audio.
- While the patient speaks, words appear in the field. They can stop, edit, speak again, or just type. "Pošlji" saves only the text, with `source: "dictated"` or `"typed"`.
- Run a small keyword extractor on the text as a stand-in for the LLM: calf words (`meč`) → `calfPain`, breathing or chest words (`dih`, `prsi`) → `breathing`, `vročin` / `temperatur` plus a number → `temperature`. Keep it in `src/domain/extract-local.ts` so it is easy to delete later. Store the quote that triggered each flag.

## Camera and photos

Per `PLAN-mobile.md`, use VisionCamera v5 for taking the wound photo (load the `react-native-vision-camera` skill) and `expo-image-picker` for the gallery. Copy photos into the app's document directory with `expo-file-system`, and store the path on the Log.

## Reminder

`expo-notifications`: one local notification every day at 9:00 ("Čas je za današnji pregled."). Tapping it opens `/checkin`. Show it in the foreground too. Ask for permission only on the first home visit after setup, with one sentence explaining why. Wire the debug "fire in 10 seconds" button.

## Seed data for testers

On setup, insert believable history so the timeline isn't empty: yesterday's check-in (pain 5, 37,4 °C, wound dry, reviewed), a dictated note from two days ago ("Ponoči sem slabo spala, koleno je peklo.", reviewed), and one nurse message ("Fotografija je jasna, rana lepo celi. Jutri zjutraj nam sporočite še temperaturo.", from "Sestra Petra Žagar", unread). Mark all seeded rows `seed: true` so reset and the later migration can drop them.

## App config for TestFlight

- `app.json`: name `eSkrb`, slug `eskrb`, `ios.bundleIdentifier` **ASK ME** (don't invent one; `pnpm build` warns while it's missing), `userInterfaceStyle: "light"`, and splash and adaptive-icon backgrounds `#1652C4`.
- `ios.infoPlist`: `ITSAppUsesNonExemptEncryption: false`, plus Slovenian usage strings for microphone and speech recognition ("Da lahko zapis narekujete namesto tipkate. Zvok ostane na telefonu."), camera ("Za fotografijo rane, ki jo pregleda vaša ekipa.") and photo library.
- Config plugins for expo-sqlite, expo-speech-recognition, expo-notifications, VisionCamera, expo-image-picker and expo-font, as each doc page says. Never edit `ios/` or `android/` by hand.
- App icon: a white ring of dots with one yellow dot on `#1652C4`. Generate `icon.png` at 1024 px, plus the iOS icon modes if `assets/expo.icon` needs it.
- `eas.json` already exists: `development` (dev client on a device), `ios-simulator`, `preview` (internal) and `production` (store). The build number is managed remotely (`appVersionSource: "remote"`) and auto-increments on production, so don't add `ios.buildNumber` to `app.json`. Don't change the profiles without asking.
- Builds go through `pnpm build` (`scripts/build.mjs`): an interactive picker for platform, profile, local or EAS cloud, and an optional TestFlight submit for iOS production. `pnpm build:dry` prints the commands without running them. Local builds land in `builds/` (gitignored).

## Order of work (each step leaves the app running)

1. Clean the template; add tokens, Lexend, copy file and folder structure (`src/app`, `src/components`, `src/data`, `src/domain`, `src/theme`, `src/copy`).
2. Data layer: Drizzle schema, migrations, `local-api.ts`, seed, the TanStack Query provider, and `rules.ts` with tests.
3. Setup and Home, including the 42-dot ring and the message row. Compare against `home.png` and `home-ios.png`.
4. Check-in with all four controls; build the wedge slider last and compare it against `pain.png` and `pain-high.png`.
5. Result screens, including urgent.
6. Note: the editable text field, on-device dictation with the `sl-SI` check, photo, and the local extractor. Confirm that no audio file is written: check the app's document and cache directories after dictating.
7. Notes timeline and the message view with reply.
8. Reminder notification and the debug screen.
9. A pass for Slovenian copy, Dynamic Type and VoiceOver on every screen.
10. A development build on the iOS simulator (`pnpm build` → iOS → `ios-simulator` → Local, or `pnpm expo run:ios`): screenshot every screen and put each beside its mockup PNG. Fix differences in spacing, size and colour.
11. `pnpm expo-doctor`, `pnpm tsc --noEmit`, `pnpm expo lint` and the rules tests, all clean.
12. TestFlight: stop and ask me before running `pnpm build` with iOS → `production` → submit to TestFlight, because it uses my Apple account. Run `pnpm build:dry` first and show me the commands. After upload, give me the App Store Connect checklist for the external group: what to test (text below), beta contact, Beta App Review info, and that data stays on the device.

## "What to test" text for TestFlight (Slovenian)

> eSkrb je testna različica aplikacije za spremljanje okrevanja po operaciji kolena. Vsi podatki ostanejo na vašem telefonu, nič se ne pošilja. Prosimo, vsak dan izpolnite dnevni pregled, dodajte en zapis (lahko ga narekujete ali napišete) in nam sporočite, kaj je bilo nerodno ali nejasno. Aplikacija ni medicinski pripomoček in ne nadomešča vaše zdravstvene ekipe. V nujnem primeru pokličite 112.

## Done means

- Every route above works on an iPhone simulator with no server, and the data survives an app restart.
- Dictation works on the device for Slovenian, or the microphone is hidden. No audio file exists anywhere in the app's storage.
- The screens match the blue mockups closely (same tokens, sizes and copy).
- The rules tests pass: calf pain or breathing gives `call_112`; fever, discharge or pain of 8 or more gives `contact_team`.
- Typecheck, lint and expo-doctor are clean.
- A production iOS build is uploaded to TestFlight (after my go-ahead), and I have the checklist for the external group.

Don't commit unless I ask. When something in the mockup conflicts with a platform rule or an Expo SDK 58 API, tell me which, and pick the platform's way.
