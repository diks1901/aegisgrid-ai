# AegisGrid AI: Autonomous Multi-Agent Critical Infrastructure Protection Platform

**Track:** Agents for Good
**GitHub:** https://github.com/diks1901/aegisgrid-ai

---

## The Problem: When Every Alert Could Mean Lives

Every hour, modern critical infrastructure generates thousands of automated alerts. Power grid sensors, water treatment monitors, hospital backup systems, communication networks — each produces a continuous stream of telemetry that operations teams must interpret and act on.

During a disaster, this problem becomes catastrophic.

When a Category 4 hurricane makes landfall, operators face simultaneous failures across power, communications, and transportation. At the same moment, cybercriminals exploit the chaos — probing weakened networks, attempting to hijack SCADA systems while defenders are distracted. And aging equipment, stressed by extreme conditions, begins to fail independently.

The operator staring at the screen faces an impossible question in real time: **Is this storm damage? A cyberattack? Equipment failure? Sensor malfunction?**

The wrong answer has consequences. Dispatching repair crews to a tower that was actually cyber-sabotaged — rather than isolating the network first — can result in more damage. Treating a physical equipment failure as an attack wastes scarce cybersecurity resources during the first critical hours. Misidentifying the primary cause delays the right response.

Current approaches rely on domain specialists working in silos: meteorologists, cybersecurity analysts, infrastructure engineers, and emergency planners each interpret their own data streams independently. By the time findings are synthesized into a coordinated decision, critical time has passed.

This is precisely the problem AegisGrid AI was built to solve.

---

## Why Agents? The Case for Multi-Agent Architecture

A single AI model receiving all the data at once is not the solution. A monolithic model cannot credibly claim the deep specialization of a trained meteorologist, a cybersecurity analyst who understands OT network attack patterns, and an infrastructure engineer who knows failure cascade sequences — all at once.

More importantly, a single model cannot *disagree with itself*. It cannot surface conflicting interpretations of ambiguous evidence and make those tensions explicit. And it cannot self-critique its own reasoning before issuing a recommendation.

Multi-agent systems solve these problems fundamentally. Each agent holds a defined domain expertise, uses only the tools appropriate to that domain, and produces findings that can be compared, weighted, and disputed by other agents.

AegisGrid uses agents because the problem demands it. Not as a technical showcase, but because the architecture matches the real-world structure of how incident response actually works: a team of specialists, each contributing their expertise, coordinated by a command authority that fuses their findings into a decision.

The difference is that AegisGrid's team assembles in seconds, not hours.

---

## Solution Overview

AegisGrid AI is an autonomous multi-agent investigation platform built on Google ADK with Gemini 2.0 Flash. When an infrastructure incident is reported, six specialized agents collaborate to investigate, reason, and respond.

The platform accepts a structured incident report — description, location, whether network anomalies are present, and which infrastructure systems are affected — and returns a complete investigation: root cause assessment with confidence scores across four hypotheses, evidence summaries, explicit conflicting evidence, prioritized recommended actions, and a full emergency response playbook.

A real-time React dashboard visualizes the investigation as it happens: agents activate in sequence, a live timeline builds, and results populate with animated confidence bars that reveal how each agent's findings were weighted.

AegisGrid is designed for the operators who need decisions, not dashboards full of raw data.

---

## Architecture Deep Dive

### The Six-Agent Pipeline

**MissionCoordinatorAgent** receives the incident report first. It assesses severity (LOW/MEDIUM/HIGH/CRITICAL), identifies which areas require the deepest investigation, and states an initial hypothesis. This creates the investigation frame that downstream agents work within.

**WeatherIntelligenceAgent** is the first specialist. It calls the `fetch_weather_mcp()` tool — an MCP (Model Context Protocol) integration that returns structured weather telemetry for the affected location. The agent then reasons about whether conditions (wind speed, precipitation, storm category) are consistent with the reported infrastructure damage. This is a genuine MCP tool call, not a simple prompt — the agent actively retrieves external data before forming its assessment.

