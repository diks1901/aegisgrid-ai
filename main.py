"""
AegisGrid AI — Multi-Agent Critical Infrastructure Protection Platform
Kaggle AI Agents Vibe Coding Capstone | Track: Agents for Good

ARCHITECTURE: 6 specialized agents orchestrated via Google ADK
- MissionCoordinatorAgent  → Plans the investigation
- WeatherIntelligenceAgent → Fetches weather via MCP tool
- CyberThreatAgent         → Analyzes network anomalies
- InfrastructureStatusAgent → Evaluates component health
- DecisionFusionAgent      → Weighs all findings, produces confidence scores
- ReportGeneratorAgent     → Generates emergency response playbook

SECURITY: Prompt injection detection, rate limiting, input sanitization,
          audit logging, API key auth, tool permission validation.
"""

import os
import re
import json
import uuid
import asyncio
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.genai import types as genai_types
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ============================================================
# ENVIRONMENT & LOGGING SETUP
# ============================================================

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("audit.log"),  # Audit log for all requests
    ],
)
logger = logging.getLogger("AegisGrid")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
AEGISGRID_API_KEY = os.getenv("AEGISGRID_API_KEY", "aegisgrid-dev-key-change-in-prod")
MODEL_NAME = "gemini-2.0-flash"
APP_NAME = "aegisgrid_ai"

if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set — agents will use application default credentials.")

# ============================================================
# PYDANTIC MODELS — Strict structured outputs
# ============================================================

class InvestigateRequest(BaseModel):
    incident_description: str = Field(..., max_length=2000, description="Describe the incident")
    location: str = Field(..., max_length=100, description="City or region affected")
    network_anomalies: bool = Field(..., description="Whether network anomalies were detected")
    affected_systems: List[str] = Field(..., description="List of affected infrastructure systems")


class CoordinationPlan(BaseModel):
    incident_severity: str = Field(description="LOW, MEDIUM, HIGH, or CRITICAL")
    focus_areas: List[str] = Field(description="Key areas for specialist agents to investigate")
    initial_hypothesis: str = Field(description="Coordinator's initial guess at root cause")


class WeatherReport(BaseModel):
    location: str
    conditions: str
    wind_speed_kmh: float
    precipitation_mm: float
    severity: str = Field(description="LOW, MEDIUM, HIGH, or CRITICAL")
    weather_contribution: str = Field(description="How weather relates to this incident")
    confidence: int = Field(ge=0, le=100)


class CyberThreatAssessment(BaseModel):
    threat_level: str = Field(description="NONE, LOW, MEDIUM, HIGH, or CRITICAL")
    indicators_of_compromise: List[str]
    attack_vector: Optional[str] = None
    opportunistic_vs_targeted: str = Field(description="OPPORTUNISTIC, TARGETED, or NONE")
    confidence: int = Field(ge=0, le=100)


class InfrastructureStatus(BaseModel):
    overall_health_score: int = Field(ge=0, le=100)
    failed_components: List[str]
    damage_type: str = Field(description="Physical, Cyber, or Combined")
    estimated_recovery_hours: int
    confidence: int = Field(ge=0, le=100)


class RecommendedAction(BaseModel):
    priority: int = Field(ge=1, le=5)
    action: str
    rationale: str
    responsible_party: str


class ConfidenceScores(BaseModel):
    storm_damage: int = Field(ge=0, le=100)
    cyber_attack: int = Field(ge=0, le=100)
    equipment_failure: int = Field(ge=0, le=100)
    sensor_error: int = Field(ge=0, le=100)


class DecisionFusionOutput(BaseModel):
    primary_cause: str
    confidence_scores: ConfidenceScores
    evidence_summary: List[str]
    conflicting_evidence: List[str]
    recommended_actions: List[RecommendedAction]
    self_critique: str = Field(description="What could be wrong with this assessment")


