# YASEEN-MYS-MD WhatsApp Bot

A powerful WhatsApp bot built with Baileys and Express.js

## Features

- 🤖 AI Commands (GPT, Claude, Gemini, etc.)
- 🎵 Music Download (JioSaavn API)
- 🎨 Image Commands (Anime, Waifu, etc.)
- 😂 Fun Commands (Compatibility, Roast, etc.)
- 👥 Group Management (Kick, Ban, Antilink, etc.)
- 🔥 Auto React System
- 📱 QR Code Scanner
- 💾 Status Saver

## Installation

```bash
npm install
```

## Configuration

1. Set environment variable:
   - `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com)

2. Update bot config in `index.js`:
   - `OWNER_NAME` - Your name
   - `OWNER_NUMBER` - Your WhatsApp number (92XXXXXXXXXX format)
   - `BOT_NAME` - Bot name
   - `PREFIX` - Command prefix (default: `.`)

## Running

```bash
npm start
```

## Deployment

Deploy on Railway, Render, Cyclic, or any Node.js hosting.

## Commands

- `.menu` - Show all commands
- `.alive` - Check bot status
- `.ping` - Speed test
- `.owner` - Owner info
- `.play <song>` - Download song
- `.sticker` - Convert image to sticker
- `.save` - Save status
- `.antilink on/off` - Enable/disable antilink
- `.welcome on/off` - Enable/disable welcome messages
- `.tagall` - Tag all members
- `.gpt35 <question>` - Ask AI
- And many more...

## License

MIT

## Author

YASEEN-MYS

