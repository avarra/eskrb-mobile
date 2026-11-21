# Ada Hack 2026 — MVP plan: mobile app

## MVP goal

The first test proves one loop end to end: a patient logs on the phone, the backend flags it, staff see it in the triage queue and respond, and the patient sees the response.

Everything here serves that loop for one scenario, knee replacement. Features outside the loop are listed at the bottom as the next round.

- Mobile is Expo with TypeScript. Backend stack is the backend dev's choice; the contract is plain REST and JSON.
- Auth with OpenID via expo-auth-session.
- All patient-facing copy is Slovenian from the start. Code, field names and the dashboard can be English.
- Audio and photos upload to the API. The backend calls Soniox and the LLM, so no API keys live on the phone.
- Both sides build against the contract in parallel. Mobile uses fixture JSON until the API is up.
- Camera work is handled by VisionCamera V5 (react-native-vision-camera)

## Shared contract

### Data model

| Entity | Key fields | Notes |
| --- | --- | --- |
| User | id, name, role (patient, caretaker, staff) | Caretaker role exists but is unused in this round |
| Protocol | id, name, durationDays, questions[], rules[] | Stored as JSON, one seeded: knee replacement |
| Episode | id, patientId, protocolId, startDate, endDate | One recovery period for one patient |
| CheckIn | id, episodeId, date, answers{}, authoredBy, reviewedAt, reviewedBy | answers is keyed by question id |
| Log | id, episodeId, type (text, voice, photo), text, transcript, mediaUrl, extracted{}, authoredBy, reviewedAt | extracted uses the same keys as check-in answers |
| Flag | id, episodeId, sourceType, sourceId, ruleId, severity (attention, urgent), quote, resolvedAt | quote is the patient's own words or the answer that triggered it |
| Message | id, episodeId, fromUserId, body, createdAt | Staff to patient and back |

`authoredBy` goes on every check-in and log now, so caretakers can be added later without a migration.

### Protocol JSON

```json
{
  "id": "knee-replacement",
  "durationDays": 42,
  "questions": [
    { "id": "pain", "type": "scale", "min": 0, "max": 10, "text": "Kako močna je bolečina v kolenu?" },
    { "id": "temperature", "type": "number", "unit": "°C", "text": "Kakšna je vaša telesna temperatura?" },
    { "id": "swelling", "type": "choice", "options": ["less", "same", "more"], "text": "Kakšna je oteklina v primerjavi z včeraj?" },
    { "id": "wound", "type": "choice", "options": ["dry", "red", "discharge"], "text": "Kakšna je rana?" },
    { "id": "calfPain", "type": "boolean", "text": "Ali čutite bolečino ali oteklino v mečih?" },
    { "id": "breathing", "type": "boolean", "text": "Ali težko dihate ali čutite bolečino v prsih?" },
    { "id": "walking", "type": "boolean", "text": "Ali ste danes hodili z berglami?" },
    { "id": "wellbeing", "type": "scale", "min": 1, "max": 5, "text": "Kako se danes počutite?" }
  ],
  "rules": [
    { "id": "fever", "field": "temperature", "op": ">=", "value": 38.0, "severity": "attention" },
    { "id": "wound-discharge", "field": "wound", "op": "==", "value": "discharge", "severity": "attention" },
    { "id": "high-pain", "field": "pain", "op": ">=", "value": 8, "severity": "attention" },
    { "id": "calf", "field": "calfPain", "op": "==", "value": true, "severity": "urgent" },
    { "id": "breathing", "field": "breathing", "op": "==", "value": true, "severity": "urgent" }
  ]
}
```

The questions and thresholds are placeholders to make the loop testable. A clinical mentor should correct them before the pitch.

### API

| Endpoint | Used by | Returns |
| --- | --- | --- |
| POST /auth/demo-login | both | token for a seeded user id |
| GET /me/episode | mobile | episode, protocol, day number, whether today's check-in is done |
| POST /episodes/:id/checkins | mobile | saved check-in, flags[], patientAction |
| POST /episodes/:id/logs (multipart) | mobile | saved log with transcript, flags[], patientAction |
| GET /episodes/:id/timeline | mobile | check-ins, logs and messages, newest first, with reviewed status |
| POST /episodes/:id/messages | both | saved message |
| GET /staff/triage | dashboard | episodes grouped into the four columns |
| GET /staff/episodes/:id | dashboard | profile: summary, open flags, timeline, pain series |
| POST /staff/episodes/:id/review | dashboard | marks items reviewed and resolves their flags |

