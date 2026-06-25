import { useState, useEffect, useRef } from "react";

// ── MOCK DATA ────────────────────────────────────────────────
const DEMO_SCENARIOS = [
  {
    name: "🌀 Hurricane Strike — Miami",
    incident_description:
      "Category 4 hurricane has made landfall near Miami. Multiple transmission towers are offline, hospitals reporting power loss, and communication networks are degraded across Miami-Dade county.",
    location: "Miami, Florida",
    network_anomalies: true,
    affected_systems: ["Power Grid", "Hospitals", "Communications"],
  },
  {
    name: "⚠️ Cyber Attack — Mumbai Water",
    incident_description:
      "Unauthorized access detected on Mumbai water treatment SCADA systems. Chemical dosing controls showing unexpected parameter changes. Weather is clear — no environmental cause.",
    location: "Mumbai, India",
    network_anomalies: true,
    affected_systems: ["Water Supply", "Communications"],
  },
  {
    name: "❓ Ambiguous Cascade — Toronto",
    incident_description:
      "Cascading equipment failures across Toronto's eastern grid during light snowfall. Unusual SCADA log entries observed but no confirmed intrusion. Three substations offline within 20 minutes.",
    location: "Toronto, Canada",
    network_anomalies: true,
    affected_systems: ["Power Grid", "Transportation", "Hospitals"],
  },
];

