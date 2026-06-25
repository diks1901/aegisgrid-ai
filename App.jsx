import { useState, useEffect, useRef } from "react";

// ── CONFIG ────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY || "aegisgrid-dev-key-change-in-prod";

// ── DEMO SCENARIOS (mirrors backend /api/demo-scenarios) ──────
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

const AGENT_SEQUENCE = [
  { id: "coord",   name: "Mission Coordinator",    icon: "⬡", color: "#00d4ff" },
  { id: "weather", name: "Weather Intelligence",   icon: "◈", color: "#10b981" },
  { id: "cyber",   name: "Cyber Threat",           icon: "◉", color: "#f59e0b" },
  { id: "infra",   name: "Infrastructure Status",  icon: "◫", color: "#8b5cf6" },
  { id: "fusion",  name: "Decision Fusion",        icon: "◎", color: "#ef4444" },
  { id: "report",  name: "Report Generator",       icon: "◧", color: "#00d4ff" },
];

// Agent animation timing (ms) — visual only, independent of real fetch
const AGENT_START  = [0,    1500, 1500, 1500, 4000, 7000];
const AGENT_END    = [1400, 3800, 3800, 4000, 6800, 9000];

const ALL_SYSTEMS = ["Power Grid", "Water Supply", "Communications", "Hospitals", "Transportation"];

// ── UTILITY ───────────────────────────────────────────────────
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
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
    </span>
  );
}

