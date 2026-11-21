# eSkrb — design direction

## Brief (self-authored from PLAN-mobile.md)

1. **App:** eSkrb, a recovery companion for patients at home after a knee replacement. Users are mostly 60 to 85, Slovenian, many with weak eyesight and little patience for apps. A staff dashboard (separate) triages what they send.
2. **Core action:** the daily check-in, 8 questions, about two minutes. Second: a quick note by voice, text or photo. Third: reading the team's reply.
3. **Platforms:** both, Expo. Explored on **Android first** (most Slovenian phones, and most older patients' phones); each direction also shows its home screen on iPhone.
4. **Feel:** calm, sure, kind. Simple and universal: one decision per screen, nothing smaller than a thumb.
5. **Money:** free (hospital-provided). No paywall.
6. **Voice:** a ward nurse who knows you by name. Formal "vi".
7. **Exists:** the plan only. No logo, no colours.
8. **Needs now:** three directions covering every screen in the plan's core loop. The winner then goes through the full set.
9. **Image generation:** not used. All imagery is drawn shapes.

## Category default we refuse

Post-op and patient apps share: white with clinical blue or teal, a stock photo of a smiling grey-haired couple, progress rings, "Good morning, Marija", a dashboard of vitals tiles, small grey text. We refuse the blue/teal hospital palette, the greeting, the vitals dashboard and the small type. The core action owns the first screen.

## The three concepts

| | Concept | Family | Ground | Display type | Accent | Richness |
|---|---|---|---|---|---|---|
| A | **eSkrb is a marked mountain trail.** 42 days are a path; every day you check in leaves a trail blaze (the red ring with a white centre every Slovenian walker knows). | place | light | expanded (Archivo Expanded) | red | shape |
| B | **eSkrb is a push-button telephone.** Big chunky keys you press, on the phone's bright body. The 0 to 10 pain scale is a keypad; the urgent screen is one key: 112. | object | colour-field (yellow) | rounded (Google Sans Flex, ROND 100) | yellow | 3d-object |
| C | **eSkrb is the lit sign of the night pharmacy.** Someone is on duty. The green cross is unlit until today's check-in is sent, then it lights. | place | dark | serif (Literata) | green | illustration |

Each differs from every row in `~/.app-designer/history.md` on at least 3 of 5 columns.

## Shared rules across all three

- Minimum body text 18, controls 56 tall, primary button 64 tall.
- Urgent (`call_112`) is always a full red field with white type, in every direction. Urgency must never be a style choice.
- Formal "vi", sentence case, full stops, no exclamation marks.
- Two tabs only: **Danes** (today) and **Zapisi** (timeline and messages).

## Content (shared)

- Patient: Ivanka Kos, 74. Left knee, surgery 17 Nov. Today Saturday 21 November, day 4 of 42. Today's check-in not done.
- Nurse: sestra Petra Žagar. Latest message today 10:14: "Fotografija je jasna, rana lepo celi. Jutri zjutraj nam sporočite še temperaturo."
- Voice note transcript: "Od jutra me boli leva meča in je bolj trda kot včeraj." → rule `calf` → `call_112`.
- Timeline: message (today 10:14), wound photo (yesterday 18:40, pregledano), check-in (yesterday 9:02, pain 5, 37,4 °C, pregledano), voice note (19 Nov, "Ponoči sem slabo spala, koleno je peklo.", pregledano).

## Pick

**Recommended: B, push-button telephone** (pending the user's choice).

- **B wins:** it is the most *this app*. The keypad answers the pain scale without a slider, every target is a big key, and yellow with black ink is the highest-contrast pairing for older eyes. On the urgent screen there is one key to press: 112. The 6-week grid is also the protocol's real 42 days, with the check-up on day 14 marked.
- **A, runner-up:** calm, and very Slovenian, since the trail blaze is understood without explanation. But the trail decorates more than it helps, and the screens with no trail on them fall back to a generic light form.
- **C lost:** the "cross lights up when you have checked in" moment is the best signature of the three. But a dark ground is wrong for patients checking in at 9 in the morning, and the unlit cross means nothing until the text explains it.
- **Worth merging:** C's signature (lighting a sign on completion) could become B's handset lamp lighting up when staff review an entry.

---

## Round 2: quieter, more accessible, less cluttered

The user asked for an entirely different direction: more minimal, more accessible, less cluttered. Round 1 (A to C) stays in `explore.html`. Round 2 is in `explore-2.html`.

Rules added for this round: no illustration and no decoration. Body text is at least 20 and buttons at least 72 tall. Every screen has one primary action, and no screen has a tab bar.

| | Concept | Ground | Type | Accent | Structure |
|---|---|---|---|---|---|
| D | **Velik tisk.** eSkrb is a large-print book. | white | Source Serif 4 for reading, Google Sans Flex for buttons | yellow highlighter on the one thing that matters today | home → question → done; messages and the timeline are two text rows on home |
| E | **Ena tipka.** eSkrb is one button. | deep plum colour field; red when urgent | Lexend (designed for reading ease) | white | each screen is one sentence and one huge white button |
| F | **Pogovor.** eSkrb is a conversation with the ward. | black | Atkinson Hyperlegible Next (low-vision face, with a slashed zero) | yellow on black, the high-contrast pair | one screen, the thread: check-in questions, answers, staff replies and "Pregledano" all in one place; tapping an answer moves on |

**Recommended: D as the base, with two ideas from F.**
- **D wins:** it reads like a letter and is the calmest and plainest of the six, with nothing to learn. The highlighter is the only colour, and it points at today's task.
- **Take from F:** tapping an answer moves on with no "Naprej" step, and "Pregledano" sits right under the entry it belongs to.
- **E lost:** the single round button is memorable, but a full colour field on every screen tires the eyes, and lists have to escape onto a white sheet.
- **F lost as a whole:** one thread is the least cluttered structure, but a patient can mistake the app's questions for messages from the nurse. That needs testing with real patients before betting on it.

---

## Round 3: E with the slider, three levels of finish

The user picked E (one button) and asked for the pain scale as a slider, at three levels of design. All three are in `explore-3.html`. They share the same plum, Lexend, copy and structure.

| | Level | What changes |
|---|---|---|
| E1 · Golo | barebones | Flat plum, flat white, no shadows or gradients. A 12px track and a plain 60px white thumb. Lists sit straight on plum with hairlines. |
| E2 · Srednje | in between | The E from round 2. A soft halo on the button, a 40px track whose fill warms from cream to peach or coral with the pain, a lit 76px thumb with grip lines, and a white sheet for lists. |
| E3 · Razkošno | fancy | A soft white light on the plum. A ring of 42 dots around the button (days done, today in yellow). A wedge-shaped track that thickens as the pain rises, with the number riding in an 84px thumb. A pain-word pill in the heat colour, and the bottom of the screen warming to that colour (peach at 4, coral at 8). Concentric rings on the record and 112 buttons. A small pain trend (7, 6, 5) on the timeline. |

The heat colours belong to the pain scale only: cream (low), peach (moderate), coral (strong). Green means "Pregledano". Red is used only for urgent.
