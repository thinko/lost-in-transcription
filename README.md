# Lost in Transcription

A Chrome/Edge extension that translates Microsoft Teams closed captions in real-time. Built for meetings with Quebec French (Québécois) speakers, but supports any language pair.

## Features

- **Real-time translation** of Teams closed captions as they appear
- **Dual display modes**: inline (below each caption) or side panel (adjacent pane)
- **Multiple translation backends**: LibreTranslate, Google Cloud, DeepL, OpenAI-compatible
- **Quebec French optimized**: OpenAI backend includes a system prompt tuned for Québécois colloquialisms (joual, contractions, informal speech)
- **Customizable AI prompts**: tweak the system prompt for any AI model, with template variables
- **Configurable send frequency**: real-time, end-of-sentence, stable text, or timed batching
- **Local LLM support**: works with Ollama, LM Studio, vLLM, or any OpenAI-compatible endpoint
- **Connectivity testing**: verify your backend connection with one click
- **Model discovery**: auto-fetch available models from any OpenAI-compatible endpoint
- **Session persistence**: transcripts survive page refreshes, browser crashes, and reconnects
- **Transcript export**: download the full caption history as TXT, CSV, or SRT
- **Keyboard shortcuts**: `Alt+Shift+T` to toggle display mode, `Alt+Shift+E` to export
- **Dark/light mode** aware styling

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions` (or `edge://extensions` for Edge)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `lost-in-transcription` folder
5. The extension icon will appear in the toolbar

## Configuration

Click the extension icon to open the settings popup:

### Translation Backend

| Backend | API Key Required | Best For |
|---------|-----------------|----------|
| **LibreTranslate** | Optional (free public instances) | Quick start, no account needed |
| **Google Cloud Translation** | Yes | High volume, reliable |
| **DeepL** | Yes (free tier available) | European language quality |
| **OpenAI Compatible** | Optional (not needed for local) | Quebec French / colloquialisms / local LLMs |

Use the **Test Connection** button to verify your backend is reachable and configured correctly.

### Language Settings

- **Source language**: defaults to French (`fr`)
- **Target language**: defaults to English (`en`)
- 12 languages supported including CJK

### Display Modes

- **Inline**: translations appear directly below each caption in the Teams caption pane
- **Side Panel**: a separate scrollable panel appears to the right of the caption area, with speaker labels and timestamps

### Send Frequency

Control how often text is batched and sent for translation:

- **Each update**: sends after each small text change (~300ms debounce), best for fast local models
- **End of sentence**: waits for sentence-ending punctuation or a configurable timeout
- **Stable text**: waits for text to stop changing for ~1.5 seconds
- **Timed batch**: accumulates text for a configurable window (1-15 seconds)

### Export

Export the full transcript at any time:
- **Content**: Original only, Translated only, or Both
- **Formats**: TXT (readable transcript), CSV (spreadsheet), SRT (subtitle file)
- Files are named `transcription-YYYY-MM-DD-HHMM.{ext}`

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

### OpenAI Compatible

Works with OpenAI, Ollama, LM Studio, vLLM, or any endpoint implementing the OpenAI chat completions API.

1. Set the **Endpoint URL** (default: `https://api.openai.com`, Ollama: `http://localhost:11434`, LM Studio: `http://localhost:1234`)
2. Enter an **API key** if required (optional for local endpoints)
3. Click the **refresh** button next to the model field to auto-discover available models, or type a model name manually
4. Optionally customize the **System prompt** for your specific model

## How It Works

The extension uses a `MutationObserver` to watch for Teams caption DOM nodes identified by `data-tid="closed-caption-text"`. When new captions appear or existing ones update (Teams refines text as speech recognition improves), the text is debounced and sent to the configured translation API via the extension's service worker. Translated text is then displayed inline or in the side panel.

The caption list in Teams is virtualized (old entries are recycled), so the extension maintains its own in-memory transcript history for export. Transcript sessions are persisted to `chrome.storage.local` and survive page refreshes, browser restarts, and meeting reconnections.

## Edge Compatibility

This extension works identically in Microsoft Edge — load it via `edge://extensions` with Developer mode enabled.

## License

MIT
