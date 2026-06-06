import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "VastuVision AI - Smart Vastu Shastra Room Analysis & Harmony Guide",
  description: "Evaluate your home layout and furniture placement using advanced Vision AI cross-referenced against traditional Vastu Shastra architectural principles. Get instant remedies, 2D blueprints, and detailed harmony scores.",
  keywords: "Vastu Shastra, Vastu AI, Room Analysis, Home Layout, Furniture Placement, Vastu remedies, Vastu compass, smart home layout, ancient Indian architecture, Vastu compliance checker",
  robots: "index, follow",
  icons: {
    icon: "/favicon.svg",
  },
  alternates: {
    canonical: "https://vastuvision.vercel.app/",
  },
  openGraph: {
    type: "website",
    url: "https://vastuvision.vercel.app/",
    title: "VastuVision AI - Smart Vastu Shastra Room Analysis & Harmony Guide",
    description: "Discover energy alignment in your rooms. Analyze furniture layouts using AI against ancient Vastu rules.",
    images: [
      {
        url: "https://vastuvision.vercel.app/vastu_og_preview.png",
        width: 1200,
        height: 630,
        alt: "VastuVision AI Preview",
      }
    ],
    siteName: "VastuVision AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "VastuVision AI - Smart Vastu Shastra Room Analysis",
    description: "Discover energy alignment in your rooms. Analyze layouts using AI against ancient Vastu rules.",
    images: ["https://vastuvision.vercel.app/vastu_og_preview.png"],
  },
  other: {
    "geo.region": "NP-BA",
    "geo.placename": "Kathmandu",
    "geo.position": "27.717244;85.32396",
    "ICBM": "27.717244, 85.32396",
  }
};

export const viewport: Viewport = {
  themeColor: "#060810",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// --- Schema.org Structured Data ---
const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "VastuVision AI",
  "alternateName": "Vastu Vision AI",
  "url": "https://vastuvision.vercel.app/",
  "description": "Analyze your room layout and furniture placement using advanced Vision AI cross-referenced against traditional Vastu Shastra architectural principles.",
  "applicationCategory": "DesignApplication, UtilitiesApplication",
  "operatingSystem": "All",
  "browserRequirements": "Requires HTML5 and JavaScript",
  "author": {
    "@type": "Person",
    "name": "LazZy",
    "url": "https://anuditk.vercel.app"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Vastu Shastra and how does VastuVision AI work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Vastu Shastra is an ancient Indian system of architecture and spatial design that integrates nature, directional alignments, and geometric patterns to enhance harmony and energy flow in living spaces. VastuVision AI analyzes wall photographs using Vision AI models to detect furniture alignment, mapping the layout against traditional Vastu guidelines."
      }
    },
    {
      "@type": "Question",
      "name": "What is the best direction for a bedroom layout according to Vastu Shastra?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "According to Vastu Shastra, the master bedroom should ideally be located in the South-West (Nairutya) corner of the home to bring stability and prosperity. The bed should be placed so that your head faces South or East when sleeping, avoiding sleeping with your head facing North, which aligns you against the Earth's magnetic field."
      }
    },
    {
      "@type": "Question",
      "name": "Where should the kitchen stove be placed for good Vastu?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The kitchen should ideally be in the South-East (Agneya) corner, the direction of the fire element (Agni). The cooking stove should be placed in the South-East corner of the kitchen, and the chef should face East while cooking to promote health and vitality."
      }
    },
    {
      "@type": "Question",
      "name": "Is a Vastu Shastra analysis done by AI accurate?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "VastuVision AI provides layout detection based on the spatial alignment of furniture and walls captured by the user. While it is highly accurate in identifying object placements relative to direction sensors, it acts as a digital reference guide to help align your living spaces with traditional principles."
      }
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