const MOCK_RESPONSES = [
  {
    session_id: "ae3f-9b21-cc04",
    timestamp: new Date().toISOString(),
    coordination_plan: {
      incident_severity: "CRITICAL",
      focus_areas: ["Storm surge impact on transmission infrastructure", "Opportunistic cyber activity during emergency", "Hospital backup power status"],
      initial_hypothesis: "Category 4 hurricane causing direct physical damage to transmission towers and substations across Miami-Dade.",
    },
    intelligence_reports: {
      weather: {
        location: "Miami, Florida",
        conditions: "Category 4 hurricane — sustained winds 220 km/h, storm surge 4.2m",
        wind_speed_kmh: 220,
        precipitation_mm: 340,
        severity: "CRITICAL",
        weather_contribution: "Direct physical cause — wind speed sufficient to collapse transmission towers rated for 160 km/h.",
        confidence: 96,
      },
      cyber: {
        threat_level: "LOW",
        indicators_of_compromise: ["Elevated port scanning from 3 external IPs — consistent with opportunistic probing during outage"],
        attack_vector: null,
        opportunistic_vs_targeted: "OPPORTUNISTIC",
        confidence: 88,
      },
      infrastructure: {
        overall_health_score: 24,
        failed_components: ["Transmission Tower T-17", "Substation Brickell-East", "Fiber Ring Node FRN-09", "Hospital Backup Generator HBG-03"],
        damage_type: "Physical",
        estimated_recovery_hours: 72,
        confidence: 91,
      },
    },
    decision_fusion: {
      primary_cause: "Storm Damage — Category 4 hurricane direct physical impact",
      confidence_scores: { storm_damage: 91, cyber_attack: 4, equipment_failure: 4, sensor_error: 1 },
      evidence_summary: [
        "Wind speeds 220 km/h exceed tower rating of 160 km/h",
        "4 physical components confirmed offline",
        "Damage pattern consistent with wind-driven failure cascade",
        "No confirmed malware signatures or intrusion indicators",
      ],
      conflicting_evidence: [
        "Opportunistic port scanning detected from 3 IPs — low confidence attack",
        "Substation SCADA logs show 4-minute gap before storm arrival",
      ],
      recommended_actions: [
        { priority: 1, action: "Activate mutual aid agreements with Florida Power & Light", rationale: "Hospital backup generators estimated 8-hour fuel reserve", responsible_party: "Emergency Operations Center" },
        { priority: 2, action: "Deploy repair crews to Transmission Tower T-17", rationale: "Restoration of T-17 restores 40% of affected grid capacity", responsible_party: "Grid Operations" },
        { priority: 3, action: "Fuel resupply to Hospital Backup Generator HBG-03", rationale: "Critical care patients at risk after 8 hours", responsible_party: "Emergency Services" },
        { priority: 4, action: "Increase network monitoring for opportunistic cyber activity", rationale: "3 external IPs probing during outage window", responsible_party: "SOC Team" },
        { priority: 5, action: "Issue public communications on estimated restoration timeline", rationale: "72-hour recovery estimate — public needs coordinated messaging", responsible_party: "Public Affairs" },
      ],
      self_critique: "Assessment relies on MCP weather data accuracy. The 4-minute SCADA log gap before storm arrival warrants further forensic review to rule out pre-positioning activity.",
    },
    playbook: {
      emergency_level: "CRITICAL",
      immediate_actions: [
        "Alert all hospitals to conserve backup generator fuel — 8-hour reserve window",
        "Dispatch structural assessment team to Transmission Tower T-17",
        "Activate State Emergency Operations Center",
        "Issue AMBER-level public alert for Miami-Dade county",
      ],
      communication_plan: "Unified command at EOC. Public briefings every 2 hours via Emergency Alert System. Hospital coordinators on direct radio link. Media blackout on SCADA vulnerability details.",
      recovery_steps: [
        "Hour 0–4: Emergency fuel delivery to all hospital generators",
        "Hour 4–12: Structural repair team assessment of T-17 and Brickell-East",
        "Hour 12–36: Primary transmission restoration for hospital grid segment",
        "Hour 36–72: Full grid restoration, fiber ring repair, public communications",
      ],
      estimated_resolution_hours: 72,
    },
  },
  {
    session_id: "bb12-7a44-dd91",
    timestamp: new Date().toISOString(),
    coordination_plan: {
      incident_severity: "CRITICAL",
      focus_areas: ["SCADA intrusion vectors", "Chemical dosing system integrity", "Network lateral movement indicators"],
      initial_hypothesis: "Targeted cyberattack on water treatment SCADA — clear weather eliminates environmental cause.",
    },
    intelligence_reports: {
      weather: {
        location: "Mumbai, India",
        conditions: "Clear skies, 28°C, humidity 62%",
        wind_speed_kmh: 12,
        precipitation_mm: 0,
        severity: "LOW",
        weather_contribution: "No weather contribution — environmental cause eliminated.",
        confidence: 99,
      },
      cyber: {
        threat_level: "CRITICAL",
        indicators_of_compromise: [
          "Unauthorized SCADA parameter modification at 03:14 UTC",
          "VPN credential stuffing attack — 847 failed attempts preceding breach",
          "Lateral movement detected across OT network segments",
          "Known APT signature: Sandworm group TTPs matched",
        ],
        attack_vector: "VPN credential compromise → SCADA OT network lateral movement",
        opportunistic_vs_targeted: "TARGETED",
        confidence: 94,
      },
      infrastructure: {
        overall_health_score: 41,
        failed_components: ["Chemical Dosing Controller CDC-07", "SCADA Historian DB", "OT Network Segment B"],
        damage_type: "Cyber",
        estimated_recovery_hours: 18,
        confidence: 87,
      },
    },
    decision_fusion: {
      primary_cause: "Targeted Cyberattack — APT intrusion on water treatment SCADA",
      confidence_scores: { storm_damage: 0, cyber_attack: 94, equipment_failure: 5, sensor_error: 1 },
      evidence_summary: [
        "Clear weather eliminates environmental cause with 99% confidence",
        "APT signatures match Sandworm group TTPs",
        "Credential stuffing attack precedes SCADA parameter changes",
        "Lateral movement across OT network segments confirmed",
      ],
      conflicting_evidence: [
        "Chemical dosing controller CDC-07 has documented failure history — hardware failure not fully excluded",
      ],
      recommended_actions: [
        { priority: 1, action: "Immediately isolate SCADA OT network from IT network", rationale: "Prevent further lateral movement and data exfiltration", responsible_party: "CISO / SOC" },
        { priority: 2, action: "Revert chemical dosing to manual control — verify water safety", rationale: "Public health risk if dosing parameters compromised", responsible_party: "Water Treatment Operations" },
        { priority: 3, action: "Notify CERT-In and law enforcement", rationale: "Critical infrastructure attack — mandatory reporting requirement", responsible_party: "Legal / Compliance" },
        { priority: 4, action: "Forensic preservation of SCADA logs and network captures", rationale: "Evidence chain for attribution and prosecution", responsible_party: "Incident Response Team" },
        { priority: 5, action: "Issue boil-water advisory for affected districts", rationale: "Precautionary measure while dosing system integrity confirmed", responsible_party: "Public Health" },
      ],
      self_critique: "APT attribution to Sandworm is based on TTP matching — formal attribution requires government-level intelligence confirmation. Hardware failure on CDC-07 should be physically inspected.",
    },
    playbook: {
      emergency_level: "CRITICAL",
      immediate_actions: [
        "Air-gap SCADA network — disconnect all external connections immediately",
        "Switch all chemical dosing to manual operation",
        "Issue precautionary boil-water advisory for 2.1M affected residents",
        "Alert CERT-In National Cyber Coordination Centre",
      ],
      communication_plan: "Crisis communications team activated. No public disclosure of SCADA vulnerability specifics. Coordinate with CERT-In on attribution messaging. 1-hour public briefing cycle.",
      recovery_steps: [
        "Hour 0–2: Network isolation and manual operations established",
        "Hour 2–6: Forensic team on-site, evidence preservation",
        "Hour 6–12: Credential rotation, patch deployment, OT hardening",
        "Hour 12–18: Controlled reconnection with enhanced monitoring, lift boil-water advisory",
      ],
      estimated_resolution_hours: 18,
    },
  },
  {
    session_id: "cc77-5e33-aa15",
    timestamp: new Date().toISOString(),
    coordination_plan: {
      incident_severity: "HIGH",
      focus_areas: ["Equipment age and maintenance records", "SCADA log forensics", "Cascade failure sequence"],
      initial_hypothesis: "Ambiguous — light snowfall insufficient to cause cascade but SCADA anomalies warrant cyber investigation.",
    },
    intelligence_reports: {
      weather: {
        location: "Toronto, Canada",
        conditions: "Light snow, -3°C, 15 cm accumulation",
        wind_speed_kmh: 28,
        precipitation_mm: 15,
        severity: "LOW",
        weather_contribution: "Minor — snow accumulation insufficient to cause tower failure but may have contributed to transformer thermal stress.",
        confidence: 72,
      },
      cyber: {
        threat_level: "MEDIUM",
        indicators_of_compromise: [
          "Unusual SCADA log entries 4 minutes before first substation failure",
          "Incomplete log sequence — possible log tampering",
        ],
        attack_vector: "Possible SCADA manipulation — inconclusive",
        opportunistic_vs_targeted: "OPPORTUNISTIC",
        confidence: 51,
      },
      infrastructure: {
        overall_health_score: 38,
        failed_components: ["Substation Scarborough-North", "Substation East York", "Substation Pickering-West"],
        damage_type: "Combined",
        estimated_recovery_hours: 24,
        confidence: 78,
      },
    },
    decision_fusion: {
      primary_cause: "Equipment Failure — aging transformer cascade, possible contributing factors",
      confidence_scores: { storm_damage: 15, cyber_attack: 28, equipment_failure: 52, sensor_error: 5 },
      evidence_summary: [
        "All three failed substations have transformers exceeding 30-year service life",
        "Cascade pattern consistent with thermal stress failure under cold load",
        "Weather insufficient as sole cause but cold snap increases transformer failure probability",
      ],
      conflicting_evidence: [
        "SCADA log gap 4 minutes before first failure — cannot rule out manipulation",
        "Cyber confidence 51% — agents disagree on primary cause",
        "Incomplete evidence — requires physical inspection for definitive ruling",
      ],
      recommended_actions: [
        { priority: 1, action: "Restore power via backup routing through Lakeshore substation", rationale: "Fastest path to restoration while investigation continues", responsible_party: "Grid Operations" },
        { priority: 2, action: "Physical inspection of transformer condition at all three sites", rationale: "Distinguish physical failure from cyber-induced trip", responsible_party: "Engineering Team" },
        { priority: 3, action: "Forensic analysis of SCADA log gap", rationale: "4-minute gap before failure is anomalous and must be explained", responsible_party: "Cybersecurity Team" },
        { priority: 4, action: "Expedite replacement of aging transformers on watchlist", rationale: "Preventive measure — 8 additional transformers flagged in recent audit", responsible_party: "Asset Management" },
        { priority: 5, action: "Monitor for further cascade indicators across Ontario grid", rationale: "If equipment failure, thermal stress may trigger additional failures", responsible_party: "Grid Operations" },
      ],
      self_critique: "This is a genuinely ambiguous case. Equipment failure is the most likely cause but cyber involvement cannot be excluded without SCADA forensics. Confidence in primary_cause is moderate at best — recommend treating as cyber incident until proven otherwise.",
    },
    playbook: {
      emergency_level: "ELEVATED",
      immediate_actions: [
        "Reroute power through Lakeshore backup corridor — estimated 40% capacity restoration",
        "Deploy physical inspection teams to all three failed substations",
        "Preserve all SCADA logs — forensic hold order issued",
        "Alert Ontario Energy Board of potential multi-cause event",
      ],
      communication_plan: "Technical briefing to Ministry of Energy within 2 hours. Public messaging: equipment fault under investigation, no public health risk. Avoid confirming or denying cyber involvement publicly.",
      recovery_steps: [
        "Hour 0–4: Backup routing restores partial power to residential areas",
        "Hour 4–12: Physical inspection determines failure cause at each substation",
        "Hour 12–20: Targeted repairs or transformer bypass at confirmed failure sites",
        "Hour 20–24: Full restoration pending SCADA forensic clearance",
      ],
      estimated_resolution_hours: 24,
    },
  },
];

