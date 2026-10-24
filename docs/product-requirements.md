📄 Product Requirements Document (PRD) v2.0
Project Name: AgroSentinel Nexus
Tagline: Full-Stack, Commodity-Edge Agentic Intelligence for Climate-Resilient Agriculture
Target Tracks: Best Apps and Agents Track (Primary) | Physical AI Track (Secondary via Mobile Edge)
1. Executive Summary & Problem Statement
The Problem: Global agriculture loses billions to climate volatility and crop disease. Current AI solutions are fragmented: "dumb" offline classifiers lack real-time economic context, while "fragile" cloud chatbots fail in low-connectivity fields. Furthermore, true precision agriculture requires expensive, specialized hardware, locking out the majority of global farmers and independent agronomists.
The Solution: AgroSentinel Nexus is a full-stack, hybrid "Commodity-Edge to Cloud" platform.
The Edge (Mobile): A React Native/Expo mobile app turns any $200 smartphone into an intelligent edge sensor, capturing field data natively and caching agent recommendations for offline use.
The Brain (Python Backend): A FastAPI backend orchestrates NVIDIA NemoClaw agents, using Nebius Token Factory for deep economic reasoning and Tavily for real-time weather/market grounding.
The Macro (Web): A Next.js web dashboard provides regional cooperative managers with predictive outbreak heatmaps and supply chain analytics.
2. Target Users & Platform Mapping
Persona 1: The Independent Field Agronomist (The Mobile User)
Context: Drives between farms. Needs rapid, offline-capable triage.
Platform: React Native / Expo Mobile App. Uses the phone's native camera and offline storage.
Persona 2: The Regional Cooperative Manager (The Web User)
Context: Manages risk and supply chain for 50+ farms from an office.
Platform: Next.js Web Dashboard. Needs high-density data visualization, maps, and historical analytics.
3. User Stories
Mobile App (React Native / Expo)
US1 (Native Edge Capture): As an Agronomist, I want to use my phone’s native camera via the Expo app to scan a crop leaf, so I can instantly trigger the AI triage pipeline without needing specialized IoT hardware.
US2 (Offline-First Resilience): As an Agronomist in a low-connectivity field, I want the app to cache the last generated "Regional Advisory" and agent recommendations locally, so I can still access critical data when the network drops.
US3 (Transparent Agent UI): As an Agronomist, I want to view a collapsible "Agent Thought Trace" in the app, showing the exact Tavily searches (e.g., "Checking local wind speeds") so I can trust the AI's final recommendation.
Web Dashboard (Next.js)
US4 (Macro Spatial Analytics): As a Cooperative Manager, I want to view an interactive map on the Next.js dashboard showing aggregated, anonymized disease detections from all mobile users in my region, so I can proactively dispatch resources.
US5 (Supply Chain Integration): As a Manager, I want the web dashboard to display the real-time commodity market prices and chemical availability fetched by the Tavily agent, so I can optimize regional purchasing.
4. Core Features & Architecture (MVP)
📱 Mobile App (React Native + Expo) - Cost: $0 (Expo Go)
Expo Camera Integration: High-resolution image capture with on-device compression before sending to the backend.
Offline Caching (AsyncStorage / WatermelonDB): Stores the last 5 agent recommendations and regional alerts.
Push Notifications: Alerts the agronomist if the background Python agent detects a sudden regional weather shift that invalidates a previous treatment plan.
💻 Web Dashboard (Next.js + Tailwind + Mapbox) - Cost: $0 (Vercel Hobby)
Interactive Outbreak Heatmap: Visualizes the GPS coordinates of mobile app detections.
Agent Analytics Panel: Shows a log of how the NemoClaw agent is reasoning across the entire region (e.g., "Agent has run 45 Tavily weather checks today, preventing 12 wasteful chemical sprays").
Server-Side Rendering (SSR): Ensures the dashboard loads instantly even on slower cooperative office internet.
🧠 Agentic Backend (Python + FastAPI) - Cost: $0 (Nebius Hackathon Credits)
FastAPI Endpoints: /api/scan (receives image/GPS from mobile), /api/region-map (sends data to web).
NemoClaw Orchestrator: The core agent loop.
Tiered Nebius Inference:
Fast Triage: Nemotron Nano (via Nebius Serverless) for rapid, low-cost initial image classification.
Deep Reasoning: Nemotron 3 Ultra (via Nebius Token Factory) to synthesize Tavily data into an economically optimized plan.
Tavily Tool-Calling: Custom tools for get_micro_climate_forecast(lat, lon) and get_regional_commodity_prices(crop_type).
5. Technical Stack Mapping (The "Winning" Stack)
Layer
Technology Used
Hackathon Requirement Met
Mobile Frontend
React Native, Expo, Expo Camera, React Query
"Complete, coherent product experience" (Design Rubric)
Web Frontend
Next.js (App Router), Tailwind CSS, Mapbox/Leaflet
"Complete, coherent product experience" (Design Rubric)
Backend API
Python, FastAPI, Pydantic
Robust, production-grade API for mobile/web
Agent Orchestration
NVIDIA NemoClaw / LangGraph
"Use tools such as NVIDIA NemoClaw..."
LLM Inference
Nemotron 3 Ultra & Nano via Nebius Token Factory
"Reach for Nemotron 3 Ultra when you need serious reasoning..."
External Tools
Tavily Search API
Eligible for the $3,000 "Best Use of Tavily" prize.
Background Jobs
Nebius Serverless Jobs (Cron)
"Use Nebius Serverless Jobs for background processing..."
6. Success Metrics (KPIs)
Design (UX): Mobile app achieves a < 2-second time-to-first-frame for camera capture; Web dashboard renders the regional heatmap in < 1.5 seconds via Next.js SSR.
Technological Implementation: 100% of deep reasoning queries utilize Nebius Token Factory; 100% of environmental/market data is grounded via Tavily (zero LLM hallucinations on weather/prices).
Potential Impact: The "Offline-First" mobile architecture ensures 100% uptime for the agronomist in zero-connectivity zones, while the Web dashboard provides a 360-degree regional risk overview.
7. Edge Cases & Full-Stack Mitigations
Edge Case
System Mitigation
Mobile App Backgrounding / Network Drop during Scan
The React Native app uses React Query with optimistic UI. It shows "Analyzing..." locally. If the network drops, it queues the request. When connectivity returns, it auto-syncs to the FastAPI backend.
Large Image Payloads from Mobile
The Expo app compresses the image to JPEG (quality 0.6) and resizes to 1024px before sending to FastAPI, saving Nebius inference costs and preventing mobile data bottlenecks.
Tavily Returns Conflicting Market Data
Nemotron 3 Ultra is prompted via system instructions to identify the discrepancy and default to the most conservative economic recommendation to protect the farmer's margin.
Web Dashboard Map Overload
If a region has 10,000+ detections, the Next.js Mapbox component uses "clustering" to group pins, ensuring the UI remains buttery smooth and doesn't crash the browser.
8. Hackathon Execution Strategy (How to Win with this Stack)
🎯 The "Secret Sauce" for the Judges
Crush the "Design" Criterion: Judges like Dylan Bristot (Nebius) want a "complete product." By having a polished Expo mobile app and a Next.js web dashboard, you look like a Series A startup, not a weekend hack.
The "Commodity Edge" Narrative: When demoing the mobile app, explicitly say: "We didn't need a $500 Jetson. We used the Expo camera on a standard smartphone to act as the edge sensor, proving that Nebius-powered agentic AI is accessible to anyone."
The Tavily $3k Bonus: In the Next.js web dashboard, include a specific panel called "Tavily Grounding Ledger". Show a live log of exactly how much money the agent saved the cooperative by using Tavily to prevent bad chemical sprays. Tavily judges will love this tangible ROI metric.
📹 The 3-Minute Demo Video Flow (Full-Stack Edition)
0:00 - 0:30 (The Hook): Show a split screen: The Expo mobile app in a field, and the Next.js dashboard in an office. "Precision agriculture has a hardware and connectivity problem. We built AgroSentinel Nexus: a full-stack, commodity-edge agentic platform."
0:30 - 1:15 (The Mobile Edge Demo): Show the phone camera scanning a leaf. Show the "Agent Thought Trace" expanding on the phone screen. Narrate: "The phone acts as the edge. It triggers our NemoClaw agent on Nebius. Watch as it calls Tavily for local wind speeds, realizes a spray will drift, and uses Nemotron 3 Ultra to recommend a soil-injection instead."
1:15 - 2:00 (The Web Macro Demo): Cut to the Next.js dashboard. Show the map updating with the mobile scan. Show the "Tavily Grounding Ledger" calculating regional savings. Mention Nebius Serverless Jobs running overnight to aggregate this data.
2:00 - 3:00 (The Impact & Architecture): Show the tech stack logos (Expo, Next.js, FastAPI, Nebius, Tavily). "By decoupling intelligence from expensive hardware, and delivering it via the devices farmers already own, we make climate-resilient agriculture a reality. Code is open source under MIT."