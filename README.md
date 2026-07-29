# RESPONDY

An AI-powered communication coaching desktop app that analyzes messenger conversations and suggests context-aware replies.


---

## 🚀 About

Text-based communication is now a daily default on platforms like KakaoTalk, Instagram DM, and SMS.  
However, text alone often loses tone, intention, and emotional nuance, which can increase stress in sensitive conversations.

RESPONDY was built to reduce that burden.  
Instead of auto-sending messages, it acts as a communication coach: it analyzes conversation context and emotional signals, then recommends natural, practical replies that fit the situation.

---

## ✨ Features

- **Real-time Conversation Analysis**
  - Detects new messages from a selected screen region using OCR
  - Analyzes emotional flow and conversational intent
  - Recommends multiple reply drafts

- **Manual Input Analysis**
  - Lets users enter custom situations and messages directly
  - Runs the same analysis pipeline without requiring a live messenger screen

- **AI Chat Practice**
  - Simulates conversation with persona-based tone and style
  - Helps users rehearse responses before real conversations

- **My Page**
  - Manages analysis history and persona profiles
  - Supports profile-based personalized coaching

---

## 🛠 Tech Stack

- **Frontend**
  - Electron
  - Nextron (Next.js + Electron)
  - React
  - Tailwind CSS

- **Backend**
  - Django REST API
  - Google Gemini API integration

- **Database**
  - Backend-managed relational DB (configured in Django)
  - Electron local storage (`electron-store`) for client runtime settings

- **Cloud**
  - API server hosting environment (project-specific)
  - (Optional) Supabase integration modules in repository

---

## 🏗 Architecture

![RESPONDY Architecture](./architecture.png)

---

## 📸 Screenshots

> Add screenshots here.

- Home
- Real-time Analysis
- Manual Input
- AI Chat
- My Page

---

## 📂 Folder Structure

```txt
main/                     # Electron main process
  background.ts
  services/
  region-picker.html

renderer/                 # Nextron/Next.js renderer (UI)
  app/
  styles/
  lib/

shared/                   # Shared types between main and renderer

scripts/                  # Build/helper scripts
resources/                # App icons and build assets
```

---

## ⚙️ Installation

### Requirements

- Node.js 20+
- macOS or Windows
- Running Django API server (`API_BASE_URL`)

### Local Development

```bash
cp .env.example .env
# set API_BASE_URL in .env or .env.local
npm install
npm run dev
```

### Build

```bash
# macOS package
npm run build

# Windows .exe (from macOS or Windows)
npx electron-builder --win --x64
```

Build outputs are generated in `dist/`.

---

## 💡 Challenges

- Building stable OCR-based real-time detection in real messenger environments
- Reducing duplicate analysis/API calls while keeping response latency low
- Translating raw conversation data into practical, human-sounding reply coaching
- Handling UX edge cases in region selection, session state, and error recovery

---

## 📈 Improvements

- Better multi-platform messenger support (beyond current primary flow)
- Stronger persona memory for long-term conversation continuity
- Improved retry/fallback strategy for backend failures
- Security hardening and production auth flow cleanup
- Optional analytics dashboard for communication pattern insights
