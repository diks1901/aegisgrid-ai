# ⬡ AegisGrid AI

### Autonomous Multi-Agent Critical Infrastructure Protection Platform

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![Google ADK](https://img.shields.io/badge/Google_ADK-2.0-4285F4?style=flat&logo=google&logoColor=white)](https://google.github.io/adk-docs/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)
[![Kaggle](https://img.shields.io/badge/Kaggle-AI_Agents_Capstone-20BEFF?style=flat&logo=kaggle&logoColor=white)](https://www.kaggle.com/competitions/vibecoding-agents-capstone-project)

> **Kaggle AI Agents: Intensive Vibe Coding Capstone** · Track: **Agents for Good**

Modern infrastructure generates thousands of alerts every hour. During disasters — hurricanes, earthquakes, floods — operators face an impossible question: **Is this storm damage, a cyberattack, or equipment failure?** The wrong answer costs lives.

AegisGrid AI deploys six specialized AI agents that investigate an incident collaboratively, fuse their findings with weighted confidence scores, self-critique their own reasoning, and generate an actionable emergency response playbook — in seconds.

---

## ✦ Key Features

- **6-Agent Multi-Agent System** — Mission Coordinator, Weather Intelligence, Cyber Threat, Infrastructure Status, Decision Fusion, and Report Generator agents, each with a defined role and toolset
- **Decision Fusion Engine** — weighs confidence scores across four root causes (storm damage, cyber attack, equipment failure, sensor error) with evidence summaries and conflicting-evidence flags
- **MCP Integration** — Weather Intelligence agent uses a Model Context Protocol tool to fetch live environmental telemetry; Cyber agent uses a network traffic analyzer tool
- **Parallel Execution** — Agents 2, 3, and 4 run concurrently via `asyncio.gather()` for fast results
- **Self-Critique** — Decision Fusion agent explicitly questions its own assessment before finalizing
- **Security-First** — Prompt injection detection, API key authentication, rate limiting, input sanitization, and full audit logging built in from day one
- **Real-Time Dashboard** — React command center with live agent status, animated confidence bars, prioritized playbook, and incident timeline
- **Demo Mode** — Three pre-built realistic scenarios (Hurricane/Miami, Cyber Attack/Mumbai, Ambiguous Cascade/Toronto) so judges can explore without a running backend

---

## ⬡ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Dashboard                       │
│          (Dark command center UI · Demo + Live mode)         │
└─────────────────────┬───────────────────────────────────────┘
                      │  POST /api/investigate
                      │  X-API-Key header
┌─────────────────────▼───────────────────────────────────────┐
│              FastAPI Backend  (main.py)                      │
│         Security Middleware · Rate Limiter · Audit Log       │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────▼────────────┐
          │  MissionCoordinator    │  Google ADK Agent
          │  Agent                 │  Plans the investigation
          └───────────┬────────────┘
                      │  asyncio.gather() — runs in parallel
          ┌───────────┼────────────────────────────┐
          ▼           ▼                            ▼
  ┌───────────┐ ┌───────────┐            ┌─────────────────┐
  │  Weather  │ │   Cyber   │            │ Infrastructure  │
  │  Intel    │ │  Threat   │            │    Status       │
  │  Agent    │ │  Agent    │            │    Agent        │
  │           │ │           │            │                 │
  │ MCP Tool: │ │ Tool:     │            │ Evaluates       │
  │ fetch_    │ │ analyze_  │            │ component       │
  │ weather   │ │ network_  │            │ health + damage │
  │ _mcp()    │ │ traffic() │            │                 │
  └─────┬─────┘ └─────┬─────┘            └────────┬────────┘
        └─────────────┼──────────────────────────┘
                      ▼
          ┌───────────────────────┐
          │   DecisionFusion      │  Weighs all findings
          │   Agent               │  Confidence scores
          │                       │  Self-critique
          └───────────┬───────────┘
                      ▼
          ┌───────────────────────┐
          │   ReportGenerator     │  Emergency playbook
          │   Agent               │  Priority actions
          └───────────┬───────────┘
                      ▼
          ┌───────────────────────┐
          │  FullInvestigation    │  Structured JSON response
          │  Response (Pydantic)  │  back to React dashboard
          └───────────────────────┘
```

---

## 🤖 Agent Descriptions

| Agent | Role | Tools Used | Output Schema |
|---|---|---|---|
| **MissionCoordinatorAgent** | Lead orchestrator — assesses severity and builds investigation plan | None | `CoordinationPlan` |
| **WeatherIntelligenceAgent** | Fetches real-time weather via MCP and correlates to incident | `fetch_weather_mcp()` (MCP) | `WeatherReport` |
| **CyberThreatAgent** | Analyzes network anomalies for attack indicators and IoC | `analyze_network_traffic()` | `CyberThreatAssessment` |
| **InfrastructureStatusAgent** | Evaluates component health, damage type, recovery time | None | `InfrastructureStatus` |
| **DecisionFusionAgent** | Weighs all intelligence, assigns confidence scores, self-critiques | None | `DecisionFusionOutput` |
| **ReportGeneratorAgent** | Translates decision into actionable emergency response playbook | None | `PlaybookOutput` |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Backend Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/aegisgrid-ai.git
cd aegisgrid-ai

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 5. Run the backend
python main.py
# API now running at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### Frontend Setup

```bash
# From project root
cd frontend

# Install dependencies
npm install

# Configure environment
cp ../frontend.env.example .env.local
# Edit .env.local if your backend URL differs from localhost:8000

# Run dev server
npm run dev
# Dashboard at http://localhost:5173
```

### Enable Live API Mode

In `App.jsx`, change line:
```js
const USE_REAL_API = false;  // ← change to true
```

---

## 📡 API Documentation

### `POST /api/investigate`

Triggers the full 6-agent investigation pipeline.

**Headers:**
```
Content-Type: application/json
X-API-Key: your-aegisgrid-api-key
```

**Request body:**
```json
{
  "incident_description": "Category 4 hurricane has made landfall near Miami. Multiple transmission towers are offline.",
  "location": "Miami, Florida",
  "network_anomalies": true,
  "affected_systems": ["Power Grid", "Hospitals", "Communications"]
}
```

**Response (200 OK):**
```json
{
  "session_id": "ae3f-9b21-cc04-...",
  "timestamp": "2026-06-25T10:30:00Z",
  "coordination_plan": {
    "incident_severity": "CRITICAL",
    "focus_areas": ["Storm surge impact on transmission infrastructure"],
    "initial_hypothesis": "Category 4 hurricane causing direct physical damage..."
  },
  "intelligence_reports": {
    "weather": { "conditions": "...", "severity": "CRITICAL", "confidence": 96 },
    "cyber":   { "threat_level": "LOW", "confidence": 88 },
    "infrastructure": { "overall_health_score": 24, "confidence": 91 }
  },
  "decision_fusion": {
    "primary_cause": "Storm Damage — Category 4 hurricane direct physical impact",
    "confidence_scores": {
      "storm_damage": 91, "cyber_attack": 4,
      "equipment_failure": 4, "sensor_error": 1
    },
    "evidence_summary": ["..."],
    "conflicting_evidence": ["..."],
    "recommended_actions": [
      { "priority": 1, "action": "Activate mutual aid agreements", "rationale": "..." }
    ],
    "self_critique": "..."
  },
  "playbook": {
    "emergency_level": "CRITICAL",
    "immediate_actions": ["..."],
    "communication_plan": "...",
    "recovery_steps": ["..."],
    "estimated_resolution_hours": 72
  }
}
```

### `GET /api/demo-scenarios`

Returns the 3 pre-built demo scenarios. No auth required.

### `GET /health`

System health check. No auth required.

```json
{ "status": "operational", "agents": 6, "timestamp": "..." }
```

---

## 🔒 Security Features

| Feature | Implementation | Location |
|---|---|---|
| **Prompt Injection Detection** | 10 regex patterns block jailbreak attempts | `main.py` — `detect_prompt_injection()` |
| **API Key Authentication** | `X-API-Key` header required on all `/api/*` routes | `main.py` — `verify_api_key()` |
| **Rate Limiting** | 10 requests/minute per IP via slowapi | `main.py` — `@limiter.limit("10/minute")` |
| **Input Sanitization** | HTML stripping, 2000-char limit, whitespace normalization | `main.py` — `sanitize_input()` |
| **Audit Logging** | Every request logged to `audit.log` with IP, session, outcome | `main.py` — audit log handler |
| **Tool Permission Scoping** | Each agent only receives its approved tools | Agent definitions in `main.py` |
| **No Hardcoded Secrets** | All keys via environment variables | `.env` + `.env.example` |

---

## 🎬 Demo Scenarios

### 🌀 Hurricane Strike — Miami
A Category 4 hurricane makes landfall. Multiple transmission towers offline. Hospitals losing power. Network anomalies present (opportunistic scanning). **Expected result:** 91% storm damage confidence. Agents 2/3/4 disagree on cyber involvement — Decision Fusion explains why weather wins.

### ⚠️ Cyber Attack — Mumbai Water
Clear weather, no environmental cause. SCADA chemical dosing controls showing unauthorized parameter changes. 847 failed VPN attempts preceding the breach. **Expected result:** 94% cyber attack confidence. Weather agent eliminates environmental cause with 99% confidence.

### ❓ Ambiguous Cascade — Toronto
Light snowfall, aging transformers, and a suspicious 4-minute SCADA log gap. **Expected result:** 52% equipment failure — but agents genuinely disagree. Decision Fusion flags the ambiguity and explicitly states the self-critique. Demonstrates responsible AI.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Agent Framework | Google ADK 2.0 |
| LLM | Gemini 2.0 Flash |
| Backend | FastAPI + Python 3.10 |
| Structured Outputs | Pydantic v2 |
| Rate Limiting | slowapi |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Built With | Google Antigravity IDE |

---

## 📋 Kaggle Submission

- **Competition:** [AI Agents: Intensive Vibe Coding Capstone](https://www.kaggle.com/competitions/vibecoding-agents-capstone-project)
- **Track:** Agents for Good
- **Course Concepts Demonstrated:**
  - ✅ Multi-agent system (Google ADK)
  - ✅ MCP Server (weather + network tools)
  - ✅ Antigravity IDE (used to build and scaffold)
  - ✅ Security features (prompt injection, auth, rate limiting, audit log)
  - ✅ Agent Skills (agents-cli pattern)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