`patientAction` is one of `none`, `contact_team` or `call_112`. The mobile app decides which result screen to show from this field alone.

### Triage columns

- **Needs attention:** the episode has an unresolved flag. Urgent sorts above attention.
- **Missed check-in:** no check-in for today after the cutoff hour, or none yesterday.
- **Awaiting patient reply:** the last message is from staff.
- **Stable:** everything else.

## Mobile app plan

Build in this order. Each step leaves the app runnable.

1. **Scaffold.** Expo app with TypeScript and file-based routing. One API client with the base URL in an env variable, and a fixtures mode that returns the contract's JSON so you are not blocked on the backend.
2. **Demo login.** A screen listing the seeded patients. Tapping one calls demo-login and stores the token.
3. **Home.** Shows "Dan 4 od 42", one large button for the daily check-in, a secondary button for adding a note, and whether today's check-in is done.
4. **Daily check-in.** One question per screen, rendered from the protocol JSON by question type (scale, number, choice, boolean). Large controls, a back button, a progress indicator. Submit at the end.
5. **Result screen.** Driven by `patientAction`. `none` shows a thank-you. `contact_team` says the team has been notified and offers a call button. `call_112` shows a full-screen urgent prompt with a `tel:` link.
6. **Quick log.** Three inputs on one screen: typed text, a voice recording that uploads as audio, and a photo from the camera or library. Show the returned transcript after a voice upload. Same result screen as the check-in.
7. **Timeline.** Past check-ins, logs and staff messages, newest first. Each entry shows a "Pregledano" badge once staff reviewed it. A reply box at the bottom posts a message.
8. **Daily reminder.** Local notification at a fixed hour that opens the check-in. Show it in the foreground too. Add a hidden button that fires it in 10 seconds.
9. **Copy and size pass.** All strings in Slovenian, large type, high contrast, nothing smaller than a thumb.

Skipped in this round: HealthKit, the watch app, caretakers, the conversational check-in and consent toggles. None of them block the loop.

Build the question renderer generically from the JSON, not hard-coded per question. Protocols per procedure then cost nothing extra later.

## First test

Run this script together once both sides are up. If every step works, the MVP is done.

- [ ] Log in on the phone as the stable seeded patient. Home shows the right day number.
- [ ] Trigger the reminder with the debug button. Tapping it opens the check-in.
- [ ] Submit a normal check-in. The phone shows the thank-you, and the patient sits in Stable on the dashboard.
- [ ] Record a voice note in Slovenian saying the calf hurts. The transcript comes back and the phone shows the urgent screen.
- [ ] The patient moves to Needs attention, with the flag and the quoted sentence on the card and profile.
- [ ] Add a wound photo. It appears in the profile timeline.
- [ ] On the dashboard, send a message and mark the items reviewed. The patient moves to Awaiting patient reply.
- [ ] The phone timeline shows the message and the reviewed badge. Reply from the phone and the patient returns to Stable.
- [ ] The seeded patient with missed check-ins sits in the Missed check-in column.

## Covered by this plan

- Daily structured check-in, driven by a per-procedure protocol
- Extra logs: text, voice with Slovenian transcription, and photos
- Wellbeing as one slider question inside the check-in
- Daily reminder notification that opens the check-in
- Deterministic red-flag rules per procedure
- AI extraction from free text and voice into structured fields, with source quotes
- AI summary on the patient profile
- Urgent and contact-team prompts on the phone
- Triage queue with four columns, including missed check-ins
- Patient profile with timeline, flags and a pain trend
- Staff actions: mark reviewed and message the patient
- Patient sees that staff reviewed a log, and can reply
- Seeded demo data and demo login
- Large, simple, Slovenian patient UI

## Still to do after this plan

### Mobile

- Conversational voice check-in
- HealthKit data from the phone
- Consent toggles per data type and per procedure
- Recovery-relevant wellbeing tags after the slider
- Medication tracking with reminders
- Questions and doubts, answered from discharge instructions or routed to staff
- Wound photo timeline as a side-by-side view
- Alarm-style reminder for patients who opt in

### Caretakers (mobile side)

- Proxy and observer modes
- Joining by QR or invite code
- Patient switcher and proxy-worded questions
- Notifications when the patient misses a check-in or raises a flag

### Pitch (shared)

- Clinical check of the questions and thresholds
- Demo storyline and the seed data that tells it
- Roadmap slide: SI-PASS login and eZdravje integration
- Slides on staff time saved, human in the loop, and privacy
