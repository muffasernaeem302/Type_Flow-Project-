# TypeFlow ⚡

> **A distraction-free, offline-first typing speed test desktop application for Windows, macOS, and Linux.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build & Release](https://github.com/typeflow/typeflow-desktop/actions/workflows/build.yml/badge.svg)](https://github.com/typeflow/typeflow-desktop/actions)

---

## 📸 Screenshots

| Home & Mode Selection | Live Test View |
| :---: | :---: |
| *(Screenshot: Difficulty & Duration selection with Personal Best Ribbon)* | *(Screenshot: Character passage with glowing caret & circular gauge)* |

| Results & Chart.js Telemetry | History & Leaderboard Matrix |
| :---: | :---: |
| *(Screenshot: Speed progression line chart with confetti award)* | *(Screenshot: 50-test log, CSV export, and PB matrix)* |

---

## ✨ Features

- **⚡ Zero-Latency Typing Engine**: Pure, deterministic character-by-character validation that updates instantly on every keystroke.
- **🏎️ Real-Time Ghost Pace Car**: An interactive neon ghost racer tracking your **Personal Best** or custom target speed (60, 80, 100 WPM) so you can visually see whether you are ahead or behind your record.
- **🎯 Multiple Test Modes**:
  - **Time Sprint**: Fixed duration trials (15s, 30s, 60s, 120s).
  - **Words Drill**: Word count sprints (10, 25, 50, 100 common English words).
  - **Zen Mode**: Relaxed, unhurried typing with no time limit—finish with `Shift + Enter`.
  - **Custom Code Snippets**: Real-world programming syntax practice (TypeScript, Python, Rust, SQL, HTML/CSS) or paste your own custom paragraphs.
- **🔍 Weak Keys & Hesitation Heatmap**: Real-time tracking of problem keys, showing error frequencies and finger accuracy recommendations on the Results screen.
- **🔊 Multi-Profile Switch Acoustics**:
  - **Clicky Mechanical**: Crisp tactile click (Cherry MX Blue/Brown style).
  - **Vintage Typewriter**: Metallic clatter with an authentic carriage-return bell at completion.
  - **Linear Thock**: Deep, creamy acoustic body for lubed switch enthusiasts.
  - **Soft Keystroke**: Minimal subdued taps.
  - **Muted**: 100% silent.
- **🎯 Precision Metrics**:
  - **Net WPM**: Standard normalized words-per-minute formula deducting uncorrected errors.
  - **Raw WPM**: Gross typing speed across all keystrokes.
  - **Accuracy %**: Precise character accuracy percentage.
  - **Consistency %**: Statistical standard deviation and variance metric assessing speed stability.
- **📊 Second-by-Second Telemetry**: High-contrast interactive telemetry curve powered by **Chart.js**, mapping speed cadence and error moments.
- **💾 Offline-First Storage**: Zero cloud dependencies or telemetry trackers; persists last 50 tests and personal best records locally.
- **📁 CSV Data Export**: Export complete typing session history as a structured CSV spreadsheet at any time.
- **🎨 Cyberpunk Neon Aesthetic & Dual Themes**: Dark purple canvas with glowing cyan (`#00f5d4`) and magenta (`#f72585`) accents, plus full support for Studio Light and System Default modes.
- **🕶️ Focus Mode**: Auto-hides top bars, navigation links, and window chrome during active typing runs.
- **⌨️ Customizable Carets**: Select between Line, Block Box, or Underline styles with smooth pulsing animations.
- **⌨️ Keyboard Shortcuts Overlay**: Instant cheat sheet accessible anytime by pressing `?` or clicking the Help icon in the header.

---

## 🛠️ Tech Stack

- **Desktop Framework**: Electron with TypeScript
- **Renderer**: Vite + React 19, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Telemetry Charts**: Chart.js (bundled via npm)
- **Audio**: Web Audio API oscillator synthesis
- **Testing**: Vitest (pure engine & stats unit tests), Playwright (E2E browser tests)
- **Packaging**: electron-builder (Windows NSIS, macOS DMG, Linux AppImage)

---

## 🏗️ Architecture Overview

```
typeflow-desktop/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts           # App lifecycle, window creation, single-instance lock
│   │   ├── ipc.ts            # Validated IPC message router
│   │   ├── store.ts          # electron-store JSON persistence wrapper
│   │   └── menu.ts           # Native OS menu with global shortcuts
│   ├── preload/
│   │   └── preload.ts        # Secure contextBridge API bridge (contextIsolation: true)
│   ├── shared/
│   │   └── types.ts          # Shared TypeScript interfaces & types
│   ├── engine/
│   │   └── typing.ts         # Pure typing logic (no DOM / Electron dependencies)
│   ├── stats/
│   │   └── metrics.ts        # Pure formulas (Net WPM, Raw WPM, accuracy, consistency)
│   ├── audio/
│   │   └── synth.ts          # Pure Web Audio switch synthesizer
│   ├── data/
│   │   └── texts.ts          # 30+ curated passages across Easy, Medium, Hard
│   └── ui/                   # React presentation layer
│       ├── components/       # Header, Caret, CountdownGauge, TelemetryChart
│       ├── views/            # HomeView, TestView, ResultsView, HistoryView, SettingsModal
│       └── bridge.ts         # Dual runtime bridge (Electron IPC + Web preview fallback)
├── tests/
│   ├── unit/                 # Vitest unit test suites
│   └── e2e/                  # Playwright end-to-end specifications
├── electron-builder.yml      # Multi-platform installer definitions
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or 22+
- npm 9+

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/typeflow/typeflow-desktop.git
cd typeflow-desktop

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:3000` to interact with the application.

---

## 🧪 Testing

```bash
# Run all unit tests (Typing Engine & Metrics)
npm run test:unit

# Run Playwright end-to-end test suite
npm run test:e2e
```

---

## 📦 Building Desktop Installers

To package TypeFlow into standalone native desktop installers using `electron-builder`:

```bash
# Compile and package for current host OS
npm run package

# Package for specific targets:
npm run package:win     # Windows: TypeFlow Setup.exe (NSIS Installer)
npm run package:mac     # macOS: TypeFlow.dmg (Universal x64/arm64)
npm run package:linux   # Linux: TypeFlow.AppImage and .deb
```

Distribution installers will be placed inside the `release/` directory.

---

## 📐 How Metrics Are Calculated

### 1. Net Words Per Minute (Net WPM)
$$\text{Net WPM} = \max\left(0, \frac{\text{Correct Characters} / 5}{\text{Elapsed Minutes}}\right)$$
*Following international typing competition standards, 5 characters constitute one word.*

### 2. Raw Words Per Minute (Raw WPM)
$$\text{Raw WPM} = \frac{\text{Total Keystrokes Typed} / 5}{\text{Elapsed Minutes}}$$

### 3. Accuracy Percentage
$$\text{Accuracy (\%)} = \left(\frac{\text{Correct Characters}}{\text{Total Keystrokes Typed}}\right) \times 100\%$$

### 4. Consistency Percentage
$$\text{Consistency (\%)} = \max\left(0, \min\left(100, (1 - \text{Coefficient of Variation}) \times 100\right)\right)$$
*Calculated using the standard deviation across second-by-second WPM snapshots.*

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Enter` | Start Test with currently selected passage | Home View |
| `Ctrl / Cmd + N` | New Test with a random passage | Global |
| `Ctrl / Cmd + R` | Restart current test or retry passage | Global |
| `Ctrl / Cmd + H` | Toggle History & Leaderboards view | Global |
| `Ctrl / Cmd + ,` | Open Settings & Preferences modal | Global |
| `Esc` | Cancel active test or return to Home | Global |
| `Backspace` | Undo previous character and update live stats | Mid-Test |

---

## 🗺️ Roadmap

- [x] Character-by-character typing engine with backspace support
- [x] Chart.js second-by-second telemetry curve
- [x] Synthesized mechanical keyboard acoustics (Web Audio API)
- [x] Offline storage for last 50 tests and personal bests
- [x] CSV export of test sessions
- [x] Multi-platform packaging (Windows NSIS, macOS DMG, Linux AppImage)
- [ ] Custom user passage import (.txt / .md)
- [ ] Multiplayer ghost racer mode via WebRTC

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
