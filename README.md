# The Last Edition

A complete short, single-player paper-and-ink platform adventure built with **StarHermit engine 1.38.0**. Inspired by the supplied newspaper clipping about the supposed last baby of 2012.

The player is the child in the drawing. Cross three districts of a city shaped by a sensational headline, reclaim **F I R S T**, and correct the machine that keeps printing **LAST**. His large ears become a glider; his cry interrupts the machines that claim his future is settled. A fourth chapter, **The First Morning**, makes that new future playable: reopen a nursery, restore water, plant a shared garden, and deliver the city's first letter.

## Play

- A / D or arrow keys: move.
- Space / W / up: jump. Hold while falling to glide.
- X / J: resonant cry. Break barriers and stun censors; 2.6-second recharge. In the air, one cry per flight provides an extra lift.
- E / Enter: talk to citizens, edit a proofreader's wording, advance dialogue, or operate a press.
- Tab / N: field journal, including collected memories, recorded testimony and challenge progress.
- B: marginalia upgrades. Spend earned ink on abilities that last for this edition.
- P / Escape: pause; R: retry from the latest checkpoint. F1 opens engine settings.
- Gamepad and on-screen touch buttons are supported.

Each chapter has three lives and marked ground checkpoints. Letters, recovered stories and corrected proof plates survive a hit or a retry. Versioned saves preserve world edits, pickups, score and challenge progress, including migration of saves from the original release.

## Expanded adventure

| District | Citizen | Editable world rule | Optional route |
| --- | --- | --- | --- |
| The Empty Nursery | Mara, the caretaker | STILL → RISING | An updraft carries open ears above the ink to a rooftop crane. |
| The Forecast Factory | Ivo, the apprentice | FIXED → MOVING | A delivery lift travels across the ink and carries its riders. |
| Tomorrow's Press | Ada, the typesetter | CERTAIN → POSSIBLE | Previously absent bridges become solid paper. |

Nine origami cranes preserve human stories: the unfinished lullaby, small shoes, a nursery key, a branching forecast, an honestly blank column, an unposted letter, a typesetter's name, a drawing of wings and an unnumbered tomorrow. Each restores one life, awards 75 ink and unlocks a journal entry. Citizens offer multi-page testimony and respond when their district's three stories are returned. Testimony is recorded after the conversation is completed and can be reread in the journal.

Every chapter has three optional margin challenges: **Unblotted** (no damage), **Well Read** (12 ink motes), and **All Stories** (three memories). Each awards a 75-ink stamp when the chapter ends. Damage remains recorded after a checkpoint retry.

The last press is a three-plate encounter. Its six-second cycle marks a stamp target, gives the player time to dodge or jump, strikes, and enters a recovery window. A nearby cry corrects a proof plate only during recovery. After all three are corrected, the console can print FIRST and open The First Morning. Completing all nine stories and hearing all three citizens unlocks the **City That Remembers** ending rank; the standard rank remains available without the optional collection.

## Marginalia, threats and timed routes

Ink now has two records: the total found is the player's score, and the unspent balance pays for marginalia. Purchases persist between districts and through checkpoint retries.

| Note | Cost | Effect |
| --- | ---: | --- |
| Silk Ear Seams | 250 | Gliding descent slows from 120 to 75; airborne steering speed increases from 285 to 320. |
| A Longer Breath | 300 | Cry cooldown drops from 2.6 to 1.8 seconds. |
| The Blotter Coat | 350 | Absorb one hit; renew only at a new checkpoint or district. A retry or reload preserves a stained coat. |
| A Louder Question | 400 | Cry radius grows from 285 to 365, stun lasts 4.4 seconds, and reflected ink travels faster. |

**Rumour moths** build interest during a long flight, then pursue the player. Landing lets their interest fade. A cry interrupts them and folds their wings for a few seconds. **Redaction sentries** aim along a visible red line before firing a horizontal NO projectile. Jumping clears the shot; a nearby cry sends it back as IF. A returned shot silences its source and awards 25 ink once per sentry, with reward state preserved in saves. Unbroken censorship barriers stop projectiles.

Each district has a pair of **margin chimes**. Its world rule must be revised before the chimes respond. Cry within 85 units of each chime's ledge height before the first note's 6.5-second window ends. Completion awards 150 ink and unfolds a permanent shortcut. Losing a life clears unfinished notes, while completed pairs stay solved.

| Erratum | Route | Shortcut |
| --- | --- | --- |
| The Unfinished Chime | Climb from the old delivery ledge to the nursery's upper roof. | A paper bridge crosses the middle ink channel. |
| The Delivery Paradox | Ring a chime mounted on the moving lift, then carry the echo to the factory roof. | A new crossing opens over the last factory ink channel. |
| A Bridge of Ifs | Use the revised city to climb from a low ledge to the last roof before the press. | A paper crossing unfolds before the final arena. |