const AGENT_SEQUENCE = [
  { id: "coord", name: "Mission Coordinator", icon: "⬡", color: "#00d4ff" },
  { id: "weather", name: "Weather Intelligence", icon: "◈", color: "#10b981" },
  { id: "cyber", name: "Cyber Threat", icon: "◉", color: "#f59e0b" },
  { id: "infra", name: "Infrastructure Status", icon: "◫", color: "#8b5cf6" },
  { id: "fusion", name: "Decision Fusion", icon: "◎", color: "#ef4444" },
  { id: "report", name: "Report Generator", icon: "◧", color: "#00d4ff" },
];

const ALL_SYSTEMS = ["Power Grid", "Water Supply", "Communications", "Hospitals", "Transportation"];

// ── UTILITY ──────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function PulsingDot({ color = "#10b981" }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function ConfidenceBar({ label, value, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 100);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs tracking-widest uppercase" style={{ color: "#8892a4" }}>{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "#1a2235" }}>
        <div
          className="h-1.5 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── API CONFIG ────────────────────────────────────────────────
// Switch USE_REAL_API to true once your FastAPI backend is running.
// BACKEND_URL: local dev = "http://localhost:8000"
//              deployed  = "https://your-app.onrender.com" (or HF Spaces URL)
// API_KEY must match AEGISGRID_API_KEY in your .env file.
const USE_REAL_API = false; // ← flip to true when backend is running
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY || "aegisgrid-dev-key-change-in-prod";

