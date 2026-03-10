# Live Translate CC

A Chrome/Edge extension that translates Microsoft Teams closed captions in real-time. Built for meetings with Quebec French (Québécois) speakers, but supports any language pair.

## Features

- **Real-time translation** of Teams closed captions as they appear
- **Dual display modes**: inline (below each caption) or side panel (adjacent pane)
- **Multiple translation backends**: LibreTranslate, Google Cloud, DeepL, OpenAI
- **Quebec French optimized**: OpenAI backend includes a system prompt tuned for Québécois colloquialisms (joual, contractions, informal speech)
- **Transcript export**: download the full caption history as TXT, CSV, or SRT
- **Keyboard shortcuts**: `Alt+Shift+T` to toggle display mode, `Alt+Shift+E` to export
- **Dark/light mode** aware styling

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions` (or `edge://extensions` for Edge)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `live-translate-cc` folder
5. The extension icon will appear in the toolbar

## Configuration

Click the extension icon to open the settings popup:

### Translation Backend

| Backend | API Key Required | Best For |
|---------|-----------------|----------|
| **LibreTranslate** | Optional (free public instances) | Quick start, no account needed |
| **Google Cloud Translation** | Yes | High volume, reliable |
| **DeepL** | Yes (free tier available) | European language quality |
| **OpenAI** | Yes | Quebec French / colloquialisms |

### Language Settings

- **Source language**: defaults to French (`fr`)
- **Target language**: defaults to English (`en`)
- 12 languages supported including CJK

### Display Modes

- **Inline**: translations appear directly below each caption in the Teams caption pane
- **Side Panel**: a separate scrollable panel appears to the right of the caption area, with speaker labels and timestamps

### Export

Export the full transcript at any time:
- **Content**: Original only, Translated only, or Both
- **Formats**: TXT (readable transcript), CSV (spreadsheet), SRT (subtitle file)
- Files are named `teams-captions-YYYY-MM-DD-HHMM.{ext}`

## Usage

1. Join a Teams meeting in Chrome/Edge at `teams.microsoft.com`
2. Turn on **Live Captions** in the meeting (or have the organizer enable them)
3. The extension automatically detects caption text and begins translating
4. Use `Alt+Shift+T` to toggle between inline and side panel display
5. Use `Alt+Shift+E` to export the transcript

## Backend Setup

### LibreTranslate (easiest)

Works out of the box with public instances. For a private instance:

```
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
```

Set the URL to `http://localhost:5000` in settings.

### Google Cloud Translation

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Cloud Translation API**
3. Create an API key under **Credentials**
4. Paste the key in the extension settings

### DeepL

1. Sign up at [deepl.com/pro](https://www.deepl.com/pro) (free tier available)
2. Go to **Account** > **Authentication Key**
3. Paste the key in the extension settings (free keys end with `:fx`)

### OpenAI

1. Get an API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. Paste the key in the extension settings
3. Select a model (gpt-4o-mini recommended for speed/cost balance)

## How It Works

The extension uses a `MutationObserver` to watch for Teams caption DOM nodes identified by `data-tid="closed-caption-text"`. When new captions appear or existing ones update (Teams refines text as speech recognition improves), the text is debounced and sent to the configured translation API via the extension's service worker. Translated text is then displayed inline or in the side panel.

The caption list in Teams is virtualized (old entries are recycled), so the extension maintains its own in-memory transcript history for export.

## Edge Compatibility

This extension works identically in Microsoft Edge — load it via `edge://extensions` with Developer mode enabled.

## License

MIT
