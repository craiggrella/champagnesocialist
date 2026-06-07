# 🥂 Champagne Socialist Translator

Transform any text into how a champagne socialist would say it.

## Setup

### 1. Get a Groq API Key
- Go to https://console.groq.com
- Sign up (free)
- Create an API key
- Copy it

### 2. Install Dependencies
```bash
npm install
```

### 3. Create `.env` File
Copy `.env.example` to `.env` and add your Groq API key:
```
GROQ_API_KEY=your_key_here
PORT=3000
```

### 4. Run the App
```bash
npm start
```

Open http://localhost:3000 in your browser.

## How It Works

1. Type text (max 500 characters)
2. Click "Transform & Read"
3. It uses Groq's free API to transform your text into champagne socialist speak
4. The app reads it aloud using your browser's text-to-speech
5. Copy the result or hear it again

## Features

- **Free**: Uses Groq's free tier (no credit card needed)
- **Fast**: Groq's API is quick
- **Text-to-Speech**: Built-in browser audio
- **No Server Hosting**: Runs locally on your machine
- **Character Limit**: Keeps responses snappy

## API Limits

Groq's free tier is generous but does have limits. If you hit them, the app will show an error. Just wait a bit and try again.
