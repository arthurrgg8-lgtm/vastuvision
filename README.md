# VastuVision AI

**VastuVision AI** is a premium hybrid web and Android system designed to analyze room layouts and assess their alignment with traditional **Vastu Shastra** (ancient Indian architectural system) guidelines. By leveraging artificial intelligence (Groq Vision API), the application evaluates room layouts from wall photographs and provides detailed harmony reports, visual 2D grid representations, and actionable remedies.

---

## 🌟 Key Features

### 💻 Web Dashboard
*   **Immersive Glassmorphic Design:** Sleek, responsive, modern dark-themed user interface matching the premium design standard.
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

*   **Backend:** Python 3 (built-in HTTP server, logging, and robust JSON parser wrappers).
*   **Web Frontend:** HTML5, CSS3 (custom CSS design system with micro-animations), and Vanilla JavaScript.
*   **Android App:** Kotlin, ConstraintLayout, CameraX library, and Material Components.
*   **AI Engine:** Groq API (Llama Vision model for visual layout mapping and text LLMs for Vastu refinement).

---

## 🚀 Getting Started

### 1. Backend Server Setup

1.  Clone this repository to your local machine.
2.  Set your Groq API Key as an environment variable:
    ```bash
    export GROQ_API_KEY="your-groq-api-key"
    ```
3.  Run the Python server:
    ```bash
    python3 server.py
    ```
4.  Open your browser and navigate to `http://localhost:9091/`.

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
│   ├── app/src/main/res/    # UI resources (layouts, drawables, colors, themes)
│   └── gradlew              # Gradle compilation script
├── public/                  # Web dashboard static assets
│   ├── index.html           # Main dashboard layout
│   ├── style.css            # Custom glassmorphic CSS rules
│   ├── app.js               # Frontend orchestration logic
│   └── vastuvision.apk      # Compiled Android app download target
├── server.py                # Python HTTP Server and API router
├── test_api.py              # Test script for API communication
└── README.md                # Project documentation
```

---

## 👨‍💻 Credits
Developed by **LazZy** ([anuditk.vercel.app](https://anuditk.vercel.app))
