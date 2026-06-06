"use client";

import React, { useState, useEffect, useRef } from "react";

// --- Types ---
type RoomType = "bedroom" | "kitchen" | "living_room" | "pooja_room" | "bathroom";

type ObjectStatus = "good" | "warning" | "critical";

interface VastuObject {
  name: string;
  status: ObjectStatus;
  detected_direction: string;
  vastu_ideal: string;
  reason: string;
  suggestion: string;
}

interface AnalysisResult {
  room_type: string;
  vastu_score: number;
  objects: VastuObject[];
}

interface SectorInfo {
  title: string;
  intro: string;
  ideal: string;
  avoid: string;
}

const SECTOR_DATA: Record<string, SectorInfo> = {
  north: {
    title: "North Sector (Kuber Zone)",
    intro: "Associated with Wealth, Career growth, and new Opportunities. Element: Water.",
    ideal: "Main entrance door, mirrors, water fountains/sinks, clocks, study desk, living room seating.",
    avoid: "Toilets (waste drains), kitchen stoves (fire element clashes with water), heavy wardrobes/storage."
  },
  south: {
    title: "South Sector (Yama Zone)",
    intro: "Associated with Fame, Relaxation, Stability, and peaceful sleep. Element: Fire & Earth.",
    ideal: "Master bed (sleeping head facing South), heavy wardrobes/almirahs, storage rooms, sofa seating.",
    avoid: "Main doors, mirrors (reflects anxiety), water tanks/fountains, Pooja rooms."
  },
  east: {
    title: "East Sector (Indra Zone)",
    intro: "Associated with Health, Vitality, Social Connections, and positive energy. Element: Air & Sun.",
    ideal: "Main entry doors, large ventilation windows, balconies, study desk (facing East), mirrors.",
    avoid: "Toilets, heavy storage structures, clutter, blocking incoming sunlight."
  },
  west: {
    title: "West Sector (Varun Zone)",
    intro: "Associated with Stability, Profits, Business gains, and children's growth. Element: Space.",
    ideal: "Children's beds, dining area setups, toilets, heavy overhead storage tanks.",
    avoid: "Main entrance gates, Pooja room placement, mirrors directly facing the West wall."
  }
};

const ROOM_ELEMENTS: Record<RoomType, { icon: string; name: string; desc: string }> = {
  bedroom: { icon: "🌍", name: "Earth (Prithvi)", desc: "Fosters grounding, stability, and peaceful sleep." },
  kitchen: { icon: "🔥", name: "Fire (Agni)", desc: "Enhances health, cooking energy, and vitality." },
  living_room: { icon: "☁️", name: "Space/Air (Akash/Vayu)", desc: "Supports social interactions and dynamic harmony." },
  pooja_room: { icon: "🙏", name: "Pure Spiritual (Ether)", desc: "Maintains maximum cosmic energy and spiritual peace." },
  bathroom: { icon: "💧", name: "Water/Drainage (Jal)", desc: "Manages negative energy flushing and purification." }
};

