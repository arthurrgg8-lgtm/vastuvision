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

const SECTOR_DATA_EN: Record<string, SectorInfo> = {
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

const SECTOR_DATA_NE: Record<string, SectorInfo> = {
  north: {
    title: "उत्तर क्षेत्र (कुबेर क्षेत्र)",
    intro: "धन, करियरको वृद्धि र नयाँ अवसरहरूसँग सम्बन्धित। तत्व: जल।",
    ideal: "मुख्य प्रवेशद्वार, ऐना, पानीको फोहोरा/सिंक, घडी, पढ्ने टेबल, बैठक कोठाको बस्ने व्यवस्था।",
    avoid: "शौचालय (ढल निकास), भान्साको चुलो (अग्नि तत्व र जल तत्वको टकराव), गह्रौं दराज/भण्डारण।"
  },
  south: {
    title: "दक्षिण क्षेत्र (यम क्षेत्र)",
    intro: "यश, आराम, स्थिरता र शान्त निद्रासँग सम्बन्धित। तत्व: अग्नि र पृथ्वी।",
    ideal: "मुख्य ओछ्यान (सुत्दा टाउको दक्षिण तर्फ फर्केको), गह्रौं दराज/दराज, भण्डारण कोठा, सोफा व्यवस्था।",
    avoid: "मुख्य ढोका, ऐना (चिन्ता बढाउँछ), पानी ट्याङ्की/फोहोरा, पूजा कोठा।"
  },
  east: {
    title: "पूर्व क्षेत्र (इन्द्र क्षेत्र)",
    intro: "स्वास्थ्य, जीवन्तता, सामाजिक सम्बन्ध र सकारात्मक ऊर्जासँग सम्बन्धित। तत्व: वायु र सूर्य।",
    ideal: "मुख्य प्रवेशद्वारहरू, ठूला भेन्टिलेसन झ्यालहरू, बाल्कोनीहरू, पढ्ने टेबल (पूर्व तर्फ फर्केको), ऐना।",
    avoid: "शौचालय, गह्रौं संरचना, फोहोरमैला, बिहानीको घाम रोक्ने वस्तुहरू।"
  },
  west: {
    title: "पश्चिम क्षेत्र (वरुण क्षेत्र)",
    intro: "स्थिरता, नाफा, व्यापारिक लाभ र बालबालिकाको वृद्धिसँग सम्बन्धित। तत्व: आकाश।",
    ideal: "बालबालिकाको ओछ्यान, भोजन क्षेत्र, शौचालय, गह्रौं ओभरहेड पानी ट्याङ्की।",
    avoid: "मुख्य प्रवेशद्वार, पूजा कोठा, पश्चिम भित्ता तर्फ सिधै फर्किएको ऐना।"
  }
};

const ROOM_ELEMENTS_EN: Record<RoomType, { icon: string; name: string; desc: string }> = {
  bedroom: { icon: "🌍", name: "Earth (Prithvi)", desc: "Fosters grounding, stability, and peaceful sleep." },
  kitchen: { icon: "🔥", name: "Fire (Agni)", desc: "Enhances health, cooking energy, and vitality." },
  living_room: { icon: "☁️", name: "Space/Air (Akash/Vayu)", desc: "Supports social interactions and dynamic harmony." },
  pooja_room: { icon: "🙏", name: "Pure Spiritual (Ether)", desc: "Maintains maximum cosmic energy and spiritual peace." },
  bathroom: { icon: "💧", name: "Water/Drainage (Jal)", desc: "Manages negative energy flushing and purification." }
};

const ROOM_ELEMENTS_NE: Record<RoomType, { icon: string; name: string; desc: string }> = {
  bedroom: { icon: "🌍", name: "पृथ्वी तत्व", desc: "स्थिरता, शान्ति र राम्रो निद्रालाई बढावा दिन्छ।" },
  kitchen: { icon: "🔥", name: "अग्नि तत्व", desc: "स्वास्थ्य, खाना पकाउने ऊर्जा र जीवन्तता बढाउँछ।" },
  living_room: { icon: "☁️", name: "वायु/आकाश तत्व", desc: "सामाजिक अन्तरक्रिया र गतिशील सद्भावलाई समर्थन गर्दछ।" },
  pooja_room: { icon: "🙏", name: "शुद्ध आध्यात्मिक (आकाश)", desc: "अधिकतम आध्यात्मिक ऊर्जा र शान्ति कायम राख्छ।" },
  bathroom: { icon: "💧", name: "जल/ढल निकास", desc: "नकारात्मक ऊर्जा सफा र शुद्धीकरण गर्न मद्दत गर्दछ।" }
};

const TRANSLATIONS = {
  english: {
    appTitle: "VastuVision AI",
    tagline: "Smart Room Analysis & Harmony Guide",
    downloadApp: "Download Android App",
    stepSelectRoom: "Select Room",
    stepUploadPhotos: "Upload Photos",
    stepHarmonyReport: "Harmony Report",
    selectRoomHeader: "Select Room Type",
    selectRoomSubtitle: "Vastu Shastra rules vary significantly depending on the room's function. Select the room you wish to analyze.",
    configureUploads: "Configure Uploads",
    configurePhotosHeader: "Configure Photos",
    configurePhotosSubtitle: "Upload one photograph facing each cardinal direction. Ensure rooms are well-lit and objects/furniture are clearly visible.",
    compassGuideHeader: "Compass Guided Capture Guide",
    compassGuideSub: "To ensure the AI maps your furniture layout accurately, follow these steps:",
    compassStep1: "Stand directly in the center of the room.",
    compassStep2: "Use your phone's compass app (or the interactive compass below) to locate each direction.",
    compassStep3: "Turn to face that direction and photograph the entire wall directly in front of you.",
    enableCompass: "Enable Active Compass",
    changeRoom: "Change Room",
    analyzeRoom: "Analyze Room Harmony",
    readingEnergy: "Reading the Energy Alignment...",
    reportTitle: "Vastu Alignment Report",
    newAnalysis: "New Analysis",
    scoreTitle: "Vastu Harmony Score",
    energyTitle: "Elemental Energy State",
    layoutTitle: "Layout Compliance",
    interactiveMap: "Interactive Room Layout Map",
    blueprint: "Blueprint",
    purusha: "Purusha Mandala",
    mapHint: "Tap on N, S, E, or W to inspect detailed Vastu properties",
    all: "All Items",
    critical: "Critical",
    warning: "Warning",
    warnings: "Warnings",
    optimal: "Optimal",
    noItemsMatching: "No items found matching the compliance level.",
    remedyTitle: "Remedy / Action",
    detected: "Detected",
    ideal: "Ideal",
    center: "Center",
    refineHeader: "💡 Refine Vastu Analysis & Add Manual Adjustments",
    refineDescription: "If the Vision AI misidentified an object or you want to manually configure the layout (e.g. \"There is no bed in this room\", \"Add a study desk on the North wall\"), type your adjustments below.",
    refinePlaceholder: "Describe layout corrections or missing items... e.g. 'Actually, the stove is on the South-East wall' or 'Remove the mirror'...",
    submitCorrection: "Submit Correction",
    refiningLayout: "Refining Layout...",
    faqTitle: "Frequently Asked Questions",
    faqSub: "Learn more about Vastu Shastra architectural alignments, spatial layout remedies, and how VastuVision AI works.",
    compassDeg: "Compass Heading",
    dragDropText: "Drag & drop or click",
    bedroom: "Bedroom",
    kitchen: "Kitchen",
    living_room: "Living Room",
    pooja_room: "Pooja Room",
    bathroom: "Bathroom",
    bedroomDesc: "Focuses on sleeping direction, relationship harmony, and heavy wardrobe placement.",
    kitchenDesc: "Evaluates the Fire element (stove), Water element (sink), and gas cylinder locations.",
    living_roomDesc: "Assesses social dynamics, main guest seating, electronics, and positive energy entry.",
    pooja_roomDesc: "Ensures maximum spiritual purity in the sacred Ishaan (North-East) corner.",
    bathroomDesc: "Checks placement of drains, toilet seats, and waste vents to counter negative energy.",
    north: "North",
    south: "South",
    east: "East",
    west: "West",
    cardinalDesc: "Stand in center, face direction, photo the wall",
    faqList: [
      {
        q: "What is Vastu Shastra and how does it work?",
        a: "Vastu Shastra is an ancient Indian architectural and spatial planning philosophy. It integrates nature's elements, directional alignments (using the Earth's magnetic field), and geometric grids to optimize energy flow (Prana) and harmony in living structures."
      },
      {
        q: "How does VastuVision AI analyze room layouts?",
        a: "Our app maps room layouts by prompting you to capture photos facing each cardinal wall (North, South, East, West). By matching camera images against orientation logs, our vision model identifies furniture positions, processes compliance scores, and flags layout errors with corrective actions."
      },
      {
        q: "What is the ideal Vastu layout for a bedroom?",
        a: "The master bedroom should ideally reside in the South-West (Nairutya) sector of the home for stability. Beds should face South or East when sleeping. Refrain from sleeping with your head pointing North, which creates electromagnetic friction with the body's polarity."
      },
      {
        q: "What are Vastu guidelines for a kitchen layout?",
        a: "A kitchen is associated with the fire element (Agni) and should ideally be placed in the South-East (Agneya) corner. The cooking stove must sit in the South-East of the room, and the cook should face East. Avoid placing the water sink adjacent to or facing the stove."
      },
      {
        q: "Can AI-based corrections really fix Vastu errors?",
        a: "Vastu Shastra focuses on spatial positioning. If physical structural renovation is impossible, Vastu recommends non-invasive remedies (e.g. repositioning furniture, placing copper/brass elements, or mirrors). VastuVision AI suggests these placement corrections so you can balance room energy without breaking walls."
      },
      {
        q: "How do I refine layout items detected by the AI?",
        a: "You can use the Refinement tool at the bottom of the report. Simply type manual inputs (e.g., 'Add door on East wall' or 'Remove bed') to re-evaluate compliance instantly. The system will incorporate your feedback and update the scorecard."
      }
    ]
  },
  nepali: {
    appTitle: "वास्तुभिजन AI",
    tagline: "स्मार्ट कोठा विश्लेषण र सद्भाव गाइड",
    downloadApp: "Download Android App",
    stepSelectRoom: "कोठा चयन",
    stepUploadPhotos: "फोटो अपलोड",
    stepHarmonyReport: "सद्भाव रिपोर्ट",
    selectRoomHeader: "कोठाको प्रकार चयन गर्नुहोस्",
    selectRoomSubtitle: "कोठाको कार्य अनुसार वास्तु शास्त्रका नियमहरू फरक हुन्छन्। तपाईंले विश्लेषण गर्न चाहेको कोठा चयन गर्नुहोस्।",
    configureUploads: "अपलोडहरू कन्फिगर गर्नुहोस्",
    configurePhotosHeader: "फोटोहरू कन्फिगर गर्नुहोस्",
    configurePhotosSubtitle: "प्रत्येक दिशा तर्फ फर्किएर एक-एक फोटो अपलोड गर्नुहोस्। कोठामा पर्याप्त उज्यालो हुनुपर्छ र वस्तुहरू स्पष्ट देखिनुपर्छ।",
    compassGuideHeader: "कम्पास निर्देशित क्याप्चर गाइड",
    compassGuideSub: "एआईले तपाईंको फर्निचर लेआउट सही रूपमा नक्साङ्कन गर्न यी चरणहरू पालना गर्नुहोस्:",
    compassStep1: "कोठाको ठीक बीचमा उभिनुहोस्।",
    compassStep2: "प्रत्येक दिशा पत्ता लगाउन आफ्नो फोनको कम्पास एप (वा तलको कम्पास) प्रयोग गर्नुहोस्।",
    compassStep3: "त्यस दिशा तर्फ फर्कनुहोस् र आफ्नो ठीक अगाडिको सम्पूर्ण भित्ताको फोटो खिच्नुहोस्।",
    enableCompass: "कम्पास सक्रिय गर्नुहोस्",
    changeRoom: "कोठा परिवर्तन",
    analyzeRoom: "कोठाको सद्भाव विश्लेषण गर्नुहोस्",
    readingEnergy: "ऊर्जाको सन्तुलन पढ्दै...",
    reportTitle: "वास्तु सन्तुलन रिपोर्ट",
    newAnalysis: "नयाँ विश्लेषण",
    scoreTitle: "वास्तु सद्भाव स्कोर",
    energyTitle: "पञ्चतत्व ऊर्जा अवस्था",
    layoutTitle: "लेआउट अनुपालन",
    interactiveMap: "इन्टरएक्टिभ कोठा लेआउट नक्सा",
    blueprint: "नक्सा (ब्लुप्रिन्ट)",
    purusha: "पुरुष मण्डल",
    mapHint: "विस्तृत वास्तु गुणहरू हेर्न N, S, E, वा W मा ट्याप गर्नुहोस्",
    all: "सबै वस्तुहरू",
    critical: "गम्भीर त्रुटि",
    warning: "चेतावनी",
    warnings: "चेतावनीहरू",
    optimal: "उत्तम",
    noItemsMatching: "यस अनुपालन स्तरसँग मिल्ने कुनै चीजहरू फेला परेनन्।",
    remedyTitle: "वास्तु उपाय / उपाय",
    detected: "पत्ता लागेको",
    ideal: "आदर्श",
    center: "ब्रह्मस्थान (Center)",
    refineHeader: "💡 वास्तु विश्लेषण परिमार्जन गर्नुहोस् र म्यानुअल समायोजनहरू थप्नुहोस्",
    refineDescription: "यदि एआईले कुनै वस्तु गलत पहिचान गरेमा वा तपाईं म्यानुअल रूपमा लेआउट कन्फिगर गर्न चाहनुहुन्छ भने (जस्तै 'यस कोठामा ओछ्यान छैन', 'उत्तर भित्तामा पढ्ने टेबल थप्नुहोस्'), तल आफ्ना समायोजनहरू टाइप गर्नुहोस्।",
    refinePlaceholder: "लेआउट सुधारहरू वा छुटेका वस्तुहरू वर्णन गर्नुहोस्... जस्तै 'वास्तवमा, चुलो दक्षिण-पूर्व भित्तामा छ' वा 'ऐना हटाउनुहोस्'...",
    submitCorrection: "सुधार पेश गर्नुहोस्",
    refiningLayout: "लेआउट परिमार्जन गर्दै...",
    faqTitle: "बारम्बार सोधिने प्रश्नहरू",
    faqSub: "वास्तु शास्त्रको ऊर्जा सन्तुलन, कोठाको व्यवस्थापन र वास्तुभिजन एआई कसरी काम गर्छ भन्ने बारे थप जान्नुहोस्।",
    compassDeg: "कम्पास डिग्री",
    dragDropText: "तान्नुहोस् र छोड्नुहोस् वा क्लिक गर्नुहोस्",
    bedroom: "सुत्ने कोठा (बेडरुम)",
    kitchen: "भान्सा कोठा (किचेन)",
    living_room: "बैठक कोठा (लिभिङ रुम)",
    pooja_room: "पूजा कोठा (पूजा रुम)",
    bathroom: "शौचालय (बाथरुम)",
    bedroomDesc: "सुत्ने दिशा, आपसी सम्बन्धको सामंजस्यता, र गह्रौं दराजको स्थानान्तरणमा ध्यान केन्द्रित गर्दछ।",
    kitchenDesc: "अग्नि तत्व (चुलो), जल तत्व (सिंक), र ग्यास सिलिन्डरको स्थानको मूल्याङ्कन गर्दछ।",
    living_roomDesc: "सामाजिक सम्बन्ध, मुख्य अतिथि बस्ने ठाउँ, इलेक्ट्रोनिक्स, र सकारात्मक ऊर्जा प्रवेशको मूल्याङ्कन गर्दछ।",
    pooja_roomDesc: "पवित्र ईशान (उत्तर-पूर्व) कोणमा अधिकतम आध्यात्मिक शुद्धता सुनिश्चित गर्दछ।",
    bathroomDesc: "नकारात्मक ऊर्जा कम गर्न ढल, शौचालय सिट र निकासको स्थान जाँच गर्दछ।",
    north: "उत्तर (North)",
    south: "दक्षिण (South)",
    east: "पूर्व (East)",
    west: "पश्चिम (West)",
    cardinalDesc: "बीचमा उभिनुहोस्, दिशा सामना गर्नुहोस्, र भित्ताको फोटो खिच्नुहोस्",
    faqList: [
      {
        q: "वास्तु शास्त्र के हो र यसले कसरी काम गर्छ?",
        a: "वास्तु शास्त्र एक प्राचीन हिन्दु वास्तुकला र योजना दर्शन हो। यसले प्रकृति, दिशात्मक सन्तुलन (पृथ्वीको चुम्बकीय क्षेत्र प्रयोग गरेर) र ज्यामितीय ग्रिडहरूलाई एकीकृत गरी बस्ने ठाउँहरूमा ऊर्जा प्रवाह (प्राण) र सद्भावलाई अनुकूलन गर्छ।"
      },
      {
        q: "वास्तुभिजन एआईले कोठाको लेआउट कसरी विश्लेषण गर्छ?",
        a: "हाम्रो एपले कोठाको ठीक बीचबाट चारै दिशा (उत्तर, दक्षिण, पूर्व, पश्चिम) तर्फ फर्किएर खिचेका फोटोहरू स्क्यान गर्छ र दिशा सेन्सरसँग मिलान गरी फर्निचरहरूको स्थिति र वास्तु अनुपालन स्कोर मूल्याङ्कन गर्छ।"
      },
      {
        q: "वास्तु शास्त्र अनुसार सुत्ने कोठा (बेडरुम) को लेआउट कस्तो हुनुपर्छ?",
        a: "सुत्ने कोठा घरको दक्षिण-पश्चिम (नैऋत्य) कोणमा हुनु उत्तम मानिन्छ। सुत्दा टाउको सधैं दक्षिण वा पूर्व तर्फ हुनुपर्छ। उत्तर तर्फ टाउको राखेर कहिल्यै सुत्नु हुँदैन, यसले निद्रा र स्वास्थ्यमा बाधा पुर्‍याउँछ।"
      },
      {
        q: "भान्सा कोठा (किचेन) को लागि वास्तु नियमहरू के हुन्?",
        a: "भान्सा कोठा सधैं अग्नि तत्वको दिशा दक्षिण-पूर्व (आग्नेय) कोणमा हुनुपर्छ। खाना पकाउने चुलो दक्षिण-पूर्वमा हुनुपर्छ र पकाउने व्यक्तिको अनुहार पूर्व तर्फ हुनुपर्छ। पानीको सिंक (जल) र चुलो (अग्नि) लाई कहिल्यै सँगै राख्नु हुँदैन।"
      },
      {
        q: "के एआई-आधारित सुधारहरूले वास्तवमै वास्तु दोषहरू समाधान गर्न सक्छन्?",
        a: "वास्तु शास्त्रले मुख्य रूपमा कोठाको फर्निचर व्यवस्थापनमा जोड दिन्छ। यदि भौतिक रूपमा घर भत्काउन सम्भव छैन भने, फर्निचरको सही व्यवस्थापन, ऐनाको सही प्रयोग वा केही साधारण उपायहरूबाट वास्तु दोष कम गर्न सकिन्छ।"
      },
      {
        q: "एआईले पहिचान गरेका फर्निचरहरू कसरी परिमार्जन गर्ने?",
        a: "तपाईंले रिपोर्टको तल रहेको 'म्यानुअल सुधार' च्याट बक्समा गएर आफ्नो कोठाको फर्निचर परिमार्जन गर्न सक्नुहुन्छ (जस्तै: 'ऐना हटाउनुहोस्' वा 'उत्तर भित्तामा पढ्ने टेबल थप्नुहोस्')। एआईले सोही अनुसार रिपोर्ट र स्कोर तुरुन्त अपडेट गर्नेछ।"
      }
    ]
  }
};


export default function Home() {
  // --- Core State ---
  const [activeLanguage, setActiveLanguage] = useState<"english" | "nepali">("english");
  const [showLanding, setShowLanding] = useState(true);
  const [hudPhase, setHudPhase] = useState(0);
  const [hudComplianceScore, setHudComplianceScore] = useState(40);
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

  const t = (key: keyof typeof TRANSLATIONS.english) => {
    return (TRANSLATIONS[activeLanguage] as any)[key] || (TRANSLATIONS.english as any)[key];
  };

  const sectorData = activeLanguage === "english" ? SECTOR_DATA_EN : SECTOR_DATA_NE;
  const roomElements = activeLanguage === "english" ? ROOM_ELEMENTS_EN : ROOM_ELEMENTS_NE;

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
          images: uploadedImages,
          language: activeLanguage
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
          correction: refinementText,
          language: activeLanguage
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
        setTimeout(() => setAnimatedScore(0), 0);
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

  // --- Landing HUD Animation Effect ---
  useEffect(() => {
    if (!showLanding) return;
    const interval = setInterval(() => {
      setHudPhase((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, [showLanding]);

  useEffect(() => {
    if (!showLanding) return;
    if (hudPhase === 2) {
      let start = 40;
      const target = 85;
      const stepTime = 35;
      const timer = setInterval(() => {
        start += 3;
        if (start >= target) {
          start = target;
          clearInterval(timer);
        }
        setHudComplianceScore(start);
      }, stepTime);
      return () => clearInterval(timer);
    } else {
      setTimeout(() => setHudComplianceScore(40), 0);
    }
  }, [hudPhase, showLanding]);

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

  if (showLanding) {
    return (
      <>
        {/* Background decorations */}
        <div className="glow-bg glow-1"></div>
        <div className="glow-bg glow-2"></div>
        <div className="glow-bg glow-3"></div>

        <div className="landing-page-wrapper">
          <header className="landing-header">
            <div className="container header-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="logo-area" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <svg className="logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: "36px", height: "36px" }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gold-grad-hero)" strokeWidth="2.5" />
                  <rect x="25" y="25" width="50" height="50" fill="none" stroke="url(#gold-grad-hero)" strokeWidth="1.5" transform="rotate(45 50 50)" />
                  <circle cx="50" cy="50" r="12" fill="url(#gold-grad-hero)" opacity="0.8" />
                  <line x1="50" y1="5" x2="50" y2="95" stroke="url(#gold-grad-hero)" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="5" y1="50" x2="95" y2="50" stroke="url(#gold-grad-hero)" strokeWidth="1" strokeDasharray="2 2" />
                  <defs>
                    <linearGradient id="gold-grad-hero" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffd700" />
                      <stop offset="100%" stopColor="#b8860b" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="logo-text">
                  <h1 style={{ fontSize: "1.25rem", fontWeight: "700" }}>
                    {t("appTitle")} <span style={{ color: "var(--gold-bright)", fontSize: "0.8rem", verticalAlign: "super" }}>AI</span>
                  </h1>
                </div>
              </div>
              <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.6)", padding: "2px", borderRadius: "8px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
                  <button
                    onClick={() => setActiveLanguage("english")}
                    style={{
                      background: activeLanguage === "english" ? "var(--primary)" : "transparent",
                      color: activeLanguage === "english" ? "#fff" : "#94a3b8",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                      transition: "all 0.2s"
                    }}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setActiveLanguage("nepali")}
                    style={{
                      background: activeLanguage === "nepali" ? "var(--primary)" : "transparent",
                      color: activeLanguage === "nepali" ? "#fff" : "#94a3b8",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                      transition: "all 0.2s"
                    }}
                  >
                    नेपाली
                  </button>
                </div>
                <a href="/vastuvision.apk" download className="btn btn-download btn-xs" style={{ textDecoration: "none" }}>
                  <span>📥 {activeLanguage === "english" ? "Download App" : "डाउनलोड एप"}</span>
                </a>
              </div>
            </div>
          </header>

          <section className="landing-hero-section">
            <div className="container hero-container">
              <div className="hero-text-side">
                <span className="hero-badge">
                  ✨ {activeLanguage === "english" ? "Next-Gen Spatial Vastu Shastra Analytics" : "अर्को पुस्ताको वास्तु शास्त्र विश्लेषण"}
                </span>
                <h2>
                  {activeLanguage === "english" ? "Unlock the Natural Harmony of Your Home" : "तपाईंको घरको प्राकृतिक सद्भाव पत्ता लगाउनुहोस्"}
                </h2>
                <p>
                  {activeLanguage === "english" 
                    ? "VastuVision AI combines traditional Vastu Shastra architectural principles with advanced computer vision to analyze room layouts, furniture alignments, and energy currents, providing instant remedies for ultimate peace and prosperity."
                    : "वास्तुभिजन एआईले आधुनिक कम्प्युटर भिजन र परम्परागत वास्तु शास्त्र सिद्धान्तहरू मिलाएर कोठाको सजावट, फर्निचरको स्थिति र ऊर्जा प्रवाहको विश्लेषण गर्दछ र पूर्ण शान्ति र समृद्धिका लागि तत्कालै वास्तु उपायहरू प्रदान गर्दछ।"}
                </p>
                
                <div className="hero-cta-area">
                  <button className="btn btn-primary btn-lg btn-glow" onClick={() => setShowLanding(false)}>
                    <span>{activeLanguage === "english" ? "Begin Space Analysis" : "स्थान विश्लेषण सुरु गर्नुहोस्"}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "8px", verticalAlign: "middle" }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <a href="/vastuvision.apk" download className="btn btn-secondary btn-lg" style={{ textDecoration: "none" }}>
                    <span>📥 {activeLanguage === "english" ? "Download Android App" : "एन्ड्रोइड एप डाउनलोड गर्नुहोस्"}</span>
                  </a>
                </div>
              </div>

              <div className="hero-animation-side" style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
                <div className="vastu-hero-illustrator">
                  <div className="illustrator-ring ring-outer"></div>
                  <div className="illustrator-ring ring-middle"></div>
                  <div className="illustrator-ring ring-inner"></div>
                  
                  <div className="vastu-mandala-grid">
                    <div className="grid-axis axis-h"></div>
                    <div className="grid-axis axis-v"></div>
                    <div className="grid-diagonal diag-1"></div>
                    <div className="grid-diagonal diag-2"></div>
                    <div className="grid-scanner"></div>

                    <span className="cardinal-lbl lbl-n">{t("north")}</span>
                    <span className="cardinal-lbl lbl-s">{t("south")}</span>
                    <span className="cardinal-lbl lbl-e">{t("east")}</span>
                    <span className="cardinal-lbl lbl-w">{t("west")}</span>

                    <div className="aligning-furniture element-bed" title="Bed -> SW">🛏️</div>
                    <div className="aligning-furniture element-stove" title="Stove -> SE">🍳</div>
                    <div className="aligning-furniture element-altar" title="Altar -> NE">🙏</div>
                    <div className="aligning-furniture element-water" title="Water -> NW">💧</div>
                  </div>

                  <div className="illustrator-center-core">
                    <span className="core-symbol">🧭</span>
                  </div>
                </div>

                {/* HUD Live System Demo Card */}
                <div className="system-hud-card">
                  <div className="hud-header">
                    <span className="hud-live-tag">
                      <span className="hud-pulse-dot"></span>
                      {activeLanguage === "english" ? "Live Simulation" : "लाइभ सिम्युलेसन"}
                    </span>
                    <span className="hud-step-indicator">
                      {activeLanguage === "english" ? `Step ${hudPhase + 1} of 4` : `चरण ${hudPhase + 1} / 4`}
                    </span>
                  </div>

                  <div className="hud-phase-info">
                    <h4 className="hud-phase-title">
                      {hudPhase === 0 && (activeLanguage === "english" ? "1. Spatial Boundary Scan" : "१. कोठा र दिशा स्क्यानिङ")}
                      {hudPhase === 1 && (activeLanguage === "english" ? "2. Furniture Orientation Mapping" : "२. फर्निचर र दिशा पहिचान")}
                      {hudPhase === 2 && (activeLanguage === "english" ? "3. Harmony Score Calculation" : "३. वास्तु अनुकूलता स्कोर")}
                      {hudPhase === 3 && (activeLanguage === "english" ? "4. Remedy Generation" : "४. वास्तु उपाय निर्धारण")}
                    </h4>
                    <p className="hud-phase-desc">
                      {hudPhase === 0 && (activeLanguage === "english" 
                        ? "AI processes room photographs and links camera coordinates with compass direction angles."
                        : "एआईले कम्पासको दिशासँग फोटोहरू मिलाएर कोठाको चौतर्फी सिमाना विश्लेषण गर्छ।")}
                      {hudPhase === 1 && (activeLanguage === "english"
                        ? "Object detection identifies furniture and positions them in the cardinal blueprint layout."
                        : "फर्निचर र भौतिक वस्तुहरू पत्ता लगाई ३डी कोठाको लेआउटमा स्थानान्तरण गरिन्छ।")}
                      {hudPhase === 2 && (activeLanguage === "english"
                        ? "Applying ancient Vastu element matrices (Agni, Ishaan) to calculate layout compliance."
                        : "पञ्चतत्व र प्राचीन वास्तुशास्त्रका नियम अनुसार कोठाको अनुपालन स्कोर गणना गरिन्छ।")}
                      {hudPhase === 3 && (activeLanguage === "english"
                        ? "Remedy algorithms generate placement corrections to balance energy currents without rebuilding."
                        : "विना कुनै भौतिक तोडफोड, कोठाको ऊर्जा सुधार्न उपयुक्त उपायहरू तयार पारिन्छ।")}
                    </p>
                  </div>

                  <div className="hud-visual-display">
                    {hudPhase === 0 && (
                      <>
                        <div className="hud-scan-frame"></div>
                        <div className="hud-scan-line"></div>
                        <div className="hud-compass-badge">
                          <span style={{ fontSize: "2rem" }}>🧭</span>
                          <span className="hud-compass-value">
                            {activeLanguage === "english" ? "Scanning East (90°)" : "पूर्व दिशा स्क्यानिङ (९०°)"}
                          </span>
                        </div>
                      </>
                    )}

                    {hudPhase === 1 && (
                      <div className="hud-mapping-list">
                        <div className="hud-mapping-item detected">
                          <span>🛏️ {activeLanguage === "english" ? "Master Bed (South-West)" : "बेड (दक्षिण-पश्चिम)"}</span>
                          <span className="hud-status-badge done">✓ {activeLanguage === "english" ? "Mapped" : "पत्ता लाग्यो"}</span>
                        </div>
                        <div className="hud-mapping-item">
                          <span>🍳 {activeLanguage === "english" ? "Stove (North-West)" : "चुलो (उत्तर-पश्चिम)"}</span>
                          <span className="hud-status-badge scanning">{activeLanguage === "english" ? "Analyzing..." : "जाँच हुँदै..."}</span>
                        </div>
                      </div>
                    )}

                    {hudPhase === 2 && (
                      <div className="hud-score-display">
                        <div className="hud-score-ring" style={{ "--hud-score-pct": hudComplianceScore } as any}>
                          <span className="hud-score-val">{hudComplianceScore}%</span>
                        </div>
                        <div className="hud-score-meta">
                          <span className="hud-score-label">{activeLanguage === "english" ? "Compliance Score" : "सद्भाव स्कोर"}</span>
                          <span className="hud-score-grade">
                            {hudComplianceScore < 60 ? (activeLanguage === "english" ? "Evaluating..." : "मूल्याङ्कन हुँदै...") : (activeLanguage === "english" ? "✓ Balanced Energy" : "✓ सन्तुलित ऊर्जा")}
                          </span>
                        </div>
                      </div>
                    )}

                    {hudPhase === 3 && (
                      <div className="hud-remedies-list">
                        <div className="hud-remedy-item">
                          <span className="hud-remedy-icon">💡</span>
                          <span className="hud-remedy-txt">
                            {activeLanguage === "english" 
                              ? "Move stove to South-East (Agneya) corner to balance the Fire element."
                              : "अग्नि तत्व सन्तुलन गर्न चुलो दक्षिण-पूर्व कुनामा सार्नुहोस्।"}
                          </span>
                        </div>
                        <div className="hud-remedy-item">
                          <span className="hud-remedy-icon">🌿</span>
                          <span className="hud-remedy-txt">
                            {activeLanguage === "english"
                              ? "Place a green plant in North-East to boost health energy flow."
                              : "सकारात्मक ऊर्जाका लागि उत्तर-पूर्व कुनामा हरियो बिरुवा राख्नुहोस्।"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="workflow-info-section">
            <div className="container">
              <h3 className="workflow-title text-center">
                {activeLanguage === "english" ? "How VastuVision AI Works" : "वास्तुभिजन एआईले कसरी काम गर्छ"}
              </h3>
              <div className="workflow-steps-grid">
                <div className="workflow-step-card">
                  <div className="step-num-icon">1</div>
                  <h4>{activeLanguage === "english" ? "Select & Upload" : "कोठा रोज्नुहोस् र फोटो हाल्नुहोस्"}</h4>
                  <p>
                    {activeLanguage === "english"
                      ? "Choose a room (Bedroom, Kitchen, Pooja Room) and upload wall photos facing each cardinal direction."
                      : "कोठाको प्रकार रोजेर चारै दिशा तर्फ फर्किएर खिचेका फोटोहरू अपलोड वा स्क्यान गर्नुहोस्।"}
                  </p>
                </div>
                <div className="workflow-step-card">
                  <div className="step-num-icon">2</div>
                  <h4>{activeLanguage === "english" ? "AI Spatial Analysis" : "एआई लेआउट स्क्यान"}</h4>
                  <p>
                    {activeLanguage === "english"
                      ? "Advanced Vision models map room coordinates and check placement configurations against Vastu rules."
                      : "हाम्रो एआई मोडेलले कोठाका फर्निचरहरूको सही दिशा पत्ता लगाई पञ्चतत्व र ऊर्जा सन्तुलन जाँच गर्छ।"}
                  </p>
                </div>
                <div className="workflow-step-card">
                  <div className="step-num-icon">3</div>
                  <h4>{activeLanguage === "english" ? "Get Remedies & Refine" : "उपाय प्राप्त गर्नुहोस् र सच्याउनुहोस्"}</h4>
                  <p>
                    {activeLanguage === "english"
                      ? "Review compliance scores, download blueprints, and write manual corrections to refine alignments instantly."
                      : "वास्तु अनुपालन स्कोर र नक्सा हेर्नुहोस् र म्यानुअल सुधारहरू च्याट मार्फत तुरुन्तै अपडेट गर्नुहोस्।"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <footer className="landing-footer text-center">
            <p>
              &copy; 2026 VastuVision AI. Developed by{" "}
              <a href="https://anuditk.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-bright)", textDecoration: "underline" }}>
                LazZy
              </a>
            </p>
          </footer>
        </div>
      </>
    );
  }

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
                {t("appTitle")} <span>AI</span>
              </h1>
              <p className="tagline">{t("tagline")}</p>
            </div>
          </div>
          <div className="status-indicator-bar" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.6)", padding: "2px", borderRadius: "8px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
              <button
                onClick={() => setActiveLanguage("english")}
                style={{
                  background: activeLanguage === "english" ? "var(--primary)" : "transparent",
                  color: activeLanguage === "english" ? "#fff" : "#94a3b8",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "600",
                  transition: "all 0.2s"
                }}
              >
                EN
              </button>
              <button
                onClick={() => setActiveLanguage("nepali")}
                style={{
                  background: activeLanguage === "nepali" ? "var(--primary)" : "transparent",
                  color: activeLanguage === "nepali" ? "#fff" : "#94a3b8",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "600",
                  transition: "all 0.2s"
                }}
              >
                नेपाली
              </button>
            </div>
            <a href="/vastuvision.apk" download className="btn btn-download btn-xs">
              <span>📥 {activeLanguage === "english" ? "Download App" : "डाउनलोड एप"}</span>
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
              <div className="step-label">{t("stepSelectRoom")}</div>
            </div>
            <div className={`step-line ${currentStep > 1 ? "filled" : ""}`}></div>
            <div className={`step ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
              <div className="step-num">{currentStep > 2 ? "" : "2"}</div>
              <div className="step-label">{t("stepUploadPhotos")}</div>
            </div>
            <div className={`step-line ${currentStep > 2 ? "filled" : ""}`}></div>
            <div className={`step ${currentStep >= 4 ? "active" : ""}`}>
              <div className="step-num">3</div>
              <div className="step-label">{t("stepHarmonyReport")}</div>
            </div>
          </div>

          {/* STEP 1: ROOM SELECTION */}
          {currentStep === 1 && (
            <section className="step-section active">
              <div className="section-header text-center">
                <h2>{t("selectRoomHeader")}</h2>
                <p className="subtitle">
                  {t("selectRoomSubtitle")}
                </p>
              </div>

              <div className="room-selector-grid">
                {(["bedroom", "kitchen", "living_room", "pooja_room", "bathroom"] as RoomType[]).map((room) => {
                  const details = {
                    bedroom: { icon: "🛏️", title: t("bedroom"), desc: t("bedroomDesc") },
                    kitchen: { icon: "🍳", title: t("kitchen"), desc: t("kitchenDesc") },
                    living_room: { icon: "🛋️", title: t("living_room"), desc: t("living_roomDesc") },
                    pooja_room: { icon: "🙏", title: t("pooja_room"), desc: t("pooja_roomDesc") },
                    bathroom: { icon: "🚿", title: t("bathroom"), desc: t("bathroomDesc") }
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
                  <span>{t("configureUploads")}</span>
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
                <h2>{t("configurePhotosHeader")} ({selectedRoom ? t(selectedRoom) : ""})</h2>
                <p className="subtitle">
                  {t("configurePhotosSubtitle")}
                </p>
              </div>

              {/* Guided Instruction Box */}
              <div className="capture-guide-box">
                <div className="guide-icon">🧭</div>
                <div className="guide-content">
                  <h4>{t("compassGuideHeader")}</h4>
                  <p>{t("compassGuideSub")}</p>
                  <ol>
                    <li>{t("compassStep1")}</li>
                    <li>{t("compassStep2")}</li>
                    <li>{t("compassStep3")}</li>
                  </ol>

                  {/* Web Compass Widget */}
                  <div className="web-compass-widget">
                    {!compassEnabled ? (
                      <button className="btn btn-secondary btn-xs" onClick={requestCompassPermission}>
                        <span>{t("enableCompass")}</span>
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
                      <div className="card-direction">{activeLanguage === "english" ? getRoomNameFormatted(dir) : t(dir as any)}</div>
                      <div className="card-desc">{t("cardinalDesc")}</div>
                      
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
                            <p className="drag-text">{t("dragDropText")}</p>
                            <span className="photo-hint">{t("compassDeg")}: {headingText}</span>
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
                  <span>{t("changeRoom")}</span>
                </button>
                <button
                  className="btn btn-primary btn-glow"
                  disabled={!allUploaded}
                  onClick={startAnalysis}
                >
                  <span>{t("analyzeRoom")}</span>
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
                <h2>{t("readingEnergy")}</h2>
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
                  <h2>{t("reportTitle")}</h2>
                  <p className="subtitle">
                    {selectedRoom ? t(selectedRoom) : ""} {activeLanguage === "english" ? "Analysis — Harmony Assessment" : "विश्लेषण — सद्भाव मूल्याङ्कन"}
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={resetAnalysis}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>{t("newAnalysis")}</span>
                </button>
              </div>

              {/* KPI Top Row Cards */}
              <div className="kpi-grid">
                {/* Vastu Score KPI */}
                <div className="kpi-card score-kpi">
                  <h3>{t("scoreTitle")}</h3>
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
                  <p className="score-interpretation">
                    {activeLanguage === "english" ? getScoreDescription(analysisResult.vastu_score) : (
                      analysisResult.vastu_score < 60 ? "वास्तु सन्तुलन सुधार आवश्यक छ। गम्भीर दोषहरूले गर्दा ऊर्जा अवरुद्ध भएको छ।" :
                      analysisResult.vastu_score < 85 ? "मध्यम वास्तु अनुपालन। स-साना सुधारहरूले कोठाको ऊर्जा प्रवाहमा ठूलो सुधार ल्याउनेछन्।" :
                      "उत्कृष्ट वास्तु सन्तुलन। तपाईंको कोठामा आध्यात्मिक र भौतिक सद्भाव राम्रो छ।"
                    )}
                  </p>
                </div>

                {/* Energy Balance KPI */}
                <div className="kpi-card energy-kpi">
                  <h3>{t("energyTitle")}</h3>
                  {selectedRoom && roomElements[selectedRoom] && (
                    <>
                      <div className="energy-icon-box">{roomElements[selectedRoom].icon}</div>
                      <div className="energy-details">
                        <h4>{roomElements[selectedRoom].name}</h4>
                        <p>{roomElements[selectedRoom].desc}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Layout Compliance KPI */}
                <div className="kpi-card breakdown-kpi">
                  <h3>{t("layoutTitle")}</h3>
                  <div className="stat-progress-row">
                    <div className="stat-progress-label">
                      {t("optimal")}: <span>{counts.good}</span>
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
                      {t("warnings")}: <span>{counts.warning}</span>
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
                      {t("critical")}: <span>{counts.critical}</span>
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
                      <h3>{t("interactiveMap")}</h3>
                      <div className="map-controls">
                        <button
                          className={`map-ctrl-btn ${gridMode === "blueprint" ? "active" : ""}`}
                          onClick={() => setGridMode("blueprint")}
                        >
                          {t("blueprint")}
                        </button>
                        <button
                          className={`map-ctrl-btn ${gridMode === "purusha" ? "active" : ""}`}
                          onClick={() => setGridMode("purusha")}
                        >
                          {t("purusha")}
                        </button>
                      </div>
                    </div>
                    <p className="card-hint">{t("mapHint")}</p>
                    
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
                          <div className="direction-lbl">{t("north")}</div>
                          {getObjectsForDirection("north").map((obj, i) => (
                            <div key={i} className={`placed-item-tag ${obj.status}`} title={`${obj.name} (${obj.status})`}>
                              {getEmojiHelper(obj.name)} {obj.name}
                            </div>
                          ))}
                        </div>
                        
                        <div className="floorplan-cell cell-c">{t("center")}</div>
                        
                        <div className="floorplan-cell cell-s" onClick={() => setSelectedSector("south")}>
                          <div className="direction-lbl">{t("south")}</div>
                          {getObjectsForDirection("south").map((obj, i) => (
                            <div key={i} className={`placed-item-tag ${obj.status}`} title={`${obj.name} (${obj.status})`}>
                              {getEmojiHelper(obj.name)} {obj.name}
                            </div>
                          ))}
                        </div>

                        <div className="floorplan-cell cell-e" onClick={() => setSelectedSector("east")}>
                          <div className="direction-lbl">{t("east")}</div>
                          {getObjectsForDirection("east").map((obj, i) => (
                            <div key={i} className={`placed-item-tag ${obj.status}`} title={`${obj.name} (${obj.status})`}>
                              {getEmojiHelper(obj.name)} {obj.name}
                            </div>
                          ))}
                        </div>

                        <div className="floorplan-cell cell-w" onClick={() => setSelectedSector("west")}>
                          <div className="direction-lbl">{t("west")}</div>
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
                      {t("all")} (<span>{counts.all}</span>)
                    </button>
                    <button
                      className={`tab-btn ${activeFilterTab === "critical" ? "active" : ""}`}
                      onClick={() => setActiveFilterTab("critical")}
                    >
                      {t("critical")} (<span>{counts.critical}</span>)
                    </button>
                    <button
                      className={`tab-btn ${activeFilterTab === "warning" ? "active" : ""}`}
                      onClick={() => setActiveFilterTab("warning")}
                    >
                      {t("warnings")} (<span>{counts.warning}</span>)
                    </button>
                    <button
                      className={`tab-btn ${activeFilterTab === "good" ? "active" : ""}`}
                      onClick={() => setActiveFilterTab("good")}
                    >
                      {t("optimal")} (<span>{counts.good}</span>)
                    </button>
                  </div>

                  {/* Suggestions List */}
                  <div className="suggestions-list">
                    {getFilteredObjectsList().length === 0 ? (
                      <div className="no-items-placeholder">
                        {t("noItemsMatching")}
                      </div>
                    ) : (
                      getFilteredObjectsList().map((obj, i) => (
                        <div key={i} className="sugg-card">
                          <div className={`sugg-badge ${obj.status}`}>
                            {obj.status === "critical" ? t("critical") : obj.status === "warning" ? t("warning") : t("optimal")}
                          </div>
                          <div className="sugg-info">
                            <div className="sugg-info-row">
                              <h4>{obj.name}</h4>
                              <div className="sugg-pos-details">
                                {t("detected")}: <span>{obj.detected_direction}</span> | {t("ideal")}: <span>{obj.vastu_ideal}</span>
                              </div>
                            </div>
                            <p className="sugg-reason">{obj.reason}</p>
                            <div className={`sugg-advice-box ${obj.status}`}>
                              <strong>{t("remedyTitle")}</strong>
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
                  <h4>{t("refineHeader")}</h4>
                  <p>{t("refineDescription")}</p>
                </div>
                <div className="refinement-input-row">
                  <textarea
                    placeholder={t("refinePlaceholder")}
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
                        <span>{t("refiningLayout")}</span>
                        <svg className="spinner-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spinClockwise 1s linear infinite" }}>
                          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>{t("submitCorrection")}</span>
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
              <h2>{t("faqTitle")}</h2>
              <p>{t("faqSub")}</p>
            </div>
            <div className="faq-grid">
              {((TRANSLATIONS[activeLanguage] as any).faqList || TRANSLATIONS.english.faqList).map((faq: any, idx: number) => (
                <div key={idx} className="faq-card">
                  <h3>{faq.q}</h3>
                  <p>{faq.a}</p>
                </div>
              ))}
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
      {selectedSector && sectorData[selectedSector] && (
        <div className="modal-overlay active" onClick={() => setSelectedSector(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="modal-close" onClick={() => setSelectedSector(null)}>
              &times;
            </span>
            <div className="modal-header-gold">
              <span className="modal-icon">🧭</span>
              <h3>{sectorData[selectedSector].title}</h3>
            </div>
            <div className="modal-body-content">
              <p className="modal-intro">{sectorData[selectedSector].intro}</p>
              <div className="modal-guide-details">
                <div className="guide-item good">
                  <strong>{activeLanguage === "english" ? "Ideal Placements (Positive Energy Flow):" : "आदर्श स्थानान्तरण (सकारात्मक ऊर्जा प्रवाह):"}</strong>
                  <span>{sectorData[selectedSector].ideal}</span>
                </div>
                <div className="guide-item bad">
                  <strong>{activeLanguage === "english" ? "Avoid Placing (Energy Blockages):" : "पन्हेज गर्नुपर्ने स्थानान्तरण (ऊर्जा अवरोध):"}</strong>
                  <span>{sectorData[selectedSector].avoid}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
