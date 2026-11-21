# eSkrb

Ada Hack 2026 project. A mobile app that helps patients log their recovery at home after surgery. Hospital staff see the logs in a triage queue and can reply.

## What the MVP does

The first version covers one loop for one procedure, knee replacement:

1. The patient does a daily check-in or adds a note on the phone (text, voice or photo).
2. The backend checks it against red-flag rules and flags anything concerning.
3. Staff see the patient in a triage queue, review the entries and send a message.
4. The patient sees the reply and a "Pregledano" (reviewed) badge in their timeline.

All patient-facing text is in Slovenian.

## Stack

- Expo with TypeScript and Expo Router
- OpenID auth via expo-auth-session
- VisionCamera v5 for the camera
- Backend over plain REST and JSON. It handles Soniox transcription and the LLM, so no API keys live on the phone.

## Getting started

```bash
npx expo install
npx expo start
```

Set the API base URL in an env variable. Fixtures mode returns contract JSON so the app runs without the backend.

## More

See [PLAN-mobile.md](PLAN-mobile.md) for the full plan, data model and API contract.
