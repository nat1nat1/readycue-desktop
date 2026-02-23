# ReadyCue Desktop

The macOS desktop app for [ReadyCue](https://readycue.ai) — AI-powered interview coaching with real-time system audio capture.

## What it does

ReadyCue Desktop wraps the ReadyCue web app in an Electron shell that adds capabilities not possible in a browser:

- **System audio capture** — Captures what the interviewer is saying via macOS Screen Recording permission (using audio loopback), so both sides of the conversation are transcribed
- **Microphone + system audio mixing** — Combines your microphone input with system audio into a single stream for Deepgram transcription
- **Menu bar tray** — Quick access to open the app, start a live session, and check for updates
- **Auto-updates** — Downloads and installs new versions automatically via GitHub Releases
- **Deep links** — `readycue://` protocol for opening the app from the browser

## Requirements

- macOS 12+ (Monterey or later)
- **Microphone permission** — for capturing your voice
- **Screen Recording permission** — for capturing system audio (interviewer's voice)

## Install

Download the latest DMG from [Releases](https://github.com/nat1nat1/readycue-desktop/releases), open it, and drag ReadyCue to Applications.

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript and run
npm run dev

# Build DMG (unsigned, no notarization)
npm run dist:mac -- --publish never

# Full release (compile, build, notarize, publish)
npm run release
```

### Environment variables

Create a `.env` file for Apple notarization (required for releases):

```
APPLE_ID=your@apple.id
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
```

## Architecture

```
src/
  main/
    index.ts        — Main process: window, shortcuts, deep links, audio
    tray.ts         — Menu bar tray with dynamic update status
    auto-update.ts  — electron-updater setup and IPC handlers
  preload/
    index.ts        — contextBridge API (electronAPI)
scripts/
  release.sh        — End-to-end build, notarize, tag, and publish
  notarize.js       — Apple notarization afterSign hook
assets/
  icon.icns         — App icon
  trayTemplate.png  — Menu bar icon (template image)
  dmg-background.png
```

## Tech stack

- **Electron 33** — Desktop shell
- **electron-updater** — Auto-updates via GitHub Releases
- **electron-audio-loopback** — System audio capture
- **@electron/notarize** — Apple notarization
- **electron-builder** — Packaging and DMG creation

## License

Private — not open source.
