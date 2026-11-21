# eSkrb — design direction

The visual source of truth is `mockup.html`, rendered to `shots/*.png`.

## Brief

- **App:** eSkrb, a recovery companion for patients at home after a knee replacement. Most users are 60 to 85 and Slovenian, many with weak eyesight and little patience for apps. A separate staff dashboard triages what they send.
- **Core action:** the daily check-in (8 questions, about two minutes). After that come a quick note by voice, text or photo, and reading the team's reply.
- **Platforms:** iPhone and Android, built with Expo. One display face on both.
- **Feel:** calm, sure, warm. One big action per screen, nothing smaller than a thumb.
- **Voice:** a ward nurse who knows you by name. Formal "vi", sentence case, full stops, no exclamation marks.

## Concept

**eSkrb is one button.** Each screen is one saturated blue field with a single big white action. A ring of 42 dots around the start button shows the recovery so far. The pain question is a wedge-shaped slider that thickens and warms as the pain rises.

**Category default refused:** clinical white and teal, stock photos of smiling seniors, a "Good morning" greeting, a dashboard of vitals tiles, and small grey text.

## Tokens

| Role | Value |
|---|---|
| ground | `#1652C4` |
| ink on ground | `#FFFFFF` |
| secondary ink on ground | `#D9E6FF` |
| tonal surface on ground | `rgba(255,255,255,.14)` with a 1px `rgba(255,255,255,.22)` inner line |
| today dot, unread dot | `#FFD45C` |
| sheet | `#FFFFFF` |
| sheet ink / secondary / fill | `#0C2145` / `#3B5683` / `#EBF1FD` |
| hairline on sheet | `#E2EAF7` |
| Pregledano | `#0F7A5C` |
| pain scale: low / moderate / strong | `#FFF3E8` / `#FFB48C` / `#FF6A55` |
| urgent ground | `#B3121A` (gradient `#C0151D` → `#860A10`, lit from the top) |

Every colour has one owner. Peach and coral belong to pain only; yellow to "today" and "unread"; green to "Pregledano"; red to 112 only.

**Type:** Lexend on both platforms.

| Use | Size and weight |
|---|---|
| pain number | 184, weight 600, tracking −5% |
| screen title ("Dan 4 od 42", "Zapisi") | 34, weight 600 |
| question | 34, weight 600 |
| start button label | 32, weight 600 |
| quote and transcript | 24, weight 400 |
| buttons | 21, weight 500 or 600 |
| body and hints | 20, weight 400 |
| metadata | 18, weight 400 |

**Shape:**
- side margin 24
- pill buttons 68 tall, fully rounded
- sheets with a 32 top radius
- cards with a 28 radius
- round buttons: the start button 236, record 200, 112 220
- depth in three levels: the ground, white objects with one soft shadow, and rings or halos for the main round buttons

## Screens (in `mockup.html`)

1. **Home** (Android and iPhone): the date, "Dan 4 od 42", the nurse's message row ("Sestra Petra · Vam je pisala ob 10.14", with the unread dot), the start button inside the ring of 42 days with "Vsaka pika je en dan okrevanja." under it, and "Dodaj zapis".
2. **Message:** the nurse's full message on a white sheet, the item it refers to (wound photo, Pregledano), and a reply box.
3. **Pain** at 4 and at 8: the wedge slider with the number in the thumb, a pain-word pill and a one-line description. The bottom of the screen warms to the pain colour.
4. **Note** (`voice.png`): text only, typed or dictated on the device; no audio is kept or sent. In the build, the white card becomes the editable text field ("Povejte ali napišite, kako ste."), with a yellow focus ring and a caret. The microphone button ("Narekuj") with rings starts and stops dictation. Then "Dodaj fotografijo" (tonal) and "Pošlji" (solid white).
5. **Urgent:** "Pokličite 112.", the reason, the 112 button with rings, and "Vaša ekipa na ortopediji je že obveščena."
6. **Notes:** the pain trend (7, 6, 5), the nurse's message, entries with Pregledano and pain chips, and a reply box.

Not designed yet: setup (first run), the number, choice and yes/no questions, the thank-you and "team notified" results, and the debug screen. Reuse these tokens and components for them.

## Signature

The start button sits inside the ring of days. When the check-in is sent, today's yellow dot fills white with a soft spring and a success haptic. On the pain slider, every step gives a selection haptic, and the wedge and the screen's bottom glow warm with the value. With reduced motion, the values change instantly.

## Content

- Patient: Ivanka Kos, 74, left knee, surgery 17 November. Today is Saturday 21 November, day 4 of 42.
- Nurse: Sestra Petra Žagar, Ortopedija. Message today at 10.14: "Fotografija je jasna, rana lepo celi. Jutri zjutraj nam sporočite še temperaturo."
- Dictated note: "Od jutra me boli leva meča in je bolj trda kot včeraj." This triggers `call_112`.
- Timeline: the wound photo (yesterday 18.40), the check-in (yesterday 9.02, pain 5, 37,4 °C) and a dictated note ("Ponoči sem slabo spala, koleno je peklo."), all marked Pregledano.
- Pain words: 0 ne boli, 1–3 blaga, 4–6 zmerna ("Boli, a jo prenesete."), 7–8 močna ("Težko mislite na kaj drugega."), 9–10 neznosna.