function ConfidenceBar({ label, value, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 120);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs tracking-widest uppercase" style={{ color: "#8892a4" }}>{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "#1a2235" }}>
        <div className="h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function AegisGrid() {
  const time = useClock();
  const [selectedScenario, setSelectedScenario]   = useState(null);
  const [customInput, setCustomInput]             = useState({
    incident_description: "", location: "", network_anomalies: false, affected_systems: [],
  });
  const [agentStates, setAgentStates]             = useState({});
  const [result, setResult]                       = useState(null);
  const [isRunning, setIsRunning]                 = useState(false);
  const [timelineEvents, setTimelineEvents]       = useState([]);
  const [activeTab, setActiveTab]                 = useState("input");
  const [error, setError]                         = useState(null);
  const [backendStatus, setBackendStatus]         = useState("unknown"); // "up" | "down" | "unknown"
  const resultRef = useRef(null);
  const animTimers = useRef([]);

  // ── Health check on mount ──
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.ok ? setBackendStatus("up") : setBackendStatus("down"))
      .catch(() => setBackendStatus("down"));
  }, []);

  function loadScenario(s) {
    setSelectedScenario(s);
    setCustomInput({
      incident_description: s.incident_description,
      location: s.location,
      network_anomalies: s.network_anomalies,
      affected_systems: [...s.affected_systems],
    });
    setResult(null);
    setError(null);
    setAgentStates({});
    setTimelineEvents([]);
  }

  function toggleSystem(sys) {
    setCustomInput(prev => ({
      ...prev,
      affected_systems: prev.affected_systems.includes(sys)
        ? prev.affected_systems.filter(s => s !== sys)
        : [...prev.affected_systems, sys],
    }));
  }

  function addEvent(event, severity = "INFO") {
    const now = new Date();
    const ts =
      now.getHours().toString().padStart(2, "0") + ":" +
      now.getMinutes().toString().padStart(2, "0") + ":" +
      now.getSeconds().toString().padStart(2, "0");
    setTimelineEvents(prev => [...prev, { ts, event, severity }]);
  }

  function clearAnimTimers() {
    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];
  }

  function startAgentAnimation() {
    clearAnimTimers();
    AGENT_SEQUENCE.forEach((agent, i) => {
      const t1 = setTimeout(() => {
        setAgentStates(prev => ({ ...prev, [agent.id]: "analyzing" }));
        addEvent(`${agent.name} activated`, "INFO");
      }, AGENT_START[i]);

      const t2 = setTimeout(() => {
        setAgentStates(prev => ({ ...prev, [agent.id]: "complete" }));
        addEvent(`${agent.name} complete`, i >= 4 ? "WARNING" : "INFO");
      }, AGENT_END[i]);

      animTimers.current.push(t1, t2);
    });
  }

  async function runInvestigation() {
    if (!customInput.incident_description || !customInput.location) return;
    if (isRunning) return;

    setIsRunning(true);
    setResult(null);
    setError(null);
    setAgentStates({});
    setTimelineEvents([]);
    setActiveTab("live");

    // Kick off visual animation (independent of fetch timing)
    startAgentAnimation();
    addEvent("Investigation launched", "INFO");

    try {
      const response = await fetch(`${API_BASE}/api/investigate`, {
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
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(`${response.status}: ${errData.detail || response.statusText}`);
      }

      const data = await response.json();

      // Ensure animation has had at least 9s before showing results
      const minDelay = 9200;
      const startedAt = Date.now();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minDelay - elapsed);

      setTimeout(() => {
        setResult(data);
        setActiveTab("results");
        setIsRunning(false);
        addEvent(
          `Investigation complete — ${data.decision_fusion.primary_cause}`,
          "CRITICAL"
        );
        if (resultRef.current) resultRef.current.scrollIntoView({ behavior: "smooth" });
      }, remaining);

    } catch (err) {
      clearAnimTimers();
      // Mark all agents that were mid-analysis as failed
      setAgentStates(prev => {
        const next = { ...prev };
        AGENT_SEQUENCE.forEach(a => {
          if (next[a.id] === "analyzing") next[a.id] = "error";
        });
        return next;
      });
      setError(err.message);
      setIsRunning(false);
      addEvent(`ERROR — ${err.message}`, "CRITICAL");
    }
  }

  function resetAll() {
    clearAnimTimers();
    setResult(null);
    setError(null);
    setAgentStates({});
    setTimelineEvents([]);
    setCustomInput({ incident_description: "", location: "", network_anomalies: false, affected_systems: [] });
    setSelectedScenario(null);
    setActiveTab("input");
    setIsRunning(false);
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

          {/* Backend status indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "#0d1f3c" }}>
            <PulsingDot color={backendStatus === "up" ? "#10b981" : backendStatus === "down" ? "#ef4444" : "#f59e0b"} />
            <span className="text-xs tracking-widest" style={{ color: backendStatus === "up" ? "#10b981" : backendStatus === "down" ? "#ef4444" : "#f59e0b" }}>
              {backendStatus === "up" ? "BACKEND ONLINE" : backendStatus === "down" ? "BACKEND OFFLINE" : "CHECKING..."}
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
            onClick={resetAll}
            className="px-4 py-2 text-xs tracking-widest font-bold rounded transition-all"
            style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444" }}
            onMouseEnter={e => e.currentTarget.style.background = "#ef444420"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            ⊕ NEW INCIDENT
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── BACKEND OFFLINE BANNER ── */}
        {backendStatus === "down" && (
          <div className="px-5 py-3 rounded flex items-center gap-3" style={{ background: "#1a0a0a", border: "1px solid #ef444450" }}>
            <span style={{ color: "#ef4444" }}>⚠</span>
            <span className="text-xs" style={{ color: "#ef4444" }}>
              Backend at <code>{API_BASE}</code> is unreachable. Start the FastAPI server: <code>python main.py</code>
            </span>
          </div>
        )}

        {/* ── ERROR BANNER ── */}
        {error && (
          <div className="px-5 py-3 rounded flex items-center justify-between gap-3" style={{ background: "#1a0a0a", border: "1px solid #ef444450" }}>
            <div className="flex items-center gap-3">
              <span style={{ color: "#ef4444" }}>✗</span>
              <span className="text-xs" style={{ color: "#ef4444" }}>Investigation failed: {error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs" style={{ color: "#3a5070" }}>✕</button>
          </div>
        )}

        {/* ── DEMO SCENARIOS ── */}
        <div>
          <div className="text-xs tracking-widest mb-3" style={{ color: "#3a5070" }}>// LOAD DEMO SCENARIO</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DEMO_SCENARIOS.map(s => (
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
          {["input", "live", "results"].map(tab => (
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

        {/* ── TAB: INPUT ── */}
        {activeTab === "input" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: "#3a5070" }}>INCIDENT DESCRIPTION</label>
                <textarea
                  value={customInput.incident_description}
                  onChange={e => setCustomInput(p => ({ ...p, incident_description: e.target.value }))}
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
                  onChange={e => setCustomInput(p => ({ ...p, location: e.target.value }))}
                  placeholder="City, Region"
                  className="w-full px-4 py-3 rounded text-sm outline-none"
                  style={{ background: "#0a1628", border: "1px solid #0d1f3c", color: "#c9d1e0", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#00d4ff"}
                  onBlur={e => e.target.style.borderColor = "#0d1f3c"}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCustomInput(p => ({ ...p, network_anomalies: !p.network_anomalies }))}
                  className="relative w-12 h-6 rounded-full transition-all"
                  style={{ background: customInput.network_anomalies ? "#00d4ff" : "#0d1f3c" }}
                >
                  <span className="absolute top-1 w-4 h-4 rounded-full transition-all" style={{ background: "#fff", left: customInput.network_anomalies ? "28px" : "4px" }} />
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
                  {ALL_SYSTEMS.map(sys => {
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
                disabled={isRunning || !customInput.incident_description || !customInput.location || backendStatus === "down"}
                className="w-full py-4 text-sm tracking-[0.3em] font-bold rounded transition-all"
                style={{
                  background: isRunning ? "#0d1f3c" : "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  color: "#fff",
                  cursor: (isRunning || backendStatus === "down") ? "not-allowed" : "pointer",
                  boxShadow: isRunning ? "none" : "0 0 20px #ef444440",
                  opacity: (backendStatus === "down" || (!customInput.incident_description || !customInput.location)) ? 0.4 : 1,
                }}
              >
                {isRunning ? "◎ INVESTIGATING..." : "◉ LAUNCH INVESTIGATION"}
              </button>

              {/* Infrastructure health grid */}
              <div>
                <div className="text-xs tracking-widest mb-2" style={{ color: "#3a5070" }}>INFRASTRUCTURE MONITOR</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {ALL_SYSTEMS.map(sys => {
                    const affected = customInput.affected_systems.includes(sys);
                    const status = affected ? (result ? "CRITICAL" : "DEGRADED") : "NOMINAL";
                    const col = status === "CRITICAL" ? "#ef4444" : status === "DEGRADED" ? "#f59e0b" : "#10b981";
                    return (
                      <div key={sys} className="p-2 rounded text-center" style={{ background: "#0a1628", border: `1px solid ${col}30` }}>
                        <div className="text-lg mb-1">{sys === "Power Grid" ? "⚡" : sys === "Water Supply" ? "💧" : sys === "Communications" ? "📡" : sys === "Hospitals" ? "🏥" : "🚦"}</div>
                        <div style={{ color: col, fontSize: "9px" }}>{status}</div>
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
                {AGENT_SEQUENCE.map(agent => {
                  const state = agentStates[agent.id] || "idle";
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-4 px-4 py-3 rounded"
                      style={{
                        background: "#0a1628",
                        border: `1px solid ${state === "complete" ? agent.color + "50" : state === "analyzing" ? agent.color + "30" : state === "error" ? "#ef444450" : "#0d1f3c"}`,
                        transition: "all 0.4s",
                      }}
                    >
                      <span className="text-xl" style={{ color: state === "idle" ? "#1e2d42" : state === "error" ? "#ef4444" : agent.color }}>{agent.icon}</span>
                      <div className="flex-1">
                        <div className="text-xs tracking-wider" style={{ color: state === "idle" ? "#3a5070" : "#c9d1e0" }}>{agent.name.toUpperCase()}</div>
                      </div>
                      <div className="text-xs tracking-widest px-2 py-1 rounded" style={{
                        background: state === "complete" ? agent.color + "20" : state === "analyzing" ? "#f59e0b20" : state === "error" ? "#ef444420" : "#0d1f3c",
                        color: state === "complete" ? agent.color : state === "analyzing" ? "#f59e0b" : state === "error" ? "#ef4444" : "#3a5070",
                      }}>
                        {state === "analyzing" ? (
                          <span className="flex items-center gap-1.5">
                            <span className="animate-spin inline-block">◌</span> ANALYZING
                          </span>
                        ) : state === "complete" ? "✓ COMPLETE" : state === "error" ? "✗ ERROR" : "IDLE"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs tracking-widest mb-3" style={{ color: "#3a5070" }}>// INCIDENT TIMELINE</div>
              <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                {timelineEvents.length === 0 && (
                  <div className="text-xs text-center py-8" style={{ color: "#1e2d42" }}>Awaiting investigation launch...</div>
                )}
                {timelineEvents.map((ev, i) => (
                  <div key={i} className="flex gap-3 items-start py-2" style={{ borderLeft: `2px solid ${sevColor[ev.severity] || "#3a5070"}30`, paddingLeft: "12px", marginLeft: "6px" }}>
                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: sevColor[ev.severity] || "#3a5070", marginLeft: "-17px" }} />
                    <div className="text-xs font-mono" style={{ color: "#3a5070", minWidth: "70px" }}>{ev.ts}</div>
                    <div className="text-xs" style={{ color: sevColor[ev.severity] === "#8892a4" ? "#c9d1e0" : (sevColor[ev.severity] || "#c9d1e0") }}>{ev.event}</div>
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
                  <div className="text-xs mt-2" style={{ color: "#8892a4" }}>
                    Session: {result.session_id} · {new Date(result.timestamp).toUTCString()}
                  </div>
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
                <ConfidenceBar label="Storm Damage"      value={result.decision_fusion.confidence_scores.storm_damage}      color="#3b82f6" />
                <ConfidenceBar label="Cyber Attack"      value={result.decision_fusion.confidence_scores.cyber_attack}      color="#ef4444" />
                <ConfidenceBar label="Equipment Failure" value={result.decision_fusion.confidence_scores.equipment_failure} color="#f59e0b" />
                <ConfidenceBar label="Sensor Error"      value={result.decision_fusion.confidence_scores.sensor_error}      color="#8b5cf6" />
              </div>

              {/* Agent intelligence */}
              <div className="p-5 rounded" style={{ background: "#0a1628", border: "1px solid #0d1f3c" }}>
                <div className="text-xs tracking-widest mb-4" style={{ color: "#3a5070" }}>// AGENT INTELLIGENCE</div>
                <div className="space-y-3">
                  {[
                    { label: "Weather",        icon: "◈", color: "#10b981", summary: `${result.intelligence_reports.weather.conditions} — Severity: ${result.intelligence_reports.weather.severity}`,           conf: result.intelligence_reports.weather.confidence },
                    { label: "Cyber",          icon: "◉", color: "#f59e0b", summary: `Threat: ${result.intelligence_reports.cyber.threat_level} · ${result.intelligence_reports.cyber.opportunistic_vs_targeted}`, conf: result.intelligence_reports.cyber.confidence },
                    { label: "Infrastructure", icon: "◫", color: "#8b5cf6", summary: `Health: ${result.intelligence_reports.infrastructure.overall_health_score}/100 · ${result.intelligence_reports.infrastructure.failed_components.length} failed`, conf: result.intelligence_reports.infrastructure.confidence },
                  ].map(a => (
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

            {/* Playbook */}
            <div className="p-5 rounded" style={{ background: "#0a1628", border: "1px solid #0d1f3c" }}>
              <div className="text-xs tracking-widest mb-4" style={{ color: "#3a5070" }}>// EMERGENCY RESPONSE PLAYBOOK</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs mb-3" style={{ color: "#8892a4" }}>PRIORITIZED ACTIONS</div>
                  <div className="space-y-2">
                    {result.decision_fusion.recommended_actions.map(a => (
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

        {activeTab === "results" && !result && !isRunning && (
          <div className="text-center py-20" style={{ color: "#1e2d42" }}>
            <div className="text-4xl mb-4">◎</div>
            <div className="text-xs tracking-widest">No investigation results yet.</div>
            <div className="text-xs mt-2" style={{ color: "#0d1f3c" }}>Launch an investigation from the Input tab.</div>
          </div>
        )}

        {activeTab === "results" && isRunning && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block" style={{ color: "#00d4ff" }}>◌</div>
            <div className="text-xs tracking-widest mt-4" style={{ color: "#3a5070" }}>Agents running — results appear here when complete.</div>
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