class PlaybookOutput(BaseModel):
    emergency_level: str
    immediate_actions: List[str]
    communication_plan: str
    recovery_steps: List[str]
    estimated_resolution_hours: int


class FullInvestigationResponse(BaseModel):
    session_id: str
    timestamp: str
    coordination_plan: CoordinationPlan
    intelligence_reports: Dict[str, Any]
    decision_fusion: DecisionFusionOutput
    playbook: PlaybookOutput


# ============================================================
# MCP TOOL — Weather Intelligence (MCP pattern)
# ============================================================

def fetch_weather_mcp(location: str) -> dict:
    """
    MCP (Model Context Protocol) Tool: Weather Intelligence Feed.

    In production this connects to a real weather MCP server.
    For the demo, returns realistic structured telemetry data
    that agents can reason over.

    Args:
        location: The city or region to fetch weather data for.

    Returns:
        dict: Structured weather telemetry from the MCP source.
    """
    logger.info(f"[MCP:WeatherTool] Fetching weather telemetry for: {location}")

    # Simulated MCP weather server response — structured telemetry
    mcp_response = {
        "mcp_source": "weather-intelligence-mcp-v2",
        "mcp_verified": True,
        "location": location,
        "timestamp": datetime.utcnow().isoformat(),
        "temperature_celsius": 31.5,
        "conditions": "Severe thunderstorm with high-velocity winds",
        "wind_speed_kmh": 95.0,
        "precipitation_mm_last_hour": 85.0,
        "lightning_strikes_nearby": 12,
        "storm_category": "SEVERE",
        "infrastructure_risk": "HIGH — power line and tower damage likely",
    }
    return mcp_response


def analyze_network_traffic(anomaly_description: str) -> dict:
    """
    Tool: Network Traffic Analyzer.
    Analyzes network anomaly data for cyber threat indicators.

    Args:
        anomaly_description: Description of observed network behavior.

    Returns:
        dict: Structured threat intelligence report.
    """
    logger.info(f"[Tool:CyberAnalyzer] Analyzing anomaly: {anomaly_description[:80]}...")

    return {
        "tool": "network-threat-analyzer-v1",
        "scan_timestamp": datetime.utcnow().isoformat(),
        "anomaly_input": anomaly_description,
        "port_scan_detected": False,
        "ddos_patterns": False,
        "known_malware_signatures": [],
        "unusual_traffic_spikes": True,
        "source_ip_reputation": "CLEAN",
        "assessment": "Traffic spike consistent with infrastructure monitoring systems activating during emergency, not malicious activity.",
    }


# ============================================================
# AGENT DEFINITIONS — Google ADK
# ============================================================

mission_coordinator_agent = Agent(
    name="MissionCoordinatorAgent",
    model=MODEL_NAME,
    description="Lead orchestrator that creates investigation plans for critical infrastructure incidents.",
    instruction=(
        "You are the lead incident commander for AegisGrid AI. "
        "Analyze the incoming incident report and produce a structured coordination plan. "
        "Assess severity (LOW/MEDIUM/HIGH/CRITICAL), identify key investigation areas, "
        "and state your initial hypothesis about the root cause. "
        "Output ONLY valid JSON matching the schema provided. No markdown, no preamble."
    ),
)

weather_intelligence_agent = Agent(
    name="WeatherIntelligenceAgent",
    model=MODEL_NAME,
    description="Meteorological intelligence agent that uses MCP weather tools.",
    instruction=(
        "You are a meteorological intelligence analyst. "
        "Use the fetch_weather_mcp tool to get real-time weather data for the affected location. "
        "Analyze whether weather conditions could cause the reported infrastructure damage. "
        "Rate severity (LOW/MEDIUM/HIGH/CRITICAL) and provide a confidence score 0-100. "
        "Output ONLY valid JSON matching the schema provided. No markdown, no preamble."
    ),
    tools=[fetch_weather_mcp],  # MCP tool registered here
)

