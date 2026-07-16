import { useCallback, useEffect } from "react";
import { fetchSatellites, runScreening } from "./api";
import { useAppStore } from "./store";
import { AlertsPanel } from "./components/AlertsPanel";
import { ControlPanel } from "./components/ControlPanel";
import { ObjectInfoPanel } from "./components/ObjectInfoPanel";
import { OrbitScene } from "./components/OrbitScene";
import { OverviewStrip } from "./components/OverviewStrip";
import { ScoreBreakdown } from "./components/ScoreBreakdown";
import { Sidebar } from "./components/Sidebar";
import { StatusStrip } from "./components/StatusStrip";
import "./styles.css";

function formatAge(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min ago`;
  return `${hours.toFixed(1)} h ago`;
}

export default function App() {
  const { satellites, stale, status, error, params, setSatellites, setStatus, setResult } = useAppStore();
  const run = useCallback(async () => {
    setStatus("loading");
    try { setResult(await runScreening(params)); } catch (value) { setStatus("error", value instanceof Error ? value.message : "Screening failed"); }
  }, [params, setResult, setStatus]);

  useEffect(() => {
    fetchSatellites()
      .then((value) => setSatellites(value.satellites, value.stale))
      .catch((value) => setStatus("error", value instanceof Error ? value.message : "Satellite catalogue unavailable"));
  }, [setSatellites, setStatus]);

  const freshest = satellites.length ? Math.min(...satellites.map((satellite) => satellite.hoursSinceEpoch)) : null;
  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">✦</span><div><h1>ARGUS<span>-LEO</span></h1><p>SOVEREIGN LEO COLLISION RISK MONITOR</p></div></div>
      <div className={`freshness ${stale ? "stale" : ""}`}><span className="freshness-dot" /><div><small>{stale ? "CACHED DATA / VERIFY FRESHNESS" : "TLE DATA FEED"}</small><strong>{freshest === null ? "Awaiting catalogue" : `${formatAge(freshest)} · ${satellites.length} objects`}</strong></div></div>
      <StatusStrip />
    </header>
    {(error || status === "error") && <div className="error-banner"><strong>DATA PATH WARNING</strong><span>{error ?? "Cached data is unavailable. Start the backend and load a TLE cache."}</span></div>}
    <div className="dashboard-body"><Sidebar /><div className="workspace">
      <div className="scene-column">
        <div className="stage-heading"><div><span className="stage-kicker">ORBITAL COMMAND / LIVE VIEW</span><h2>Propagation environment</h2></div><div className="stage-time"><span className="status-led" />UTC <strong>{new Date().toISOString().slice(11, 19)}</strong></div></div>
        <OrbitScene />
        <div className="scene-tools"><ControlPanel onRun={run} /><div className="telemetry-note"><span className="note-icon">⌁</span><div><strong>LIVE PROPAGATION ACTIVE</strong><small>SGP4 state vectors updating against current TLE epoch</small></div><span className="telemetry-arrow">↗</span></div></div>
        <OverviewStrip />
      </div>
      <div className="alerts-column"><AlertsPanel /><ObjectInfoPanel /><ScoreBreakdown /></div>
    </div></div>
    <footer className="disclaimer"><span>ⓘ</span><strong>SCREENING / TRIAGE LAYER</strong><p>Uses public TLE data and SGP4 propagation. Accuracy degrades with time since epoch; monitoring thresholds are not collision thresholds.</p><span className="build">ARGUS-LEO · LOCAL BUILD 0.1</span></footer>
  </main>;
}
