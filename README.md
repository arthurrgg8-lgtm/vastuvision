# VastuVision AI

**VastuVision AI** is a premium hybrid web and Android system designed to analyze room layouts and assess their alignment with traditional **Vastu Shastra** (ancient Indian architectural system) guidelines. By leveraging artificial intelligence (Groq Vision API), the application evaluates room layouts from wall photographs and provides detailed harmony reports, visual 2D grid representations, and actionable remedies.

---

## 🌟 Key Features

### 💻 Web Dashboard (Next.js)
*   **Premium Glassmorphic Design:** Sleek, responsive, modern dark-themed user interface matching the premium design standard.
*   **Next.js 16 & TypeScript:** Built with modern React Server Components, App Router, and strict type safety.
*   **Dual Analysis Modes:** 
    *   *Upload Panel:* Upload images of room walls (North, South, East, West) directly for quick parsing.
    *   *Refinement Engine:* Type corrections or refinements (e.g., "Remove the bed", "Moving the desk to the South") to dynamically update the report.
*   **2D Floorplan Visualizer:** Interactive grid displaying detected items dynamically oriented across cardinal directions.
*   **Harmony Scorecard:** Radial harmony score indicating room compliance percentage.

### 📱 Android Application
*   **Guided Shutter Scanner:** A camera workflow prompting the user to sequentially photograph all four walls.
*   **In-App Compass Widget:** Active orientation tracking that ensures photos are captured facing exact cardinal directions.
*   **Dynamic Results View:** Mobile-optimized dark interface showing suggestions, badged status severity (Critical, Warning, Good), and Vastu remedies.

---

## 🛠️ Technology Stack

*   **Backend / API:** Python 3 serverless functions running on Vercel (`api/analyze.py`) & local fallback daemon (`server.py`).
*   **Web Frontend:** Next.js 16 (App Router), TypeScript, and Vanilla CSS variables design system.
*   **Android App:** Kotlin, ConstraintLayout, CameraX library, and Material Components.
*   **AI Engine:** Groq API (Llama Vision model for visual layout mapping and text LLMs for Vastu refinement).

---

## 🚀 Getting Started

### 1. Web Frontend & Dev Proxy Setup

1.  Clone this repository to your local machine.
2.  Install packages:
    ```bash
    npm install
    ```
3.  Set your Groq API Key as an environment variable:
    ```bash
    export GROQ_API_KEY="your-groq-api-key"
    ```
4.  Start the Python backend daemon (runs on `http://localhost:9091` and acts as the mock/active API provider):
    ```bash
    python3 server.py
    ```
5.  In another terminal, start the Next.js development server (runs on `http://localhost:3000` and automatically proxies `/api/*` requests to the daemon):
    ```bash
    npm run dev
    ```
6.  Open your browser and navigate to `http://localhost:3000/`.

### 2. Android App Compilation

To compile and build the Android application package (`.apk`):

1.  Navigate to the `android-app` directory:
    ```bash
    cd android-app
    ```
2.  Compile the release/debug build using the Gradle wrapper:
    ```bash
    chmod +x gradlew
    ./gradlew assembleDebug
    ```
3.  The compiled APK will be generated at:
    `app/build/outputs/apk/debug/app-debug.apk`

---

## 📐 Project Structure

```text
├── android-app/             # Native Android client app sources
├── api/                     # Serverless functions
│   └── analyze.py           # Production Python Vastu API handler
├── public/                  # Static assets & android download target
│   ├── favicon.svg          # Logo icon
│   └── vastuvision.apk      # Compiled Android app download target
├── src/                     # Next.js Application Source
│   └── app/                 # Next.js App Router Pages & Components
│       ├── page.tsx         # Main VastuVision Dashboard page
│       ├── layout.tsx       # Root layout & Google Fonts integration
│       └── globals.css      # Custom glassmorphic CSS rules
├── next.config.ts           # Next.js rewrite dev configurations
├── tsconfig.json            # TypeScript configuration
├── package.json             # NPM project scripts & dependencies
├── server.py                # Local Python development server daemon
├── test_api.py              # Test script for API communication
└── README.md                # Project documentation
```

---

## 👨‍💻 Credits
Developed by **LazZy** ([anuditk.vercel.app](https://anuditk.vercel.app))