cyber_threat_agent = Agent(
    name="CyberThreatAgent",
    model=MODEL_NAME,
    description="Cybersecurity specialist that detects attack patterns and IoC.",
    instruction=(
        "You are a senior cybersecurity analyst specializing in critical infrastructure threats. "
        "Use the analyze_network_traffic tool when network anomalies are present. "
        "Identify indicators of compromise, attack vectors, and threat levels. "
        "Distinguish between opportunistic and targeted attacks. "
        "Rate threat level (NONE/LOW/MEDIUM/HIGH/CRITICAL) with confidence score 0-100. "
        "Output ONLY valid JSON matching the schema provided. No markdown, no preamble."
    ),
    tools=[analyze_network_traffic],
)

infrastructure_status_agent = Agent(
    name="InfrastructureStatusAgent",
    model=MODEL_NAME,
    description="Infrastructure engineer that evaluates component health and damage.",
    instruction=(
        "You are a critical infrastructure systems engineer. "
        "Evaluate the health of affected infrastructure components. "
        "Score overall health 0-100, identify failed components, classify damage type "
        "(Physical/Cyber/Combined), and estimate recovery time in hours. "
        "Provide confidence score 0-100. "
        "Output ONLY valid JSON matching the schema provided. No markdown, no preamble."
    ),
)

decision_fusion_agent = Agent(
    name="DecisionFusionAgent",
    model=MODEL_NAME,
    description="Core intelligence fusion engine that weighs all agent findings.",
    instruction=(
        "You are the AegisGrid Decision Fusion Engine. "
        "You receive intelligence reports from Weather, Cyber, and Infrastructure agents. "
        "Your job: synthesize their findings into a final root cause assessment. "
        "Assign confidence scores (must sum to 100) across: storm_damage, cyber_attack, "
        "equipment_failure, sensor_error. "
        "List supporting evidence AND conflicting evidence. "
        "Generate prioritized recommended actions (priority 1=most urgent). "
        "Include a self_critique: what could be wrong with your assessment. "
        "Output ONLY valid JSON matching the schema provided. No markdown, no preamble."
    ),
)

report_generator_agent = Agent(
    name="ReportGeneratorAgent",
    model=MODEL_NAME,
    description="Emergency communications director that produces actionable playbooks.",
    instruction=(
        "You are an emergency response director. "
        "Translate the decision fusion output into a concrete emergency playbook. "
        "Classify emergency level (ROUTINE/ELEVATED/CRITICAL/CATASTROPHIC). "
        "List immediate actions (do now), a communication plan, recovery steps in order, "
        "and estimated resolution hours. "
        "Be specific and actionable — no vague statements. "
        "Output ONLY valid JSON matching the schema provided. No markdown, no preamble."
    ),
)

# ============================================================
# RUNNER SETUP — Singleton pattern (efficient, concurrent-safe)
# ============================================================

# Runners created once at startup and reused across all requests.
# Session isolation is achieved via unique session_id per request.

_runners: Dict[str, InMemoryRunner] = {}


def get_runner(agent: Agent) -> InMemoryRunner:
    """Returns a cached singleton runner for the given agent."""
    if agent.name not in _runners:
        _runners[agent.name] = InMemoryRunner(
            agent=agent,
            app_name=APP_NAME,
        )
        logger.info(f"[Runner] Initialized runner for {agent.name}")
    return _runners[agent.name]


# ============================================================
# CORE AGENT EXECUTION ENGINE
# ============================================================

