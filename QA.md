# Validation report

## Executed

- JavaScript syntax checks passed for app.js, audio.js and config.js.
- Dependency-free VM state tests passed: both answer paths for all three questions, verdict gating, report, wrong code, correct code, deletion, unlock, flip state, personalized/event text, RSVP state, returning visitors, guest isolation, restart state, neutral fallback, reference-image exclusion and presence of reduced-motion rules.
- Mocked audio-controller tests passed: no startup players, all five file mappings, separate volume levels, effect interruption, track fade targets, persisted mute, and visibility pause/resume. This verifies controller logic, not real sound playback or fade timing.
- Local HTTP preview returned 200 OK.
- FFmpeg successfully decoded all six PNGs and all five audio files without errors. No missing or unreadable assets.

## Asset inspection

| Asset | Dimensions / format |
| --- | --- |
| spy_office_background.png | 941 × 1672, RGB |
| safe_closed.png / safe_open.png | 1086 × 1448, RGBA |
| invitation_front.png / invitation_back.png / invitation_preview.png | 1024 × 1536, RGBA |
| spy_music.mp3 / celebration_music.mp3 | MP3, 44.1 kHz stereo, 102.15 seconds |
| button_click.wav | PCM signed 16-bit, 44.1 kHz stereo, 1.104 seconds |
| safe_key_click.wav | PCM signed 16-bit, 44.1 kHz stereo, 1.099 seconds |
| transition_click.wav | PCM signed 16-bit, 44.1 kHz stereo, 2.347 seconds |

The back/front/reference and closed-safe artwork were visually inspected with the image viewer. Alpha-capable formats were confirmed; browser compositing has not been inspected.

Measured mean/peak audio levels in dB: music −13.3/0.0, ordinary click −23.2/−4.0, safe key −28.8/−1.0, transition −23.5/−1.0. Controller levels are respectively 0.18/0.30 for music, 0.25 for ordinary clicks, 0.35 for keypad, and 0.28 for transitions. Original files are unchanged.

**The two supplied music files are byte-for-byte identical** (SHA-1 34b64ced5ac28fd6e0110686e2e4504411a715a1). Both requested filenames are used, but the musical content cannot change at the reveal with the supplied assets.

## Not verified in a browser

The browser tool reported “No browser is available.” Accordingly, no browser tests are claimed. The following still require review:

- 320, 375, 390, and 430 px mobile widths and desktop; overflow, touch targets, card text readability and reference fidelity.
- Sequential hint button operation, touch input, full keyboard/focus navigation, animated safe opening, card emergence and 3D flip appearance.
- Actual five-file audio playback, audible fade balance, autoplay behavior, mute, tab visibility, and iOS Safari restrictions. Some mobile Safari versions do not honor programmatic HTMLMediaElement volume, which may limit smooth fades.
- Real localStorage persistence across browser reloads, RSVP clicks, reduced-motion rendering, and browser console errors.

The address remains the supplied placeholder. The project is ready for local review, with visual/browser QA outstanding.
