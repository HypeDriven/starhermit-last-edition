# Last Edition

Publish the current StarHermit Engine 1.39.0 game to Starhermit production as **Last Edition**, with original cover art, a distinct favicon and a complete catalog description. Keep the existing gameplay and local-save compatibility.

The editable package is `game/`; `dist/` contains the production web upload. Declare artwork and description in `game/starhermit.txt` and include them in the generated integrity index.

<!-- display-localization:start -->

### Display language

Authored UI text, canvas labels, selector options and composed messages resolve through the packaged string catalog. Message keys are stable hashes, so long story passages fit the runtime’s string-key limit. Display translation preserves simulation and protocol values, interpolated player names and entered text. The source English catalog is shipped; additional languages are available only when their entire catalog has validated translations.

The language panel opens with F2, saves the player’s choice and offers Automatic to follow the account or device language. Packaged script fonts apply to both native and browser text. Touch button labels follow the selected language immediately, including changes during play.

<!-- display-localization:end -->