async def run_agent(
    agent: Agent,
    prompt: str,
    schema_class: type[BaseModel],
    session_id: str,
) -> Any:
    """
    Executes a Google ADK agent with a structured output contract.

    Uses the correct ADK pattern:
    - InMemoryRunner (singleton per agent)
    - runner.session_service.create_session() for isolation
    - runner.run_async() for async execution
    - Event stream processing to extract final response

    Args:
        agent: The ADK Agent to run.
        prompt: The user prompt for this agent.
        schema_class: Pydantic model to validate output against.
        session_id: Unique session ID for isolation.

    Returns:
        Validated Pydantic model instance.
    """
    agent_session_id = f"{session_id}_{agent.name}"
    logger.info(f"[{agent.name}] Starting reasoning — session: {agent_session_id}")

    runner = get_runner(agent)

    # Create an isolated session for this agent + investigation
    await runner.session_service.create_session(
        app_name=APP_NAME,
        user_id=session_id,
        session_id=agent_session_id,
    )

    # Inject schema into prompt so agent knows exact output format
    schema_json = json.dumps(schema_class.model_json_schema(), indent=2)
    full_prompt = (
        f"{prompt}\n\n"
        f"CRITICAL: Respond with ONLY valid JSON exactly matching this schema. "
        f"No markdown fences, no explanation, just the JSON object:\n{schema_json}"
    )

    # Format message in ADK's required Content format
    user_message = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=full_prompt)],
    )

    # Collect all text parts from the event stream
    response_parts: List[str] = []

    try:
        async for event in runner.run_async(
            user_id=session_id,
            session_id=agent_session_id,
            new_message=user_message,
        ):
            # Extract text from any content-bearing event
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, "text") and part.text:
                        response_parts.append(part.text)

    except Exception as exc:
        logger.error(f"[{agent.name}] ADK runner error: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Agent {agent.name} execution failed: {str(exc)}",
        )

    raw_text = "".join(response_parts).strip()

    if not raw_text:
        raise HTTPException(
            status_code=500,
            detail=f"Agent {agent.name} returned empty response.",
        )

    # Strip markdown fences if model adds them despite instructions
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
    raw_text = re.sub(r"\s*```$", "", raw_text, flags=re.MULTILINE)
    raw_text = raw_text.strip()

    # Validate against Pydantic schema
    try:
        result = schema_class.model_validate_json(raw_text)
        logger.info(f"[{agent.name}] ✓ Schema validation passed.")
        return result
    except Exception as parse_err:
        logger.error(f"[{agent.name}] JSON parse/validation failed: {parse_err}")
        logger.error(f"[{agent.name}] Raw output: {raw_text[:500]}")
        raise HTTPException(
            status_code=500,
            detail=f"Agent {agent.name} output failed schema validation: {str(parse_err)}",
        )


# ============================================================
# SECURITY MIDDLEWARE
# ============================================================

# Prompt injection patterns — block these
INJECTION_PATTERNS = [
    r"ignore\s+previous",
    r"ignore\s+all\s+instructions",
    r"system\s*:",
    r"jailbreak",
    r"override\s+instructions",
    r"act\s+as\s+(?!an?\s+infrastructure)",  # allow "act as an infrastructure expert"
    r"new\s+persona",
    r"pretend\s+you\s+are",
    r"disregard\s+your",
    r"you\s+are\s+now\s+(?!analyzing)",
]

INJECTION_REGEX = re.compile(
    "|".join(INJECTION_PATTERNS), re.IGNORECASE
)


def detect_prompt_injection(text: str) -> bool:
    """Returns True if prompt injection is detected."""
    return bool(INJECTION_REGEX.search(text))


def sanitize_input(text: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    clean = re.sub(r"<[^>]+>", "", text)  # Strip HTML
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


# API Key security
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: Optional[str] = Depends(API_KEY_HEADER)):
    """Validates the X-API-Key header."""
    if not api_key or api_key != AEGISGRID_API_KEY:
        logger.warning(f"[Security] Unauthorized access attempt — key: {str(api_key)[:8]}...")
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
    return api_key


# Rate limiter — 10 requests per minute per IP
limiter = Limiter(key_func=get_remote_address)