export default function Home() {
  // --- Core State ---
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  
  const [uploadedImages, setUploadedImages] = useState<Record<string, string | null>>({
    north: null,
    south: null,
    east: null,
    west: null
  });

  const [loadingProgress, setLoadingProgress] = useState(10);
  const [loadingStatus, setLoadingStatus] = useState("Converting images and packaging API payload...");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // --- UI Detail States ---
  const [animatedScore, setAnimatedScore] = useState(0);
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "critical" | "warning" | "good">("all");
  const [gridMode, setGridMode] = useState<"blueprint" | "purusha">("blueprint");
  
  const [refinementText, setRefinementText] = useState("");
  const [refinementLoading, setRefinementLoading] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // --- Active Web Compass State ---
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [compassHeading, setCompassHeading] = useState(0);
  const [compassDir, setCompassDir] = useState("N");

  // Refs for files
  const fileRefs = {
    north: useRef<HTMLInputElement>(null),
    south: useRef<HTMLInputElement>(null),
    east: useRef<HTMLInputElement>(null),
    west: useRef<HTMLInputElement>(null)
  };

  // --- Helper: Compress and Encode Image ---
  const compressImage = (file: File, maxDim = 800, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (direction: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    try {
      const base64Data = await compressImage(file);
      setUploadedImages((prev) => ({ ...prev, [direction]: base64Data }));
    } catch (err) {
      console.error(err);
      alert("Failed to process image. Please try again.");
    }
  };

  const removeImage = (direction: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedImages((prev) => ({ ...prev, [direction]: null }));
    if (fileRefs[direction as keyof typeof fileRefs].current) {
      fileRefs[direction as keyof typeof fileRefs].current!.value = "";
    }
  };

  // --- Active Compass Logic ---
  const requestCompassPermission = () => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading = null;
      if ("webkitCompassHeading" in event) {
        heading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        heading = 360 - event.alpha;
      }

      if (heading !== null) {
        const roundedHeading = Math.round(heading);
        setCompassHeading(roundedHeading);
        setCompassDir(getCardinalDirection(roundedHeading));
      }
    };

    if (
      typeof window !== "undefined" &&
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((response: string) => {
          if (response === "granted") {
            setCompassEnabled(true);
            window.addEventListener("deviceorientation", handleOrientation, true);
          } else {
            alert("Permission to access compass sensor was denied.");
          }
        })
        .catch((err: any) => {
          console.error(err);
          alert("Error requesting compass permission.");
        });
    } else {
      setCompassEnabled(true);
      const win = window as any;
      if ("ondeviceorientationabsolute" in win) {
        win.addEventListener("deviceorientationabsolute", handleOrientation, true);
      } else if ("ondeviceorientation" in win) {
        win.addEventListener("deviceorientation", handleOrientation, true);
      } else {
        alert("Compass sensor not supported on this browser/device.");
      }
    }
  };

  const getCardinalDirection = (angle: number) => {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round((angle % 360) / 45) % 8;
    return dirs[index];
  };

  // --- API Call: Analyze Room ---
  const startAnalysis = async () => {
    setCurrentStep(3);
    setLoadingProgress(10);
    setLoadingStatus("Transmitting base64 image data to VastuVision AI...");

    const statusMsgs = [
      "Transmitting base64 image data to VastuVision AI...",
      "VastuVision Vision Engine is scanning the North wall image...",
      "Scanning South wall and mapping spatial coordinates...",
      "Parsing East & West objects (bed, stove, doors)...",
      "Cross-checking layouts against Vastu rule engines...",
      "Formatting structured Vastu compliance report..."
    ];

    let progressVal = 10;
    const progressInterval = setInterval(() => {
      if (progressVal < 90) {
        progressVal += 10;
        setLoadingProgress(progressVal);
        const msgIdx = Math.floor(progressVal / 15) % statusMsgs.length;
        setLoadingStatus(statusMsgs[msgIdx]);
      }
    }, 1200);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          room_type: selectedRoom,
          images: uploadedImages
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Server responded with an error");
      }

      const data = await response.json();
      clearInterval(progressInterval);
      setLoadingProgress(100);

      setTimeout(() => {
        setAnalysisResult(data);
        setCurrentStep(4);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      alert(`Analysis Failed: ${err.message}. Please try again.`);
      setCurrentStep(2);
    }
  };

  // --- API Call: Refinement ---
  const submitRefinement = async () => {
    if (!refinementText.trim()) return;
    if (!analysisResult) return;

    setRefinementLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          room_type: selectedRoom,
          previous_analysis: analysisResult,
          correction: refinementText
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Server error during refinement");
      }

      const data = await response.json();
      setAnalysisResult(data);
      setRefinementText("");
    } catch (err: any) {
      console.error(err);
      alert(`Refinement Failed: ${err.message}`);
    } finally {
      setRefinementLoading(false);
    }
  };

  // --- Score Count-Up Animation ---
  useEffect(() => {
    if (currentStep === 4 && analysisResult) {
      const target = analysisResult.vastu_score || 0;
      let start = 0;
      if (target === 0) {
        setAnimatedScore(0);
        return;
      }
      const duration = 1000; // 1 second
      const stepTime = Math.abs(Math.floor(duration / target));
      const timer = setInterval(() => {
        start += 1;
        setAnimatedScore(start);
        if (start >= target) {
          clearInterval(timer);
        }
      }, Math.max(stepTime, 15));

      return () => clearInterval(timer);
    }
  }, [currentStep, analysisResult]);

  // --- Helpers for formatting and items ---
  const getRoomNameFormatted = (room: string) => {
    return room.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getEmojiHelper = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("bed")) return "🛏️";
    if (nameLower.includes("mirror")) return "🪞";
    if (nameLower.includes("desk") || nameLower.includes("table")) return "🖥️";
    if (nameLower.includes("stove") || nameLower.includes("cook") || nameLower.includes("oven")) return "🍳";
    if (nameLower.includes("sink") || nameLower.includes("water") || nameLower.includes("fountain")) return "💧";
    if (nameLower.includes("wardrobe") || nameLower.includes("almirah") || nameLower.includes("storage") || nameLower.includes("closet")) return "🗄️";
    if (nameLower.includes("sofa") || nameLower.includes("couch") || nameLower.includes("seat") || nameLower.includes("chair")) return "🛋️";
    if (nameLower.includes("tv") || nameLower.includes("television")) return "📺";
    if (nameLower.includes("pooja") || nameLower.includes("altar") || nameLower.includes("temple") || nameLower.includes("prayer")) return "🙏";
    if (nameLower.includes("plant")) return "🌿";
    if (nameLower.includes("clock")) return "🕒";
    if (nameLower.includes("toilet") || nameLower.includes("bathroom") || nameLower.includes("seat")) return "🚽";
    if (nameLower.includes("fridge") || nameLower.includes("refrigerator")) return "❄️";
    return "📦";
  };

  const getObjectsForDirection = (dir: string) => {
    if (!analysisResult) return [];
    return (analysisResult.objects || []).filter((obj) => {
      const d = (obj.detected_direction || "").toLowerCase().trim();
      return d.includes(dir);
    });
  };

  const getFilteredObjectsList = () => {
    if (!analysisResult) return [];
    const list = analysisResult.objects || [];
    if (activeFilterTab === "all") return list;
    return list.filter((obj) => obj.status === activeFilterTab);
  };

  const counts = {
    all: analysisResult?.objects?.length || 0,
    critical: (analysisResult?.objects || []).filter((o) => o.status === "critical").length,
    warning: (analysisResult?.objects || []).filter((o) => o.status === "warning").length,
    good: (analysisResult?.objects || []).filter((o) => o.status === "good").length
  };

  const allUploaded = ["north", "south", "east", "west"].every((dir) => uploadedImages[dir] !== null);

  const getScoreColor = (score: number) => {
    if (score < 60) return "var(--status-critical)";
    if (score < 85) return "var(--status-warning)";
    return "var(--status-good)";
  };

  const getScoreDescription = (score: number) => {
    if (score < 60) {
      return "Vastu alignment needs correction. Critical placement violations are causing negative energy blockages.";
    } else if (score < 85) {
      return "Average Vastu compliance. Subtle adjustments can greatly improve the energy flow of your room.";
    }
    return "Optimal Vastu alignment. Your room exhibits excellent spiritual and spatial harmony.";
  };

  const resetAnalysis = () => {
    setSelectedRoom(null);
    setAnalysisResult(null);
    setUploadedImages({ north: null, south: null, east: null, west: null });
    setAnimatedScore(0);
    setActiveFilterTab("all");
    setCompassEnabled(false);
    setCurrentStep(1);
  };

  return (
    <>
      {/* Background decorations */}
      <div className="glow-bg glow-1"></div>
      <div className="glow-bg glow-2"></div>
      <div className="glow-bg glow-3"></div>

      {/* Header */}
      <header className="app-header">
        <div className="container header-container">
          <div className="logo-area">
            <svg className="logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gold-grad)" strokeWidth="2.5" />
              <rect x="25" y="25" width="50" height="50" fill="none" stroke="url(#gold-grad)" strokeWidth="1.5" transform="rotate(45 50 50)" />
              <circle cx="50" cy="50" r="12" fill="url(#gold-grad)" opacity="0.8" />
              <line x1="50" y1="5" x2="50" y2="95" stroke="url(#gold-grad)" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="5" y1="50" x2="95" y2="50" stroke="url(#gold-grad)" strokeWidth="1" strokeDasharray="2 2" />
              <defs>
                <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="logo-text">
              <h1>
                VastuVision <span>AI</span>
              </h1>
              <p className="tagline">Smart Room Analysis & Harmony Guide</p>
            </div>
          </div>
          <div className="status-indicator-bar">
            <a href="/vastuvision.apk" download className="btn btn-download btn-xs">
              <span>📥 Download Android App</span>
            </a>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          {/* Stepper Progress */}
          <div className="stepper">
            <div className={`step ${currentStep >= 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}>
              <div className="step-num">{currentStep > 1 ? "" : "1"}</div>
              <div className="step-label">Select Room</div>
            </div>
            <div className={`step-line ${currentStep > 1 ? "filled" : ""}`}></div>
            <div className={`step ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
              <div className="step-num">{currentStep > 2 ? "" : "2"}</div>
              <div className="step-label">Upload Photos</div>
            </div>
            <div className={`step-line ${currentStep > 2 ? "filled" : ""}`}></div>
            <div className={`step ${currentStep >= 4 ? "active" : ""}`}>
              <div className="step-num">3</div>
              <div className="step-label">Harmony Report</div>
            </div>
          </div>

          {/* STEP 1: ROOM SELECTION */}
          {currentStep === 1 && (
            <section className="step-section active">
              <div className="section-header text-center">
                <h2>Select Room Type</h2>
                <p className="subtitle">
                  Vastu Shastra rules vary significantly depending on the room&apos;s function. Select the room you wish to analyze.
                </p>
              </div>

              <div className="room-selector-grid">
                {(["bedroom", "kitchen", "living_room", "pooja_room", "bathroom"] as RoomType[]).map((room) => {
                  const details = {
                    bedroom: { icon: "🛏️", title: "Bedroom", desc: "Focuses on sleeping direction, relationship harmony, and heavy wardrobe placement." },
                    kitchen: { icon: "🍳", title: "Kitchen", desc: "Evaluates the Fire element (stove), Water element (sink), and gas cylinder locations." },
                    living_room: { icon: "🛋️", title: "Living Room", desc: "Assesses social dynamics, main guest seating, electronics, and positive energy entry." },
                    pooja_room: { icon: "🙏", title: "Pooja Room", desc: "Ensures maximum spiritual purity in the sacred Ishaan (North-East) corner." },
                    bathroom: { icon: "🚿", title: "Bathroom", desc: "Checks placement of drains, toilet seats, and waste vents to counter negative energy." }
                  }[room];

                  return (
                    <div
                      key={room}
                      onClick={() => setSelectedRoom(room)}
                      className={`room-card ${selectedRoom === room ? "selected" : ""}`}
                    >
                      <div className="room-icon">{details.icon}</div>
                      <h3>{details.title}</h3>
                      <p>{details.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="action-footer text-center">
                <button
                  className="btn btn-primary"
                  disabled={!selectedRoom}
                  onClick={() => setCurrentStep(2)}
                >
                  <span>Configure Uploads</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </section>
          )}

          {/* STEP 2: PHOTO UPLOAD */}
          {currentStep === 2 && (
            <section className="step-section active">
              <div className="section-header text-center">
                <h2>Configure {selectedRoom && getRoomNameFormatted(selectedRoom)} Photos</h2>
                <p className="subtitle">
                  Upload one photograph facing each cardinal direction. Ensure rooms are well-lit and objects/furniture are clearly visible.
                </p>
              </div>

              {/* Guided Instruction Box */}
              <div className="capture-guide-box">
                <div className="guide-icon">🧭</div>
                <div className="guide-content">
                  <h4>Compass Guided Capture Guide</h4>
                  <p>To ensure the AI maps your furniture layout accurately, follow these steps:</p>
                  <ol>
                    <li>Stand directly in the <strong>center</strong> of the room.</li>
                    <li>Use your phone&apos;s compass app (or the interactive compass below) to locate each direction.</li>
                    <li>Turn to face that direction and photograph the <strong>entire wall directly in front of you</strong>.</li>
                  </ol>

                  {/* Web Compass Widget */}
                  <div className="web-compass-widget">
                    {!compassEnabled ? (
                      <button className="btn btn-secondary btn-xs" onClick={requestCompassPermission}>
                        <span>Enable Active Compass</span>
                      </button>
                    ) : (
                      <div className="compass-display">
                        <div className="compass-dial-wrapper">
                          <div
                            className="compass-dial"
                            style={{ transform: `rotate(${-compassHeading}deg)` }}
                          >
                            <span className="compass-marker north">N</span>
                            <span className="compass-marker south">S</span>
                            <span className="compass-marker east">E</span>
                            <span className="compass-marker west">W</span>
                            <div className="compass-needle"></div>
                          </div>
                        </div>
                        <div className="compass-reading">
                          <span className="heading-deg">{compassHeading}°</span>
                          <span className="heading-dir">{compassDir}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Directional Uploaders */}
              <div className="direction-uploader-grid">
                {["north", "south", "east", "west"].map((dir) => {
                  const headingText = { north: "0° / 360°", south: "180°", east: "90°", west: "270°" }[dir];
                  return (
                    <div key={dir} className="upload-card">
                      <div className="card-direction">{getRoomNameFormatted(dir)}</div>
                      <div className="card-desc">Stand in center, face {dir.toUpperCase()}, photo the wall</div>
                      
                      <div 
                        className={`drop-zone ${uploadedImages[dir] ? "has-file" : ""}`}
                        onClick={() => fileRefs[dir as keyof typeof fileRefs].current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const files = e.dataTransfer.files;
                          if (files.length > 0) {
                            await handleFileChange(dir, files[0]);
                          }
                        }}
                      >
                        <input
                          type="file"
                          ref={fileRefs[dir as keyof typeof fileRefs]}
                          accept="image/*"
                          className="file-input"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              await handleFileChange(dir, files[0]);
                            }
                          }}
                        />
                        {!uploadedImages[dir] ? (
                          <div className="drop-zone-content">
                            <svg className="upload-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                            </svg>
                            <p className="drag-text">Drag & drop or click</p>
                            <span className="photo-hint">Compass Heading: {headingText}</span>
                          </div>
                        ) : (
                          <div className="preview-container" style={{ display: "block" }}>
                            <img src={uploadedImages[dir] || ""} alt={`${dir} wall preview`} className="preview-img" />
                            <button className="btn-remove-photo" onClick={(e) => removeImage(dir, e)} title="Remove Photo">
                              &times;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="action-footer">
                <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>Change Room</span>
                </button>
                <button
                  className="btn btn-primary btn-glow"
                  disabled={!allUploaded}
                  onClick={startAnalysis}
                >
                  <span>Analyze Room Harmony</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                </button>
              </div>
            </section>
          )}

          {/* STEP 3: LOADING SCREEN */}
          {currentStep === 3 && (
            <section className="step-section active">
              <div className="loader-wrapper text-center">
                <div className="spiritual-loader">
                  <div className="loader-circle outer"></div>
                  <div className="loader-circle middle"></div>
                  <div className="loader-circle inner"></div>
                  <div className="sacred-geometry">⚛️</div>
                </div>
                <h2>Reading the Energy Alignment...</h2>
                <p className="loader-status">{loadingStatus}</p>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }}></div>
                </div>
              </div>
            </section>
          )}

          {/* STEP 4: REPORT AND RESULTS */}
          {currentStep === 4 && analysisResult && (
            <section className="step-section active">
              <div className="results-header">
                <div className="results-header-info">
                  <h2>Vastu Alignment Report</h2>
                  <p className="subtitle">
                    {getRoomNameFormatted(analysisResult.room_type)} Analysis — Harmony Assessment
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={resetAnalysis}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>New Analysis</span>
                </button>
              </div>

              {/* KPI Top Row Cards */}
              <div className="kpi-grid">
                {/* Vastu Score KPI */}
                <div className="kpi-card score-kpi">
                  <h3>Vastu Harmony Score</h3>
                  <div className="score-circle-container">
                    <svg className="score-ring" viewBox="0 0 120 120">
                      <circle className="score-ring-bg" cx="60" cy="60" r="50" />
                      <circle
                        className="score-ring-fill"
                        cx="60"
                        cy="60"
                        r="50"
                        stroke={getScoreColor(analysisResult.vastu_score)}
                        strokeDasharray="314"
                        strokeDashoffset={314 - (314 * animatedScore) / 100}
                      />
                    </svg>
                    <div className="score-text-val">{animatedScore}</div>
                  </div>
                  <p className="score-interpretation">{getScoreDescription(analysisResult.vastu_score)}</p>
                </div>

                {/* Energy Balance KPI */}
                <div className="kpi-card energy-kpi">
                  <h3>Elemental Energy State</h3>
                  {selectedRoom && ROOM_ELEMENTS[selectedRoom] && (
                    <>
                      <div className="energy-icon-box">{ROOM_ELEMENTS[selectedRoom].icon}</div>
                      <div className="energy-details">
                        <h4>{ROOM_ELEMENTS[selectedRoom].name}</h4>
                        <p>{ROOM_ELEMENTS[selectedRoom].desc}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Layout Compliance KPI */}
                <div className="kpi-card breakdown-kpi">
                  <h3>Layout Compliance</h3>
                  <div className="stat-progress-row">
                    <div className="stat-progress-label">
                      Optimal: <span>{counts.good}</span>
                    </div>
                    <div className="stat-progress-bar">
                      <div
                        className="bar-fill good"
                        style={{ width: `${(counts.good / (counts.all || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="stat-progress-row">
                    <div className="stat-progress-label">
                      Warnings: <span>{counts.warning}</span>
                    </div>
                    <div className="stat-progress-bar">
                      <div
                        className="bar-fill warning"
                        style={{ width: `${(counts.warning / (counts.all || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="stat-progress-row">
                    <div className="stat-progress-label">
                      Critical: <span>{counts.critical}</span>
                    </div>
                    <div className="stat-progress-bar">
                      <div
                        className="bar-fill critical"
                        style={{ width: `${(counts.critical / (counts.all || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Diagnostic Workspace */}
              <div className="results-main-layout">
                {/* Left Column: Interactive Map */}
                <div className="results-map-col">
                  <div className="dash-card map-card">
                    <div className="card-header-with-action">
                      <h3>Interactive Room Layout Map</h3>
                      <div className="map-controls">
                        <button
                          className={`map-ctrl-btn ${gridMode === "blueprint" ? "active" : ""}`}
                          onClick={() => setGridMode("blueprint")}
                        >
                          Blueprint
                        </button>
                        <button
                          className={`map-ctrl-btn ${gridMode === "purusha" ? "active" : ""}`}
                          onClick={() => setGridMode("purusha")}
                        >
                          Purusha Mandala
                        </button>
                      </div>
                    </div>
                    <p className="card-hint">Tap on N, S, E, or W to inspect detailed Vastu properties</p>
                    
                    <div className="compass-room-box">
                      <div className="direction-tag north" onClick={() => setSelectedSector("north")}>N</div>
                      <div className="direction-tag south" onClick={() => setSelectedSector("south")}>S</div>
                      <div className="direction-tag east" onClick={() => setSelectedSector("east")}>E</div>
                      <div className="direction-tag west" onClick={() => setSelectedSector("west")}>W</div>

                      <div className="room-floorplan">
                        {gridMode === "purusha" && (
                          <div className="purusha-overlay" style={{ display: "block" }}>
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", opacity: 0.35, pointerEvents: "none" }}>
                              <line x1="33.3" y1="0" x2="33.3" y2="100" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" strokeDasharray="2 2" />
                              <line x1="66.6" y1="0" x2="66.6" y2="100" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" strokeDasharray="2 2" />
                              <line x1="0" y1="33.3" x2="100" y2="33.3" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" strokeDasharray="2 2" />
                              <line x1="0" y1="66.6" x2="100" y2="66.6" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" strokeDasharray="2 2" />

                              <circle cx="85" cy="15" r="8" fill="none" stroke="var(--gold)" strokeWidth="1" />
                              <path d="M 85,15 Q 92,8 85,15 Q 89,21 85,15" stroke="var(--gold)" strokeWidth="0.8" fill="none" />
                              <path d="M 80,20 L 20,80" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" />
                              <path d="M 60,40 Q 30,20 15,15 Q 15,35 40,60" stroke="var(--gold)" strokeWidth="0.8" fill="none" />
                              <path d="M 80,60 Q 95,85 85,85 Q 65,70 60,40" stroke="var(--gold)" strokeWidth="0.8" fill="none" />
                              <path d="M 20,80 Q 15,90 12,88 Q 10,80 20,80" stroke="var(--gold)" strokeWidth="1" fill="none" />
                            </svg>
                          </div>
                        )}
                        
                        <div className="floorplan-cell cell-n" onClick={() => setSelectedSector("north")}>
                          <div className="direction-lbl">North</div>
                          {getObjectsForDirection("north").map((obj, i) => (
                            <div key={i} className={`placed-item-tag ${obj.status}`} title={`${obj.name} (${obj.status})`}>
                              {getEmojiHelper(obj.name)} {obj.name}
                            </div>
                          ))}
                        </div>
                        
                        <div className="floorplan-cell cell-c">Center</div>
                        
                        <div className="floorplan-cell cell-s" onClick={() => setSelectedSector("south")}>
                          <div className="direction-lbl">South</div>
                          {getObjectsForDirection("south").map((obj, i) => (
                            <div key={i} className={`placed-item-tag ${obj.status}`} title={`${obj.name} (${obj.status})`}>
                              {getEmojiHelper(obj.name)} {obj.name}
                            </div>
                          ))}
                        </div>

                        <div className="floorplan-cell cell-e" onClick={() => setSelectedSector("east")}>
                          <div className="direction-lbl">East</div>
                          {getObjectsForDirection("east").map((obj, i) => (
                            <div key={i} className={`placed-item-tag ${obj.status}`} title={`${obj.name} (${obj.status})`}>
                              {getEmojiHelper(obj.name)} {obj.name}
                            </div>
                          ))}
                        </div>

                        <div className="floorplan-cell cell-w" onClick={() => setSelectedSector("west")}>
                          <div className="direction-lbl">West</div>
                          {getObjectsForDirection("west").map((obj, i) => (
                            <div key={i} className={`placed-item-tag ${obj.status}`} title={`${obj.name} (${obj.status})`}>
                              {getEmojiHelper(obj.name)} {obj.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Suggestions & Adjustments */}
                <div className="results-suggestions-col">
                  {/* Filter Tab Bar */}
                  <div className="filter-tab-bar">
                    <button
                      className={`tab-btn ${activeFilterTab === "all" ? "active" : ""}`}
                      onClick={() => setActiveFilterTab("all")}
                    >
                      All Items (<span>{counts.all}</span>)
                    </button>
                    <button
                      className={`tab-btn ${activeFilterTab === "critical" ? "active" : ""}`}
                      onClick={() => setActiveFilterTab("critical")}
                    >
                      Critical (<span>{counts.critical}</span>)
                    </button>
                    <button
                      className={`tab-btn ${activeFilterTab === "warning" ? "active" : ""}`}
                      onClick={() => setActiveFilterTab("warning")}
                    >
                      Warnings (<span>{counts.warning}</span>)
                    </button>
                    <button
                      className={`tab-btn ${activeFilterTab === "good" ? "active" : ""}`}
                      onClick={() => setActiveFilterTab("good")}
                    >
                      Optimal (<span>{counts.good}</span>)
                    </button>
                  </div>

                  {/* Suggestions List */}
                  <div className="suggestions-list">
                    {getFilteredObjectsList().length === 0 ? (
                      <div className="no-items-placeholder">
                        No items found matching the &apos;{activeFilterTab}&apos; compliance level.
                      </div>
                    ) : (
                      getFilteredObjectsList().map((obj, i) => (
                        <div key={i} className="sugg-card">
                          <div className={`sugg-badge ${obj.status}`}>
                            {obj.status === "critical" ? "Critical" : obj.status === "warning" ? "Warning" : "Optimal"}
                          </div>
                          <div className="sugg-info">
                            <div className="sugg-info-row">
                              <h4>{obj.name}</h4>
                              <div className="sugg-pos-details">
                                Detected: <span>{obj.detected_direction}</span> | Ideal: <span>{obj.vastu_ideal}</span>
                              </div>
                            </div>
                            <p className="sugg-reason">{obj.reason}</p>
                            <div className={`sugg-advice-box ${obj.status}`}>
                              <strong>Remedy / Action</strong>
                              {obj.suggestion}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Manual Correction & Refinement Chat */}
              <div className="refinement-section">
                <div className="refinement-header">
                  <h4>💡 Refine Vastu Analysis & Add Manual Adjustments</h4>
                  <p>
                    If the Vision AI misidentified an object or you want to manually configure the layout (e.g. <i>&quot;There is no bed in this room&quot;</i>, <i>&quot;Add a study desk on the North wall&quot;</i>), type your adjustments below.
                  </p>
                </div>
                <div className="refinement-input-row">
                  <textarea
                    placeholder="Describe layout corrections or missing items... e.g. 'Actually, the stove is on the South-East wall' or 'Remove the mirror'..."
                    rows={2}
                    value={refinementText}
                    onChange={(e) => setRefinementText(e.target.value)}
                    disabled={refinementLoading}
                  ></textarea>
                  <button
                    className="btn btn-primary btn-glow"
                    onClick={submitRefinement}
                    disabled={refinementLoading || !refinementText.trim()}
                  >
                    {refinementLoading ? (
                      <>
                        <span>Refining Layout...</span>
                        <svg className="spinner-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spinClockwise 1s linear infinite" }}>
                          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Submit Correction</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* FAQ & Vastu Shastra Guide (SEO/GEO/AEO Optimization) */}
          <section className="faq-section text-center">
            <div className="faq-title-area">
              <h2>Frequently Asked Questions</h2>
              <p>Learn more about Vastu Shastra architectural alignments, spatial layout remedies, and how VastuVision AI works.</p>
            </div>
            <div className="faq-grid">
              <div className="faq-card">
                <h3>What is Vastu Shastra and how does it work?</h3>
                <p>
                  Vastu Shastra is an ancient Indian architectural and spatial planning philosophy. It integrates nature&apos;s elements, directional alignments (using the Earth&apos;s magnetic field), and geometric grids to optimize energy flow (Prana) and harmony in living structures. VastuVision AI automates this layout verification by mapping object orientations relative to coordinates.
                </p>
              </div>
              <div className="faq-card">
                <h3>How does VastuVision AI analyze room layouts?</h3>
                <p>
                  Our app maps room layouts by prompting you to capture photos facing each cardinal wall (North, South, East, West). By matching camera images against orientation logs, our vision model identifies furniture positions (e.g. bed, stove, toilet), processes compliance scores, and flags layout errors with corrective actions.
                </p>
              </div>
              <div className="faq-card">
                <h3>What is the ideal Vastu layout for a bedroom?</h3>
                <p>
                  The master bedroom should ideally reside in the South-West (Nairutya) sector of the home for stability. Beds should face South or East when sleeping. Refrain from sleeping with your head pointing North, which creates electromagnetic friction with the body&apos;s polarity, resulting in poor sleep quality.
                </p>
              </div>
              <div className="faq-card">
                <h3>What are Vastu guidelines for a kitchen layout?</h3>
                <p>
                  A kitchen is associated with the fire element (Agni) and should ideally be placed in the South-East (Agneya) corner. The cooking stove must sit in the South-East of the room, and the cook should face East. Avoid placing the sink (water) adjacent to or facing the stove (fire) to prevent conflicting elements.
                </p>
              </div>
              <div className="faq-card">
                <h3>Can AI-based corrections really fix Vastu errors?</h3>
                <p>
                  Vastu Shastra focuses on spatial positioning. If physical structural renovation is impossible, Vastu recommends non-invasive remedies (e.g., repositioning furniture, placing copper/brass elements, or mirrors). VastuVision AI suggests these placement corrections so you can balance room energy without breaking walls.
                </p>
              </div>
              <div className="faq-card">
                <h3>How do I refine layout items detected by the AI?</h3>
                <p>
                  You can use the Refinement tool at the bottom of the report. Simply type manual inputs (e.g., &quot;Add door on East wall&quot; or &quot;Remove bed&quot;) to re-evaluate compliance instantly. The system will incorporate your feedback and update the scorecard.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer text-center">
        <p>
          &copy; 2026 VastuVision AI. Developed by{" "}
          <a href="https://anuditk.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-bright)", textDecoration: "underline" }}>
            LazZy
          </a>
        </p>
      </footer>

      {/* Interactive Blueprint Sector Info Modal */}
      {selectedSector && SECTOR_DATA[selectedSector] && (
        <div className="modal-overlay active" onClick={() => setSelectedSector(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="modal-close" onClick={() => setSelectedSector(null)}>
              &times;
            </span>
            <div className="modal-header-gold">
              <span className="modal-icon">🧭</span>
              <h3>{SECTOR_DATA[selectedSector].title}</h3>
            </div>
            <div className="modal-body-content">
              <p className="modal-intro">{SECTOR_DATA[selectedSector].intro}</p>
              <div className="modal-guide-details">
                <div className="guide-item good">
                  <strong>Ideal Placements (Positive Energy Flow):</strong>
                  <span>{SECTOR_DATA[selectedSector].ideal}</span>
                </div>
                <div className="guide-item bad">
                  <strong>Avoid Placing (Energy Blockages):</strong>
                  <span>{SECTOR_DATA[selectedSector].avoid}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
