# SmartLine AI - Second Line Business Phone App

A modern VoIP application that provides users with second phone numbers for business use, powered by AI features for smart call handling and messaging.

## Features

- 🔢 Virtual phone numbers (US, UK, Canada)
- 📞 VoIP calling with CallKit integration
- 💬 SMS/MMS messaging
- 🤖 AI-powered features (voicemail transcription, smart replies)
- 🔒 Privacy-focused design
- 💳 Flexible pricing plans

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Redis
- **iOS**: Swift, CallKit, PushKit
- **VoIP Provider**: Plivo
- **Deployment**: Render.com
- **AI**: OpenAI API

## Getting Started

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run migrate:dev
npm run dev
```

### iOS Setup

```bash
cd ios
pod install
open SmartLineAI.xcworkspace
```

## Deployment

This project is configured for deployment on Render.com using the included `render.yaml` file.

1. Push to GitHub
2. Connect to Render.com
3. Deploy using Blueprint

## License

MIT License