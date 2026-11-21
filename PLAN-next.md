# eSkrb — after the MVP

This is the work after `PLAN-mobile.md` (the MVP loop) and `PLAN-testflight.md` (the local TestFlight build). Nothing here blocks the first version.

## Ground rule for anything with speech

No audio ever reaches our backend or the staff dashboard, and none is stored on the phone. Speech becomes text on the phone. The patient reads and edits the text, and only the confirmed text is sent. Staff see text and photos, never recordings.

## Speech to text with Soniox (replaces on-device dictation)

The first version dictates on the device (see `PLAN-testflight.md`). Soniox comes in when the backend is live and dictation quality or Slovenian coverage on the device isn't good enough.

### Architecture: temporary key, direct stream

1. The phone asks our backend for a key: `POST /stt/temporary-key`, authenticated as the patient.
2. The backend holds the main Soniox key (in a secrets manager; never in the app, the repo or a log). It calls `POST https://api.eu.soniox.com/v1/auth/temporary-api-key` with:
   - `usage_type: "transcribe_websocket"`
   - `expires_in_seconds: 60`
   - `single_use: true`
   - `max_session_duration_seconds: 300`
   - `client_reference_id`: the episode id (never a name)

   It returns `{ apiKey, expiresAt }` to the phone and does nothing else with the audio.
3. The phone opens the live WebSocket at `stt-rt.eu.soniox.com` with the temporary key, sends 16 kHz mono PCM, uses `language_hints: ["sl"]`, and shows the words live in the editable note field.
4. The patient edits the text and sends it as a normal text log (`source: "dictated"`). The backend runs extraction and rules on the text, as it does for typed notes.

### Why this way

- Soniox says to keep regular keys on servers and to give clients only temporary keys minted by the backend.
- A leaked temporary key is good for one stream of at most five minutes.
- Soniox's live API does not store audio or transcripts. Its logs hold metadata only, and nothing is used for training.
- Audio goes phone → Soniox EU and never touches our infrastructure.
- **Don't use** Soniox's async file API: it stores audio and transcripts for 30 days, and the docs show no way to turn that off.
- **Don't proxy** audio through our server: it puts audio on our infrastructure, adds latency, and means running live streaming connections.

### Before turning it on

- Request EU data residency for the Soniox project in the Console (it needs approval).
- Get a signed data processing agreement from Soniox. Transcripts are health data, a special category under GDPR. The docs list GDPR, SOC 2, ISO 27001 and HIPAA, but don't name a DPA.
- Rate-limit `/stt/temporary-key` per patient, and log only the episode id, time and outcome.
- Check which Soniox model supports `language_hints_strict` for Slovenian.

### Mobile work

- `@soniox/react` and `@soniox/client` with a custom audio source that streams 16 kHz PCM. Soniox's React Native example uses `@siteed/expo-audio-studio`, which needs a development build.
- Make sure the audio library doesn't write a file, or deletes its buffer once the stream ends.
- Live text in the same note field as on-device dictation. The field stays editable while and after speaking.
- If offline or without a key, fall back to on-device dictation, then to typing.

## Mobile

- Conversational check-in by voice (built on the Soniox flow above; text only reaches the server)
- HealthKit data from the phone
- Consent toggles per data type and per procedure
- Recovery-relevant wellbeing tags after the slider
- Medication tracking with reminders
- Questions and doubts, answered from the discharge instructions or routed to staff
- Wound photo timeline as a side-by-side view
- Alarm-style reminder for patients who opt in

## Caretakers (mobile side)

- Proxy and observer modes
- Joining by QR or invite code
- Patient switcher and questions worded for a proxy
- Notifications when the patient misses a check-in or raises a flag

## Pitch (shared)

- Clinical check of the questions and thresholds
- Demo storyline and the seed data that tells it
- Roadmap slide: SI-PASS login and eZdravje integration
- Slides on staff time saved, human in the loop, and privacy (no audio leaves the phone)