**CyberThreatAgent** works in parallel with the Weather agent. When network anomalies are present, it calls `analyze_network_traffic()` to examine traffic patterns for known attack signatures, port scanning, DDoS indicators, and unusual source IP activity. It classifies the threat level and crucially distinguishes between *opportunistic* activity (criminals probing during chaos) and *targeted* attacks (coordinated, pre-planned infrastructure strikes).

**InfrastructureStatusAgent** also runs in parallel. It evaluates the health of affected components, scores overall infrastructure health on a 0-100 scale, identifies specific failed components, classifies damage type as Physical, Cyber, or Combined, and estimates recovery time in hours.

A critical architectural decision: agents 2, 3, and 4 run concurrently via `asyncio.gather()`. This reflects how real incident response works — the meteorologist doesn't wait for the cybersecurity analyst to finish before starting their assessment. It also makes the investigation measurably faster.

**DecisionFusionAgent** receives all three intelligence reports and performs the synthesis. It assigns confidence scores across four hypotheses — storm_damage, cyber_attack, equipment_failure, sensor_error — that sum to 100. It surfaces supporting evidence and explicitly flags conflicting evidence. It generates prioritized recommended actions with rationale and responsible parties. And it writes a self-critique: what assumptions were made, what evidence is missing, where the assessment could be wrong.

This self-critique is not cosmetic. In the Toronto scenario — where equipment failure, weather, and cyber indicators all point partially in different directions — the Decision Fusion agent explicitly states: *"This is a genuinely ambiguous case. Confidence in primary_cause is moderate at best — recommend treating as cyber incident until proven otherwise."*

**ReportGeneratorAgent** translates the decision into an operational emergency playbook: emergency level classification, immediate actions (what to do in the next 60 minutes), a communication plan for different audiences, phased recovery steps with time estimates, and a projected resolution timeline.

### Google ADK Implementation

All agents are built using Google ADK with the correct `InMemoryRunner` pattern. Each investigation creates a unique `session_id`, and each agent receives an isolated sub-session (`session_id_AgentName`) to prevent state contamination across concurrent requests. Runners are initialized at startup via FastAPI's `lifespan` hook and reused as singletons — avoiding the per-request initialization overhead that would otherwise make response times unacceptable.

Agent responses are enforced against Pydantic v2 schemas. Markdown fences are stripped via regex. Schema validation failures are logged with the raw output for debugging. The pipeline is fully async throughout.

---

## Key Technical Features

### MCP Integration
The `fetch_weather_mcp()` function implements the Model Context Protocol tool pattern. It is registered directly on the `WeatherIntelligenceAgent` via the `tools=[]` parameter in the ADK Agent definition. The tool returns structured telemetry including storm category, wind speed, precipitation, lightning strike count, and infrastructure risk assessment — data the agent uses to form its meteorological analysis.

### Structured Outputs
Every agent output is enforced against a Pydantic v2 model. `CoordinationPlan`, `WeatherReport`, `CyberThreatAssessment`, `InfrastructureStatus`, `DecisionFusionOutput`, and `PlaybookOutput` each define required fields, value constraints (`ge=0, le=100` on confidence scores), and field descriptions that are injected into the agent prompt as a JSON schema contract.

### Security Features
AegisGrid treats security as a first-class feature, not an afterthought. The `detect_prompt_injection()` function screens every input against 10 compiled regex patterns targeting common jailbreak techniques. All `/api/*` routes require an `X-API-Key` header validated against an environment variable. `slowapi` enforces a rate limit of 10 requests per minute per IP. Input sanitization strips HTML tags and enforces character limits before any data reaches the agents. Every investigation request is written to `audit.log` with timestamp, IP, session ID, primary cause, and elapsed time.

### Parallel Execution
The three intelligence-gathering agents run concurrently via `asyncio.gather()`. This is not just a performance optimization — it ensures that each agent forms its assessment independently before the Decision Fusion engine receives all three. This preserves the integrity of independent expert judgment that the architecture is designed to deliver.