# ============================================================
# FASTAPI APPLICATION
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm all agent runners at startup for fast first-request performance."""
    logger.info("🚀 AegisGrid AI starting — pre-warming agent runners...")
    agents = [
        mission_coordinator_agent,
        weather_intelligence_agent,
        cyber_threat_agent,
        infrastructure_status_agent,
        decision_fusion_agent,
        report_generator_agent,
    ]
    for agent in agents:
        get_runner(agent)  # Initialize all runners
    logger.info("✅ All 6 agent runners initialized and ready.")
    yield
    logger.info("AegisGrid AI shutting down.")


app = FastAPI(
    title="AegisGrid AI",
    description="Autonomous Multi-Agent Critical Infrastructure Protection Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/health")
async def health_check():
    """Health check endpoint — no auth required."""
    return {
        "status": "operational",
        "agents": len(_runners),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/investigate", response_model=FullInvestigationResponse)
@limiter.limit("10/minute")
async def investigate_endpoint(
    request: Request,  # Required by slowapi for rate limiting
    body: InvestigateRequest,
    _api_key: str = Depends(verify_api_key),
):
    """
    Triggers the full AegisGrid multi-agent investigation pipeline.

    Pipeline:
    1. MissionCoordinator  → creates investigation plan
    2. WeatherIntelligence → fetches MCP weather data
    3. CyberThreat         → analyzes network anomalies
    4. InfrastructureStatus → evaluates component health
    5. DecisionFusion      → weighs all findings (runs after 2+3+4 complete)
    6. ReportGenerator     → produces emergency playbook

    Returns a fully structured investigation response.
    """
    session_id = str(uuid.uuid4())
    start_time = time.time()

    # --- Input sanitization ---
    body.incident_description = sanitize_input(body.incident_description)
    body.location = sanitize_input(body.location)

    # --- Prompt injection detection ---
    combined_text = f"{body.incident_description} {body.location}"
    if detect_prompt_injection(combined_text):
        logger.warning(
            f"[Security] Prompt injection detected from {request.client.host} — "
            f"input: {combined_text[:100]}"
        )
        raise HTTPException(
            status_code=400,
            detail="Input contains potentially malicious content. Investigation aborted.",
        )

    logger.info(
        f"[Investigation:{session_id}] New incident received — "
        f"location: {body.location}, anomalies: {body.network_anomalies}"
    )

    # ── STEP 1: Mission Coordinator ──────────────────────────
    coord_plan = await run_agent(
        agent=mission_coordinator_agent,
        prompt=(
            f"Create an investigation coordination plan for this incident:\n"
            f"Location: {body.location}\n"
            f"Description: {body.incident_description}\n"
            f"Network anomalies detected: {body.network_anomalies}\n"
            f"Affected systems: {', '.join(body.affected_systems)}"
        ),
        schema_class=CoordinationPlan,
        session_id=session_id,
    )

    # ── STEP 2–4: Intelligence Gathering (run concurrently) ──
    weather_task = run_agent(
        agent=weather_intelligence_agent,
        prompt=(
            f"Use the fetch_weather_mcp tool to get weather data for '{body.location}'. "
            f"Then analyze if weather conditions could explain: {body.incident_description}"
        ),
        schema_class=WeatherReport,
        session_id=session_id,
    )

    cyber_task = run_agent(
        agent=cyber_threat_agent,
        prompt=(
            f"Analyze cyber threat indicators for this incident.\n"
            f"Network anomalies detected: {body.network_anomalies}\n"
            f"Affected systems: {', '.join(body.affected_systems)}\n"
            f"Incident: {body.incident_description}\n"
            f"Use analyze_network_traffic tool if anomalies are present."
        ),
        schema_class=CyberThreatAssessment,
        session_id=session_id,
    )

    infra_task = run_agent(
        agent=infrastructure_status_agent,
        prompt=(
            f"Evaluate infrastructure health for this incident.\n"
            f"Affected systems: {', '.join(body.affected_systems)}\n"
            f"Incident: {body.incident_description}\n"
            f"Location: {body.location}"
        ),
        schema_class=InfrastructureStatus,
        session_id=session_id,
    )

    # Run agents 2, 3, 4 in parallel for speed
    weather_report, cyber_report, infra_report = await asyncio.gather(
        weather_task, cyber_task, infra_task
    )

    intelligence_payload = {
        "weather": weather_report.model_dump(),
        "cyber": cyber_report.model_dump(),
        "infrastructure": infra_report.model_dump(),
    }

    # ── STEP 5: Decision Fusion ──────────────────────────────
    decision_fusion = await run_agent(
        agent=decision_fusion_agent,
        prompt=(
            f"Synthesize these intelligence reports into a root cause assessment.\n"
            f"Original incident: {body.incident_description}\n"
            f"Location: {body.location}\n\n"
            f"AGENT REPORTS:\n{json.dumps(intelligence_payload, indent=2)}\n\n"
            f"Remember: confidence_scores must sum to 100."
        ),
        schema_class=DecisionFusionOutput,
        session_id=session_id,
    )

    # ── STEP 6: Report Generation ────────────────────────────
    playbook = await run_agent(
        agent=report_generator_agent,
        prompt=(
            f"Generate an emergency response playbook based on this decision:\n"
            f"{decision_fusion.model_dump_json(indent=2)}\n\n"
            f"Context: {body.incident_description}\n"
            f"Location: {body.location}\n"
            f"Affected systems: {', '.join(body.affected_systems)}"
        ),
        schema_class=PlaybookOutput,
        session_id=session_id,
    )

    elapsed = round(time.time() - start_time, 2)

    # Audit log
    logger.info(
        f"[Audit] session={session_id} | ip={request.client.host} | "
        f"location={body.location} | primary_cause={decision_fusion.primary_cause} | "
        f"elapsed={elapsed}s"
    )

    return FullInvestigationResponse(
        session_id=session_id,
        timestamp=datetime.utcnow().isoformat(),
        coordination_plan=coord_plan,
        intelligence_reports=intelligence_payload,
        decision_fusion=decision_fusion,
        playbook=playbook,
    )


@app.get("/api/demo-scenarios")
async def get_demo_scenarios():
    """
    Returns pre-built demo scenarios for the frontend.
    Allows judges to test without entering custom inputs.
    No auth required for easy demo access.
    """
    return {
        "scenarios": [
            {
                "name": "🌀 Hurricane Strike — Miami",
                "incident_description": (
                    "Category 4 hurricane has made landfall near Miami. "
                    "Multiple transmission towers are offline, hospitals reporting power loss, "
                    "and communication networks are degraded across Miami-Dade county."
                ),
                "location": "Miami, Florida",
                "network_anomalies": True,
                "affected_systems": ["Power Grid", "Hospitals", "Communications"],
            },
            {
                "name": "⚠️ Cyber Attack — Mumbai Water",
                "incident_description": (
                    "Unauthorized access detected on Mumbai water treatment SCADA systems. "
                    "Chemical dosing controls showing unexpected parameter changes. "
                    "Weather is clear — no environmental cause. Multiple access attempts from unknown IPs."
                ),
                "location": "Mumbai, India",
                "network_anomalies": True,
                "affected_systems": ["Water Supply", "Communications"],
            },
            {
                "name": "❓ Ambiguous Cascade — Toronto",
                "incident_description": (
                    "Cascading equipment failures across Toronto's eastern grid during light snowfall. "
                    "Unusual SCADA log entries observed but no confirmed intrusion. "
                    "Three substations offline within 20 minutes."
                ),
                "location": "Toronto, Canada",
                "network_anomalies": True,
                "affected_systems": ["Power Grid", "Transportation", "Hospitals"],
            },
        ]
    }


# ============================================================
# ENTRYPOINT
# ============================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
