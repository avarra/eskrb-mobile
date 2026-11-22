# eSkrb: kolega (buddy) design notes

These notes add to `DIRECTION.md`; they don't replace it. The source is `buddy.html`, and the renders are in `shots/buddy/` (`sheet.png`, plus one PNG per screen and iOS/Android pairs in `pairs/`). Existing screens and `mockup.html` are unchanged.

## Approach

The direction was already set, so there was no three-way exploration. Every token, radius, size and type step comes from `DIRECTION.md` and `src/theme/tokens.ts`. The only new value is `#C9D8F5`, the outline of a cheer bubble, which sits between `sheetFill` and `ground`.

## Decisions

- **The buddy avatar is a white disc with a blue initial.** The nurse's avatar is peach, so a peer never looks like staff at a glance.
- **Signature: the two today-dots.** Two dots joined by a line, you first and then the buddy. They use the day ring's grammar: yellow means today is still open, white means the check-in is sent. When the buddy checks in while the screen is open, their dot fills white with the same soft spring and success haptic as the day ring. Sending a cheer lands it in the thread with a short blue halo (`signature-2`). With reduced motion, the dot and bubble change instantly.
- **Yellow keeps its one job.** It marks the unread dot on the home row and the open today-dot. Cheers get an outline, not a colour.
- **Bubbles:** buddy messages use `sheetFill` with sheet ink and sit left. Mine use `ground` with white text and sit right. Cheers are white with an outline, a "Pozdrav" label and larger text (22).
- **The cheer sheet shows both texts.** The bold label is what the sender taps, and the line in »…« is exactly what the buddy receives. This stays honest about the spec's "different words" rule without hiding anything from the sender.
- **The safety line sits on every live thread,** 18 px and underlined, above the composer. It opens the team message screen.
- **Composer:** a 64 px field with a microphone inside it, then two 64 px buttons, "Pozdrav" (tonal) and "Pošlji" (solid). Dictation reuses the note screen's yellow focus ring, "Narekovano. Besedilo lahko popravite." and a character counter.
- **Home entry point:** the buddy row reuses `MessageRow`'s tonal pill in the same slot. It appears only when a pair exists. If a nurse message is unread at the same time, the nurse row comes first and the buddy row goes under it.
- **Report and leave** are bottom sheets with one solid action and "Prekliči". Report opens from a long-press on a buddy bubble (plus an accessibility action). Leave opens from "⋯" in the top bar.

## Copy changes against the spec (for the native-speaker review)

| Spec draft | Designed | Why |
|---|---|---|
| "prijava" (check-in) | "pregled" | The app calls the check-in "pregled" everywhere ("Začni pregled", "Dnevni pregled"). "Prijava" is the sign-in screen. |
| "Kolega misli **nate**." | "Marija misli **na vas**." | "nate" is informal, and the app uses formal "vi". The buddy's first name is allowed and avoids kolega/kolegica. |
| "Oba sva danes opravila" | "Oba pregleda sta danes oddana." | Avoids the gendered dual (opravila/opravili). |
| "Ana še ni opravila prijave. Pošljete **ji** …" | "Marija: današnji pregled še ni oddan. Pošljete prijazen opomnik?" | "opravila" and "ji" assume a woman. The server stores no grammatical gender. |
| "Povezava s kolegom se je zaključila." | "Povezava se je zaključila." + "Sporočila lahko še berete." | Gender-neutral, and it says what still works. |
| "Kolega je zaključil okrevanje." | "Okrevanje je zaključeno" (under the name) | Gender-neutral. |
| "Vašega kolega vam bo dodelila ekipa." | "Ekipa vas lahko poveže z drugim pacientom, ki okreva kot vi. Vidita si samo ime in ali je pregled oddan." | The draft is ungrammatical ("kolega" should be "kolego"), and this version also states the privacy rule. |
| "Prijavi sporočilo" | "Opozori ekipo" | Again, "prijava" means sign-in in this app. |
| "Za zdravstvene težave pišite zdravstveni ekipi." | "Zdravstvene težave? Pišite ekipi." | It fits on one line at 18 px on a 360 dp phone. |

Received cheer texts as designed: "Bravo za današnji pregled.", "3 dni zapored, bravo.", "Držim pesti.", "Do jutri.", "Marija misli na vas. Ne pozabite na današnji pregled.", "Marija misli na vas. Kako vam gre?", "Lepo, da ste spet tu.", "Čestitke za zaključeno okrevanje.", "Teden dni okrevanja je za vama." Gendered forms still to check: "Lepo, da ste spet tu." is fine. "za vama" is dual, which is fine.

## Scan

9 FAILs remain, all of the "cards nested inside cards" kind: chat bubbles and option cards inside a white sheet. This is the same structure the existing message and notes screens use, so it is deliberate. There are no clipping, contrast, emoji or copy FAILs. Warns: the type scale lists 11 sizes because the renders include the existing home screen (32, 30, 17), and the buddy additions add only 22 and 16.

## Not designed

The staff dashboard ("Buddies" page and the "New pair" modal) belongs to the backend repo. iOS pairs exist only for home and the thread; the sheets follow the same pattern on iOS. The design pass ran one self-review round with no separate critic, so a teammate should review it.