---

## Demo Walkthrough: Hurricane Miami

An operator reports: *"Category 4 hurricane has made landfall near Miami. Multiple transmission towers are offline, hospitals reporting power loss, and communication networks are degraded."* Network anomalies: detected. Affected systems: Power Grid, Hospitals, Communications.

The MissionCoordinator immediately classifies this as CRITICAL severity and identifies three investigation priorities: storm surge impact on transmission infrastructure, opportunistic cyber activity during the emergency window, and hospital backup power status.

The Weather agent calls `fetch_weather_mcp("Miami, Florida")` and receives telemetry showing sustained winds at 220 km/h — exceeding the 160 km/h rating of standard transmission towers — with storm surge at 4.2 meters. Confidence: 96%.

The Cyber agent detects elevated port scanning from 3 external IPs but finds no malware signatures, no DDoS patterns, and clean source IP reputation. Assessment: OPPORTUNISTIC activity consistent with criminals probing during outage. Confidence: 88%.

The Infrastructure agent identifies four failed components — Transmission Tower T-17, Substation Brickell-East, Fiber Ring Node FRN-09, Hospital Backup Generator HBG-03 — with an overall health score of 24/100. Damage type: Physical.

The Decision Fusion engine weighs these findings: storm_damage 91%, cyber_attack 4%, equipment_failure 4%, sensor_error 1%. Primary cause: *Storm Damage — Category 4 hurricane direct physical impact.*

P1 action: Activate mutual aid agreements with Florida Power & Light — hospital generators have an 8-hour fuel reserve. P2: Deploy repair crews to Transmission Tower T-17 — its restoration recovers 40% of affected grid capacity.

Self-critique: *"The 4-minute SCADA log gap before storm arrival warrants further forensic review to rule out pre-positioning activity."*

Estimated resolution: 72 hours.

---

## Challenges and Learnings

The most significant technical challenge was discovering that the Google ADK `agent.run()` method does not exist. The correct pattern — `InMemoryRunner` with `session_service.create_session()` and `runner.run_async()` — is not immediately obvious from documentation alone. This required careful study of the ADK event stream API and understanding how to extract text content from `event.content.parts`.

Designing for ambiguity was the most interesting product challenge. The Toronto scenario was specifically designed to have no clear winner — equipment failure at 52%, cyber at 28%, storm at 15%. The Decision Fusion agent had to learn to express genuine uncertainty rather than force a false confidence. The `self_critique` field was added specifically to surface this: a production system giving operators a 52% confidence answer without flagging that it might be wrong would be worse than useless.

The parallel execution of agents 2, 3, and 4 required careful session isolation. Without unique sub-session IDs per agent per investigation, concurrent requests would corrupt each other's state. The `{session_id}_{agent.name}` pattern solved this cleanly.

---

## Future Vision

AegisGrid is built as a platform, not a prototype. The six-agent architecture is a foundation that can be extended in multiple directions.

Real MCP server integration would connect to live weather APIs (National Weather Service, Copernicus), actual threat intelligence feeds (STIX/TAXII sources), and infrastructure sensor networks. The `fetch_weather_mcp()` tool is already MCP-compatible — it requires only a real server endpoint to become production-grade.

Additional specialist agents could include a Wildfire Intelligence Agent (satellite thermal imaging + wind analysis), a Seismic Assessment Agent (earthquake magnitude and infrastructure fragility modeling), a Public Health Impact Agent (population density mapping against affected zones), and a Resource Allocation Agent that optimizes crew deployment across multiple simultaneous incidents.

At scale, AegisGrid becomes the coordination layer for smart city infrastructure resilience — the AI incident commander that ensures the first decision made in a crisis is the right one.

---

*AegisGrid AI was built during Kaggle's 5-Day AI Agents Intensive Vibe Coding Course using Google ADK and Antigravity IDE. It represents what becomes possible when multi-agent AI architecture is matched to a problem that genuinely requires it.*
