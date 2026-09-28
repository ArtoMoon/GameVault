# ⚔️ MyLoL – Multi-Platform Gaming & Alt-Account Manager Client

<p align="center">
  <img src="public/icon.png" width="128" height="128" alt="MyLoL Logo" style="border-radius: 28px; box-shadow: 0 0 35px rgba(234, 179, 8, 0.4);" />
</p>

<p align="center">
  <b>A sleek, state-of-the-art desktop client and multi-platform gaming hub to track, organize, and manage your alternate gaming accounts across Riot Games, Steam, Epic Games, and custom user-defined platforms.</b>
</p>

<p align="center">
  <a href="https://github.com/ArtoMoon/lolstock/releases"><img src="https://img.shields.io/badge/Release-v0.3.0-gold?style=for-the-badge&logo=github" alt="Release" /></a>
  <img src="https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Electron-Desktop_Client-47848F?style=for-the-badge&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Platform-Multi_Gaming-8B5CF6?style=for-the-badge&logo=steam" alt="Platforms" />
</p>

---

## 🌟 Key Features

### 🎮 1. User-Defined Gaming Platforms
* **Create & Manage Platforms:** Add custom gaming platforms (*Riot Games*, *Steam*, *Epic Games*, *Battle.net*, *Ubisoft*, etc.) directly from the client interface.
* **Custom Aesthetics:** Assign custom emoji icons, brand hex colors, and descriptions to each platform.
* **Nested Game Hubs:** Add unlimited games under any platform (e.g. League of Legends & Valorant under Riot; CS2 & Dota 2 under Steam).

### 🕹️ 2. Zentrarp-Style 2-Tiered Store Hierarchy
* **Tier 1: Platform & Games Portal (`/platform/[platform]`):**
  * Visual platform switcher tabs with live total account counters.
  * Platform hero banner with direct game creation shortcuts.
  * Interactive game cards showcasing description, account metrics, and 1-click access.
* **Tier 2: Dedicated Game Accounts Dashboard (`/platform/[platform]/[game]`):**
  * Focused game command center with quick `← Back to Platform Games` navigation.
  * Compact HUD metric strip: Total, Available, Active, Leveling, Archived, and Ban counts.
  * Advanced real-time search and filter controls.
  * Expandable instant account creation form tailored to the active game.

### 🏷️ 3. Dynamic Categories & Color Tags
* **Custom Category Creator:** Create custom account categories (*Main*, *Smurf*, *Satılık*, *Kasılıyor*, *Dereceli*, etc.).
* **Visual Palette:** Assign custom emoji icons and hex accent colors for instant visual filtering in the table.
* **1-Click Filter Chips:** Filter your account list by category with real-time counts.

### ⚡ 4. Real-Time Riot API & Universal Account Tracking
* **Live Riot Sync:** Summoner Level, Solo/Duo & Flex ranks, LP, and recent match history via modern Riot ID (`GameName#TAG`).
* **Multi-Game Account Support:** Manage credentials, server regions, and notes across all games.
* **Smart Rate-Limit Protection:** Batch sequential sync with 1500ms safety delays and automatic HTTP 429 backoff handling.

### 🌐 5. Multi-Language & Desktop Client Experience
* **i18n Multi-Language:** 1-click instant switching between Turkish (TR 🇹🇷) and English (EN 🇬🇧).
* **Native Desktop Client:**
  * Frameless dark Hextech theme with custom window drag titlebar.
  * System tray minimization — keep MyLoL running silently in the background.
  * Windows NSIS Desktop Setup installer (`.exe`) with auto-shortcuts.

---

## 📥 Download Windows Setup (.exe)

You can download the ready-to-run installer directly from GitHub Releases:

👉 **[Download MyLoL v0.3.0 Windows Setup](https://github.com/ArtoMoon/lolstock/releases/latest)** (`MyLoL-Setup-0.3.0.exe`)

---

## 🚀 Getting Started (Development)

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 or higher recommended)
* [Yarn](https://yarnpkg.com/) package manager
* Local [MongoDB Community Server](https://www.mongodb.com/try/download/community) or MongoDB Atlas URI
* *(Optional)* Riot API Key from the [Riot Games Developer Portal](https://developer.riotgames.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/ArtoMoon/lolstock.git
cd lolstock
```

### 2. Install Dependencies
```bash
yarn install
```

### 3. Database Configuration
By default, the client connects to local MongoDB at `mongodb://localhost:27017/mylol`.
To use a custom MongoDB URI, create a `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/
```
*(No `RIOT_API_KEY` required in `.env.local` — configure and test it directly inside the app on first launch or via **API Key & Ayarlar** in the navbar).*

---

## 💻 Running the Application

### Web Development Mode
```bash
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Desktop Client Mode (Electron + Next.js)
```bash
yarn electron:dev
```
Launches the Next.js server and native Electron desktop window simultaneously with hot-reloading.

### Building Windows Setup Installer (.exe)
```bash
# Builds complete Windows NSIS Setup Installer (.exe):
yarn electron:build:setup

# Builds portable standalone .exe:
yarn electron:build:portable

# Releases and uploads installer to GitHub Release:
yarn release
```
Outputs installer to `dist/MyLoL-Setup-0.3.0.exe`.

---

## 📁 Project Architecture

```text
├── app/
│   ├── accounts/[id]/          # Detailed match history & account analytics view
│   ├── actions/                # Server Actions (accounts.ts, platforms.ts, categories.ts)
│   ├── api/                    # API Route Handlers (/api/sync-accounts, /api/accounts)
│   ├── platform/
│   │   ├── [platform]/         # Level 1: Platform & Games Showcase Portal
│   │   │   └── [game]/         # Level 2: Dedicated Game Accounts Dashboard
│   ├── layout.tsx              # Root layout, fonts & providers
│   └── page.tsx                # Modern Landing Page with live stats
├── components/                 # UI Components
│   ├── PlatformOverview.tsx    # Platform & games catalog view
│   ├── GameAccountsView.tsx    # Dedicated game accounts management view
│   ├── PlatformManagerModal.tsx# Custom platform & game creator modal
│   ├── CategoryManagerModal.tsx# Custom category manager modal
│   ├── AccountTable.tsx        # Search, filters, and accounts data table
│   ├── AddAccountForm.tsx      # Universal dynamic account creator form
│   └── Navbar.tsx              # Desktop titlebar & navigation
├── electron/                   # Electron main process & preload context bridge
├── lib/
│   ├── db/                     # Global cached Mongoose connection
│   ├── i18n/                   # Language context & translations (TR / EN)
│   └── riot/                   # Modular Riot API client (account, summoner, rank, matches)
├── models/                     # MongoDB Mongoose Schemas (Account, Platform, Category)
├── scripts/                    # Build, standalone packaging & release uploaders
└── package.json
```

---

## ⚖️ Legal Disclaimer

*MyLoL isn’t endorsed by Riot Games, Valve, Epic Games, or any other game publisher and doesn’t reflect their views or opinions. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.*

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