All three timed routes are tested using the original movement abilities. Completing the three errata alongside all nine memories and three testimonies unlocks a third ending rank, **The Unwritten Edition**. The field guide's Field Notes page explains moths, sentries and chimes.

## The First Morning

The fourth chapter is a peaceful district with four restoration jobs. There are no censors, sentries or ink hazards here. Ink, memories, testimony, challenge stamps and purchased marginalia carry over from the first three acts.

| Job | Play | Result |
| --- | --- | --- |
| Nursery | Climb the old roof for the key and return to Mara's door. | The nursery opens and its windows brighten. |
| Water | Open Ivo's waterwheel housing, then cry during three green alignment windows. Each window lasts 0.9 seconds in a 4.2-second cycle. | Water flows, greenhouse seeds become available, and high drafts begin to rise. Missed notes cost no progress. |
| Garden | Climb the greenhouse ledges for three seed packets, then plant the three distinct beds. | Flowers grow in the shared garden. Each bed uses one packet. |
| Letter | Meet Ada at her small press, choose a headline, and carry the letter to the rooftop postbox. | The first edition is posted and the ending opens. |

Each completed job awards 100 ink and restores three lives, once. Mara, Ivo and Ada have new conversations, with responses that change when their places are restored. The morning journal tracks the four jobs and conversations while keeping the original story archive available.

The letter can carry **WE BEGIN AGAIN**, **ROOM FOR TOMORROW**, or **A CITY OF NAMES**. The choice appears on the ending and may be revised at Ada's press until the letter is posted. A carried glide of at least 350 world units earns **Sky Post** and adds 150 ink on delivery; movement blocked by a wall does not count. The high drafts and airborne cry make the route possible with the original abilities. Release the glide button to settle onto a ledge in an updraft.

After delivery, **Walk the City** returns to the restored district. Completed jobs and rewards stay saved; the postbox can reopen the ending. **Print a New Edition** starts a fresh campaign. Version 4 saves migrate the earlier formats and preserve restoration, seed inventory, headline, delivery, purchases, shield charges, completed errata and reflection rewards. A legacy record without a campaign save also offers entry to the new morning.

The archive includes the original reference image and makes clear that its social and biological claims are the fiction the game challenges.

## Source and builds

`game/` is the editable engine package. `dist/` is the generated browser/native-upload package. `src/main.ts` handles engine lifecycle, input, UI and audio. `src/art.ts` draws original vector characters and bakes a reusable engraved city layer. `src/details.js` holds the optional routes and story content. `src/margins.js` supplies marginalia, chimes and enemy behavior. `src/afterword.js` supplies the restoration, letter and courier rules. `src/model.js` contains the shared deterministic rules, exercised by the three suites in `tests/`.

Download the official Linux, Windows or macOS engine from [the StarHermit engine guide](https://wiki.starhermit.com/docs/tutorials/starhermit-engine.html). With `starhermit` on PATH:

```sh
starhermit game
starhermit check game
starhermit types game
starhermit package --web game --out dist
node --test tests/*.test.mjs
```

The web runtime requires HTTPS or localhost. Serve `dist/` through HTTPS for browsers. Repackage after any source change; the engine verifies all package files against `starhermit-files.json`. Upload **the contents of `dist/`** unchanged to StarHermit for catalog publication. No account or platform identity is required for single-player play.

Art and sound: original procedural ink illustration and original synthesized music-box waltz/effects, with the user-supplied reference clipping in the archive. DejaVu fonts are bundled under their included license in `game/assets/FONT-LICENSE.txt`. The engine is loaded from the official release, pinned by integrity hashes, and is not redistributed in this repository.

## License

The project's first-party code and original assets use the same license as [StarHermit Engine](https://github.com/HypeDriven/starhermit-engine/blob/main/LICENSE): **PolyForm Noncommercial License 1.0.0**, with Hype Driven Development Inc.'s additional permission for commercial games kept published, publicly playable and in running order on StarHermit.com. The complete upstream terms and required notice are reproduced unchanged in [LICENSE](LICENSE), and included in the standalone game package.

Bundled DejaVu fonts retain their own license in `game/assets/FONT-LICENSE.txt`. The supplied newspaper clipping is reference material; the project license does not claim rights to that historical source. The engine runtime retains its own license and is loaded from the official release.

## Production publication

The Starhermit production title is **Last Edition**. The game manifest declares `cover=cover.jpg` and `description.file=description.md`; the generated loader uses `favicon.svg`. Cover-generation details are in [ARTWORK.md](ARTWORK.md).

Rebuild the web package with `starhermit package --web game --out dist`, then run `python3 scripts/finish-web.py` to add page metadata and refresh the file integrity index. `publication.json` is an ignored local deployment receipt.
