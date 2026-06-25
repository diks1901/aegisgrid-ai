# AEGISGRID AI
### Autonomous Multi-Agent Critical Infrastructure Protection Platform
**Kaggle AI Agents Vibe Coding Capstone — Track: Agents for Good**

---

## What It Does

AegisGrid AI deploys **six specialized AI agents** that investigate critical infrastructure incidents — power grid failures, cyberattacks on water systems, cascading equipment failures — and produce structured emergency response playbooks in seconds.

When a disaster strikes, human operators are overwhelmed. AegisGrid gives them a trusted, structured analysis within seconds: root cause, confidence scores, and a step-by-step playbook — so the right people take the right actions immediately.

---

## The Agent Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    INCIDENT REPORT (User Input)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Mission    │  Agent 1 — Plans the
                    │ Coordinator │  investigation scope
                    └──────┬──────┘
                           │ (concurrent launch)
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │   Weather   │  │    Cyber    │  │  Infra      │
   │Intelligence │  │   Threat   │  │  Status     │
   │  (MCP Tool) │  │  (Net Tool) │  │             │
   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
          │                │                │
          └────────────────┼────────────────┘
                    ┌──────▼──────┐
                    │  Decision   │  Agent 5 — Fuses all
                    │   Fusion   │  findings, assigns
                    └──────┬──────┘  confidence scores
                    ┌──────▼──────┐
                    │   Report   │  Agent 6 — Produces
                    │ Generator  │  emergency playbook
                    └─────────────┘
```

### The 6 Agents

| Agent | Role | Output |
|---|---|---|
| **MissionCoordinator** | Plans scope, sets severity level | `CoordinationPlan` |
| **WeatherIntelligence** | Fetches live weather via MCP tool | `WeatherReport` |
| **CyberThreat** | Detects IoC, attack vectors, APT patterns | `CyberThreatAssessment` |
| **InfrastructureStatus** | Scores component health, estimates recovery | `InfrastructureStatus` |
| **DecisionFusion** | Weighs all evidence, produces confidence scores | `DecisionFusionOutput` |
| **ReportGenerator** | Translates decision into actionable playbook | `PlaybookOutput` |

Agents 2, 3, and 4 run **concurrently** via `asyncio.gather` for speed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Agents | Google ADK (`google-adk`) + Gemini 2.0 Flash |
| Agent Pattern | `InMemoryRunner` — singleton per agent, isolated session per request |
| MCP Tools | `fetch_weather_mcp`, `analyze_network_traffic` |
| Backend | FastAPI + Pydantic structured outputs + `uvicorn` |
| Frontend | React + Vite + Tailwind CSS |
| Security | Prompt injection detection, `slowapi` rate limiting, API key auth |
| Audit | Structured logging to `audit.log` |

---

## Demo Scenarios

The platform ships with three pre-built scenarios covering the three most common infrastructure attack categories:

**🌀 Hurricane Strike — Miami**
Category 4 hurricane, physical infrastructure damage, hospital power loss. Expected: `storm_damage` confidence 91%.

**⚠️ Cyber Attack — Mumbai Water**
SCADA intrusion on water treatment plant, APT signature match, clear weather eliminates environmental cause. Expected: `cyber_attack` confidence 94%.

**❓ Ambiguous Cascade — Toronto**
Cascading substation failures during light snowfall, SCADA log gap, ambiguous cause. Expected: `equipment_failure` 52%, `cyber_attack` 28% — agents disagree.

The Toronto scenario is the most interesting for judges: it demonstrates that the system knows when it doesn't know.

---

## Agents for Good — Impact

Critical infrastructure protection is one of the highest-stakes domains for AI. During a real emergency:

- Human operators face **alert fatigue and information overload**
- The difference between a 2-hour and 72-hour outage often comes down to **correct root cause identification in the first 15 minutes**
- Cyberattacks on infrastructure are specifically designed to look like equipment failures

AegisGrid addresses this by giving operators a structured, multi-hypothesis analysis that separates physical damage from cyber intrusion from sensor error — with explicit confidence scores and self-critique built in so operators know what the system is uncertain about.

---

## Setup & Run

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Google Gemini API key (`GEMINI_API_KEY`)

### Backend

```bash
# Clone the repo
git clone https://github.com/diks1901/aegisgrid-ai.git
cd aegisgrid-ai

# Install Python dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Start the backend
python main.py
# → Running on http://localhost:8000
```

### Frontend

```bash
# Install Node dependencies
npm install

# Create frontend env
cp .env.example .env
# VITE_API_URL=http://localhost:8000 (default)

# Start dev server
npm run dev
# → Running on http://localhost:5173
```

### Test the API directly

```bash
# Health check (no auth)
curl http://localhost:8000/health

# Run an investigation
curl -X POST http://localhost:8000/api/investigate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: aegisgrid-dev-key-change-in-prod" \
  -d '{
    "incident_description": "Power grid failure affecting hospital district",
    "location": "Chicago, Illinois",
    "network_anomalies": false,
    "affected_systems": ["Power Grid", "Hospitals"]
  }'
```

---

## Security Architecture

```
Request → Rate Limit (10/min) → API Key Auth → Prompt Injection Scan
       → Input Sanitization → Agent Pipeline → Audit Log → Response
```

- **Prompt injection detection:** Regex patterns block `ignore previous`, `jailbreak`, `new persona`, etc.
- **Input sanitization:** HTML stripping, whitespace normalization
- **Rate limiting:** `slowapi` — 10 requests/minute per IP
- **API key auth:** `X-API-Key` header, validated against env var
- **Audit logging:** Every request logged to `audit.log` with session ID, IP, location, primary cause, and elapsed time

---

## Project Structure

```
aegisgrid-ai/
├── main.py              # FastAPI backend — all 6 ADK agents
├── App.jsx              # React frontend — 3-tab dashboard
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables (not committed)
├── .env.example         # Template
├── audit.log            # Auto-generated — request audit trail
└── README.md            # This file
```

---

## Key Design Decisions

**Why InMemoryRunner over other ADK patterns?**
Singleton runner per agent means no cold-start cost on subsequent requests. Session isolation via unique `session_id` per investigation keeps concurrent requests from interfering.

**Why structured Pydantic outputs for every agent?**
Agents that return free text are unpredictable. Every agent in AegisGrid has a contract: a Pydantic schema injected into the prompt, with JSON validation on the response. If an agent hallucinates formatting, the error is caught and surfaced cleanly.

**Why does the Decision Fusion agent include self-critique?**
In high-stakes emergency response, operators need to know what the AI doesn't know. The `self_critique` field surfaces uncertainty explicitly rather than projecting false confidence.

---

*Built for Kaggle AI Agents Vibe Coding Capstone 2025 — Track: Agents for Good*
