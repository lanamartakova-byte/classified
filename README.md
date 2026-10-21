# Operation 45

A buildless, local-only Russian birthday invitation. No installation, backend, external fonts, or services are required.

## Preview

From this directory run `python3 -m http.server 8045 --bind 127.0.0.1`, then open http://127.0.0.1:8045/?guest=mama. Use `?guest=papa` for the second example. Open through HTTP rather than `file://` because the application uses JavaScript modules. Stop the server with Ctrl+C.

## Editing

Edit `config.js` to change the guest greetings and event details. Only `mama` and `papa` are configured. Unknown or absent IDs use the neutral greeting. `event.address` is a placeholder. Update `event.confirmation` together with the date when changing the event. All displayed event values live in this single configuration.

Progress and RSVP use `op45:guest:<encoded guest ID>` in localStorage. Sound uses the independent `op45:sound` key. Restart resets mission progress while preserving sound and the existing RSVP. RSVP is local only and is not transmitted to the organizer.

## Implementation

- `index.html`: semantic shell and persistent sound control.
- `styles.css`: responsive scenes, ECG, safe reveal, card emergence, perspective flip, lightweight confetti, safe areas and reduced motion.
- `app.js`: personalized scenes, detector feedback, safe hints and keypad, invitation, local persistence and RSVP.
- `audio.js`: lazy centralized audio, separate track/effect levels, music fades, effect interruption, mute, visibility management and playback error handling.
- `config.js`: guest and event configuration.
- `tests/`: dependency-free state and audio-controller tests.

The keypad sits below the safe on phones (beside it on desktop), providing large touch targets without modifying the artwork. The invitation uses its natural 2:3 aspect ratio with HTML text placed inside the opaque paper area. All asset paths are relative for repository-subdirectory hosting. The reference image is never loaded by the application.

## Validation

Run `node --check app.js`, `node --check audio.js`, `node --check config.js`, `node tests/flow.test.mjs`, and `node tests/audio.test.mjs`.

See `QA.md` for executed checks and remaining manual verification. Nothing has been committed, pushed, deployed, or published.