// ── MAIN APP ─────────────────────────────────────────────────
export default function AegisGrid() {
  const time = useClock();
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [customInput, setCustomInput] = useState({
    incident_description: "",
    location: "",
    network_anomalies: false,
    affected_systems: [],
  });
  const [agentStates, setAgentStates] = useState({});
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const [apiError, setApiError] = useState(null);
  const [backendStatus, setBackendStatus] = useState("unknown"); // "online"|"offline"|"unknown"
  const resultRef = useRef(null);

  // Health-check backend on mount (non-blocking)
  useEffect(() => {
    if (!USE_REAL_API) return;
    fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(4000) })
      .then((r) => setBackendStatus(r.ok ? "online" : "offline"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  function loadScenario(s) {
    setSelectedScenario(s);
    setApiError(null);
    setCustomInput({
      incident_description: s.incident_description,
      location: s.location,
      network_anomalies: s.network_anomalies,
      affected_systems: [...s.affected_systems],
    });
    setResult(null);
    setAgentStates({});
    setTimelineEvents([]);
  }

  function toggleSystem(sys) {
    setCustomInput((prev) => ({
      ...prev,
      affected_systems: prev.affected_systems.includes(sys)
        ? prev.affected_systems.filter((s) => s !== sys)
        : [...prev.affected_systems, sys],
    }));
  }

  // Animate agents during investigation (used by both real + mock paths)
  function startAgentAnimation() {
    const delays      = [0,    800,  800,  800,  1800, 3200];
    const completions = [1200, 2200, 2200, 2400, 3800, 4600];
    AGENT_SEQUENCE.forEach((agent, i) => {
      setTimeout(() => {
        setAgentStates((prev) => ({ ...prev, [agent.id]: "analyzing" }));
        addTimelineEvent(agent.name + " activated", "INFO");
      }, delays[i]);
      setTimeout(() => {
        setAgentStates((prev) => ({ ...prev, [agent.id]: "complete" }));
        addTimelineEvent(agent.name + " complete", i === 4 ? "WARNING" : "INFO");
      }, completions[i]);
    });
  }

  function finishInvestigation(data) {
    setResult(data);
    setActiveTab("results");
    setIsRunning(false);
    addTimelineEvent(
      "Investigation complete — " + data.decision_fusion.primary_cause,
      "CRITICAL"
    );
    setTimeout(() => {
      if (resultRef.current) resultRef.current.scrollIntoView({ behavior: "smooth" });
    }, 200);
  }

  async function runInvestigation() {
    if (!customInput.incident_description || !customInput.location) return;
    setIsRunning(true);
    setResult(null);
    setAgentStates({});
    setTimelineEvents([]);
    setApiError(null);
    setActiveTab("live");

    // Always animate agents visually regardless of API/mock
    startAgentAnimation();

    if (USE_REAL_API) {
      // ── REAL API PATH ─────────────────────────────────────
      try {
        addTimelineEvent("Connecting to AegisGrid backend...", "INFO");

        const controller = new AbortController();
        // 120s timeout — real agents take time (6 LLM calls)
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch(`${BACKEND_URL}/api/investigate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
          body: JSON.stringify({
            incident_description: customInput.incident_description,
            location: customInput.location,
            network_anomalies: customInput.network_anomalies,
            affected_systems: customInput.affected_systems,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let detail = `Server error ${response.status}`;
          try {
            const errBody = await response.json();
            detail = errBody.detail || detail;
          } catch (_) {}
          throw new Error(detail);
        }

        const data = await response.json();
        addTimelineEvent("Backend response received ✓", "INFO");

        // Wait for animations to finish before showing results
        const elapsed = Date.now();
        const minWait = 5200; // match animation length
        const remaining = minWait - (Date.now() - elapsed);
        setTimeout(() => finishInvestigation(data), Math.max(0, remaining));

      } catch (err) {
        setIsRunning(false);
        if (err.name === "AbortError") {
          setApiError("Request timed out after 120s. Backend may still be starting up — try again.");
        } else {
          setApiError(`API error: ${err.message}. Showing demo data instead.`);
        }
        // Graceful fallback to mock data so demo never breaks
        const mockIdx = selectedScenario
          ? DEMO_SCENARIOS.findIndex((s) => s.name === selectedScenario.name)
          : 0;
        setTimeout(() => finishInvestigation(MOCK_RESPONSES[Math.max(0, mockIdx)]), 5200);
      }

    } else {
      // ── MOCK DATA PATH (USE_REAL_API = false) ─────────────
      const mockIdx = selectedScenario
        ? DEMO_SCENARIOS.findIndex((s) => s.name === selectedScenario.name)
        : 0;
      const mockResponse = MOCK_RESPONSES[Math.max(0, mockIdx)];
      setTimeout(() => finishInvestigation(mockResponse), 5200);
    }
  }

  function addTimelineEvent(event, severity) {
    const now = new Date();
    const ts = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0") + ":" + now.getSeconds().toString().padStart(2, "0");
    setTimelineEvents((prev) => [...prev, { ts, event, severity }]);
  }

  const sevColor = { INFO: "#8892a4", WARNING: "#f59e0b", CRITICAL: "#ef4444" };
  const priColor = ["", "#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#6b7280"];

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ background: "#070d1a", minHeight: "100vh", color: "#c9d1e0", fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}>

      {/* ── HEADER ── */}
      <header style={{ background: "#080f1f", borderBottom: "1px solid #0d1f3c" }} className="px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="#00d4ff" strokeWidth="1.5" fill="none" />
              <polygon points="14,6 22,10 22,18 14,22 6,18 6,10" stroke="#00d4ff" strokeWidth="1" fill="#00d4ff" fillOpacity="0.08" />
              <circle cx="14" cy="14" r="3" fill="#00d4ff" />
            </svg>
            <span className="text-lg font-bold tracking-[0.2em]" style={{ color: "#00d4ff", letterSpacing: "0.25em" }}>AEGISGRID</span>
            <span className="text-xs tracking-widest" style={{ color: "#3a5070" }}>AI</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "#0d1f3c" }}>
            <PulsingDot color={USE_REAL_API ? (backendStatus === "online" ? "#10b981" : backendStatus === "offline" ? "#ef4444" : "#f59e0b") : "#10b981"} />
            <span className="text-xs tracking-widest" style={{ color: USE_REAL_API ? (backendStatus === "online" ? "#10b981" : backendStatus === "offline" ? "#ef4444" : "#f59e0b") : "#10b981" }}>
              {USE_REAL_API ? (backendStatus === "online" ? "BACKEND ONLINE" : backendStatus === "offline" ? "BACKEND OFFLINE" : "CHECKING...") : "DEMO MODE"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <div className="text-xs font-mono" style={{ color: "#3a5070" }}>UTC</div>
            <div className="text-sm font-mono font-bold" style={{ color: "#00d4ff" }}>
              {time.toUTCString().split(" ")[4]}
            </div>
          </div>
          <button
            onClick={() => { setResult(null); setAgentStates({}); setTimelineEvents([]); setApiError(null); setCustomInput({ incident_description: "", location: "", network_anomalies: false, affected_systems: [] }); setSelectedScenario(null); setActiveTab("input"); }}
            className="px-4 py-2 text-xs tracking-widest font-bold rounded transition-all"
            style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444" }}
            onMouseEnter={e => e.target.style.background = "#ef444420"}
            onMouseLeave={e => e.target.style.background = "transparent"}
          >
            ⊕ NEW INCIDENT
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── DEMO SCENARIOS ── */}
        <div>
          <div className="text-xs tracking-widest mb-3" style={{ color: "#3a5070" }}>// LOAD DEMO SCENARIO</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DEMO_SCENARIOS.map((s) => (
              <button
                key={s.name}
                onClick={() => loadScenario(s)}
                className="text-left p-4 rounded transition-all"
                style={{
                  background: selectedScenario?.name === s.name ? "#0d1f3c" : "#0a1628",
                  border: selectedScenario?.name === s.name ? "1px solid #00d4ff" : "1px solid #0d1f3c",
                  boxShadow: selectedScenario?.name === s.name ? "0 0 12px #00d4ff30" : "none",
                }}
              >
                <div className="text-sm font-bold mb-1" style={{ color: selectedScenario?.name === s.name ? "#00d4ff" : "#c9d1e0" }}>{s.name}</div>
                <div className="text-xs leading-relaxed line-clamp-2" style={{ color: "#8892a4" }}>{s.incident_description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-1" style={{ borderBottom: "1px solid #0d1f3c" }}>
          {["input", "live", "results"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 text-xs tracking-widest transition-all"
              style={{
                color: activeTab === tab ? "#00d4ff" : "#3a5070",
                borderBottom: activeTab === tab ? "2px solid #00d4ff" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {tab === "input" ? "01 / INCIDENT INPUT" : tab === "live" ? "02 / AGENT ACTIVITY" : "03 / INVESTIGATION RESULTS"}
            </button>
          ))}
        </div>

        {/* ── ERROR / STATUS BANNER ── */}
        {apiError && (
          <div className="px-4 py-3 rounded text-xs" style={{ background: "#ef444415", border: "1px solid #ef444450", color: "#ef4444" }}>
            ⚠ {apiError}
          </div>
        )}
        {!USE_REAL_API && (
          <div className="px-4 py-2 rounded text-xs" style={{ background: "#00d4ff08", border: "1px solid #00d4ff20", color: "#3a5070" }}>
            ◎ Demo mode — showing realistic mock data. Set <code style={{color:"#00d4ff"}}>USE_REAL_API = true</code> in App.jsx to connect your FastAPI backend.
          </div>
        )}


        {activeTab === "input" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: "#3a5070" }}>INCIDENT DESCRIPTION</label>
                <textarea
                  value={customInput.incident_description}
                  onChange={(e) => setCustomInput((p) => ({ ...p, incident_description: e.target.value }))}
                  rows={5}
                  placeholder="Describe the incident in detail..."
                  className="w-full px-4 py-3 rounded text-sm resize-none outline-none"
                  style={{ background: "#0a1628", border: "1px solid #0d1f3c", color: "#c9d1e0", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#00d4ff"}
                  onBlur={e => e.target.style.borderColor = "#0d1f3c"}
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: "#3a5070" }}>LOCATION / REGION</label>
                <input
                  value={customInput.location}
                  onChange={(e) => setCustomInput((p) => ({ ...p, location: e.target.value }))}
                  placeholder="City, Region"
                  className="w-full px-4 py-3 rounded text-sm outline-none"
                  style={{ background: "#0a1628", border: "1px solid #0d1f3c", color: "#c9d1e0", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#00d4ff"}
                  onBlur={e => e.target.style.borderColor = "#0d1f3c"}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCustomInput((p) => ({ ...p, network_anomalies: !p.network_anomalies }))}
                  className="relative w-12 h-6 rounded-full transition-all"
                  style={{ background: customInput.network_anomalies ? "#00d4ff" : "#0d1f3c" }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 rounded-full transition-all"
                    style={{ background: "#fff", left: customInput.network_anomalies ? "28px" : "4px" }}
                  />
                </button>
                <span className="text-xs tracking-widest" style={{ color: customInput.network_anomalies ? "#00d4ff" : "#3a5070" }}>
                  NETWORK ANOMALIES DETECTED
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: "#3a5070" }}>AFFECTED SYSTEMS</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SYSTEMS.map((sys) => {
                    const active = customInput.affected_systems.includes(sys);
                    return (
                      <button
                        key={sys}
                        onClick={() => toggleSystem(sys)}
                        className="px-3 py-2.5 rounded text-xs tracking-wider text-left transition-all"
                        style={{
                          background: active ? "#0d1f3c" : "#0a1628",
                          border: active ? "1px solid #00d4ff" : "1px solid #0d1f3c",
                          color: active ? "#00d4ff" : "#8892a4",
                          boxShadow: active ? "0 0 8px #00d4ff20" : "none",
                        }}
                      >
                        <span className="mr-2">{active ? "■" : "□"}</span>{sys.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={runInvestigation}
                disabled={isRunning || !customInput.incident_description || !customInput.location}
                className="w-full py-4 text-sm tracking-[0.3em] font-bold rounded transition-all disabled:opacity-40"
                style={{
                  background: isRunning ? "#0d1f3c" : "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  color: "#fff",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  boxShadow: isRunning ? "none" : "0 0 20px #ef444440",
                }}
              >
                {isRunning ? "◎ INVESTIGATING..." : "◉ LAUNCH INVESTIGATION"}
              </button>
              {/* Infrastructure health grid */}
              <div>
                <div className="text-xs tracking-widest mb-2" style={{ color: "#3a5070" }}>INFRASTRUCTURE MONITOR</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {ALL_SYSTEMS.map((sys) => {
                    const affected = customInput.affected_systems.includes(sys);
                    const status = affected ? (result ? "CRITICAL" : "DEGRADED") : "NOMINAL";
                    const col = status === "CRITICAL" ? "#ef4444" : status === "DEGRADED" ? "#f59e0b" : "#10b981";
                    return (
                      <div key={sys} className="p-2 rounded text-center" style={{ background: "#0a1628", border: `1px solid ${col}30` }}>
                        <div className="text-lg mb-1">{sys === "Power Grid" ? "⚡" : sys === "Water Supply" ? "💧" : sys === "Communications" ? "📡" : sys === "Hospitals" ? "🏥" : "🚦"}</div>
                        <div className="text-xs" style={{ color: col, fontSize: "9px" }}>{status}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: LIVE AGENTS ── */}
        {activeTab === "live" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="text-xs tracking-widest mb-3" style={{ color: "#3a5070" }}>// AGENT STATUS</div>
              <div className="space-y-2">
                {AGENT_SEQUENCE.map((agent) => {
                  const state = agentStates[agent.id] || "idle";
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-4 px-4 py-3 rounded"
                      style={{
                        background: "#0a1628",
                        border: `1px solid ${state === "complete" ? agent.color + "50" : state === "analyzing" ? agent.color + "30" : "#0d1f3c"}`,
                        transition: "all 0.4s",
                      }}
                    >
                      <span className="text-xl" style={{ color: state === "idle" ? "#1e2d42" : agent.color }}>{agent.icon}</span>
                      <div className="flex-1">
                        <div className="text-xs tracking-wider" style={{ color: state === "idle" ? "#3a5070" : "#c9d1e0" }}>{agent.name.toUpperCase()}</div>
                      </div>
                      <div className="text-xs tracking-widest px-2 py-1 rounded" style={{
                        background: state === "complete" ? agent.color + "20" : state === "analyzing" ? "#f59e0b20" : "#0d1f3c",
                        color: state === "complete" ? agent.color : state === "analyzing" ? "#f59e0b" : "#3a5070",
                      }}>
                        {state === "analyzing" ? (
                          <span className="flex items-center gap-1.5">
                            <span className="animate-spin inline-block">◌</span> ANALYZING
                          </span>
                        ) : state === "complete" ? "✓ COMPLETE" : "IDLE"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-xs tracking-widest mb-3" style={{ color: "#3a5070" }}>// INCIDENT TIMELINE</div>
              <div className="space-y-0" style={{ maxHeight: "380px", overflowY: "auto" }}>
                {timelineEvents.length === 0 && (
                  <div className="text-xs text-center py-8" style={{ color: "#1e2d42" }}>Awaiting investigation launch...</div>
                )}
                {timelineEvents.map((ev, i) => (
                  <div key={i} className="flex gap-3 items-start py-2" style={{ borderLeft: `2px solid ${sevColor[ev.severity]}30`, paddingLeft: "12px", marginLeft: "6px" }}>
                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: sevColor[ev.severity], marginLeft: "-17px" }} />
                    <div className="text-xs font-mono" style={{ color: "#3a5070", minWidth: "70px" }}>{ev.ts}</div>
                    <div className="text-xs" style={{ color: sevColor[ev.severity] === "#8892a4" ? "#c9d1e0" : sevColor[ev.severity] }}>{ev.event}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: RESULTS ── */}
        {activeTab === "results" && result && (
          <div ref={resultRef} className="space-y-6">

            {/* Primary cause banner */}
            <div className="p-5 rounded" style={{ background: "#0a1628", border: "1px solid #ef444450", boxShadow: "0 0 30px #ef444415" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs tracking-widest mb-2" style={{ color: "#3a5070" }}>PRIMARY CAUSE ASSESSMENT</div>
                  <div className="text-xl font-bold" style={{ color: "#ef4444" }}>{result.decision_fusion.primary_cause}</div>
                  <div className="text-xs mt-2" style={{ color: "#8892a4" }}>Session: {result.session_id} · {new Date(result.timestamp).toUTCString()}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs tracking-widest mb-1" style={{ color: "#3a5070" }}>EMERGENCY LEVEL</div>
                  <div className="text-sm font-bold px-4 py-2 rounded" style={{
                    background: result.playbook.emergency_level === "CRITICAL" ? "#ef444420" : "#f59e0b20",
                    color: result.playbook.emergency_level === "CRITICAL" ? "#ef4444" : "#f59e0b",
                    border: `1px solid ${result.playbook.emergency_level === "CRITICAL" ? "#ef444450" : "#f59e0b50"}`,
                  }}>
                    {result.playbook.emergency_level}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Confidence scores */}
              <div className="p-5 rounded" style={{ background: "#0a1628", border: "1px solid #0d1f3c" }}>
                <div className="text-xs tracking-widest mb-4" style={{ color: "#3a5070" }}>// CONFIDENCE ANALYSIS</div>
                <ConfidenceBar label="Storm Damage" value={result.decision_fusion.confidence_scores.storm_damage} color="#3b82f6" />
                <ConfidenceBar label="Cyber Attack" value={result.decision_fusion.confidence_scores.cyber_attack} color="#ef4444" />
                <ConfidenceBar label="Equipment Failure" value={result.decision_fusion.confidence_scores.equipment_failure} color="#f59e0b" />
                <ConfidenceBar label="Sensor Error" value={result.decision_fusion.confidence_scores.sensor_error} color="#8b5cf6" />
              </div>

              {/* Agent intelligence summary */}
              <div className="p-5 rounded" style={{ background: "#0a1628", border: "1px solid #0d1f3c" }}>
                <div className="text-xs tracking-widest mb-4" style={{ color: "#3a5070" }}>// AGENT INTELLIGENCE</div>
                <div className="space-y-3">
                  {[
                    { label: "Weather", icon: "◈", color: "#10b981", data: result.intelligence_reports.weather, summary: `${result.intelligence_reports.weather.conditions} — Severity: ${result.intelligence_reports.weather.severity}`, conf: result.intelligence_reports.weather.confidence },
                    { label: "Cyber", icon: "◉", color: "#f59e0b", data: result.intelligence_reports.cyber, summary: `Threat: ${result.intelligence_reports.cyber.threat_level} · ${result.intelligence_reports.cyber.opportunistic_vs_targeted}`, conf: result.intelligence_reports.cyber.confidence },
                    { label: "Infrastructure", icon: "◫", color: "#8b5cf6", data: result.intelligence_reports.infrastructure, summary: `Health: ${result.intelligence_reports.infrastructure.overall_health_score}/100 · ${result.intelligence_reports.infrastructure.failed_components.length} failed`, conf: result.intelligence_reports.infrastructure.confidence },
                  ].map((a) => (
                    <div key={a.label} className="flex items-start gap-3 p-3 rounded" style={{ background: "#070d1a" }}>
                      <span style={{ color: a.color }}>{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold mb-0.5" style={{ color: a.color }}>{a.label.toUpperCase()}</div>
                        <div className="text-xs leading-relaxed" style={{ color: "#8892a4" }}>{a.summary}</div>
                      </div>
                      <div className="text-xs font-mono font-bold flex-shrink-0" style={{ color: a.conf > 80 ? "#10b981" : a.conf > 60 ? "#f59e0b" : "#ef4444" }}>{a.conf}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evidence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded" style={{ background: "#0a1628", border: "1px solid #0d1f3c" }}>
                <div className="text-xs tracking-widest mb-3" style={{ color: "#3a5070" }}>// SUPPORTING EVIDENCE</div>
                <div className="space-y-2">
                  {result.decision_fusion.evidence_summary.map((e, i) => (
                    <div key={i} className="flex gap-2 text-xs" style={{ color: "#c9d1e0" }}>
                      <span style={{ color: "#10b981" }}>✓</span><span>{e}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 rounded" style={{ background: "#0a1628", border: "1px solid #0d1f3c" }}>
                <div className="text-xs tracking-widest mb-3" style={{ color: "#3a5070" }}>// CONFLICTING EVIDENCE</div>
                <div className="space-y-2">
                  {result.decision_fusion.conflicting_evidence.map((e, i) => (
                    <div key={i} className="flex gap-2 text-xs" style={{ color: "#c9d1e0" }}>
                      <span style={{ color: "#f59e0b" }}>⚠</span><span>{e}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid #0d1f3c" }}>
                  <div className="text-xs tracking-widest mb-2" style={{ color: "#3a5070" }}>SELF-CRITIQUE</div>
                  <div className="text-xs leading-relaxed" style={{ color: "#8892a4", fontStyle: "italic" }}>{result.decision_fusion.self_critique}</div>
                </div>
              </div>
            </div>

            {/* Response playbook */}
            <div className="p-5 rounded" style={{ background: "#0a1628", border: "1px solid #0d1f3c" }}>
              <div className="text-xs tracking-widest mb-4" style={{ color: "#3a5070" }}>// EMERGENCY RESPONSE PLAYBOOK</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs mb-3" style={{ color: "#8892a4" }}>PRIORITIZED ACTIONS</div>
                  <div className="space-y-2">
                    {result.decision_fusion.recommended_actions.map((a) => (
                      <div key={a.priority} className="flex gap-3 items-start p-3 rounded" style={{ background: "#070d1a" }}>
                        <span className="text-xs font-bold px-2 py-1 rounded flex-shrink-0" style={{ background: priColor[a.priority] + "20", color: priColor[a.priority] }}>P{a.priority}</span>
                        <div>
                          <div className="text-xs font-bold mb-0.5" style={{ color: "#c9d1e0" }}>{a.action}</div>
                          <div className="text-xs" style={{ color: "#3a5070" }}>{a.rationale}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#00d4ff50" }}>→ {a.responsible_party}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs mb-2" style={{ color: "#8892a4" }}>RECOVERY TIMELINE</div>
                    <div className="space-y-1.5">
                      {result.playbook.recovery_steps.map((step, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <span style={{ color: "#00d4ff", flexShrink: 0 }}>→</span>
                          <span style={{ color: "#c9d1e0" }}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded" style={{ background: "#070d1a", border: "1px solid #0d1f3c" }}>
                    <div className="text-xs" style={{ color: "#3a5070" }}>ESTIMATED RESOLUTION</div>
                    <div className="text-3xl font-bold font-mono mt-1" style={{ color: "#00d4ff" }}>{result.playbook.estimated_resolution_hours}h</div>
                    <div className="text-xs mt-1" style={{ color: "#8892a4" }}>{result.playbook.communication_plan.slice(0, 80)}...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "results" && !result && (
          <div className="text-center py-20" style={{ color: "#1e2d42" }}>
            <div className="text-4xl mb-4">◎</div>
            <div className="text-xs tracking-widest">No investigation results yet.</div>
            <div className="text-xs mt-2" style={{ color: "#0d1f3c" }}>Launch an investigation to see results here.</div>
          </div>
        )}

      </div>

      {/* ── FOOTER ── */}
      <footer className="text-center py-6 mt-8" style={{ borderTop: "1px solid #0d1f3c" }}>
        <div className="text-xs tracking-widest" style={{ color: "#1e2d42" }}>
          AEGISGRID AI · KAGGLE AI AGENTS CAPSTONE · AGENTS FOR GOOD
        </div>
      </footer>
    </div>
  );
}
