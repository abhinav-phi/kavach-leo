import { useAppStore } from "../store";

interface Props { onRun: () => void; }

export function ControlPanel({ onRun }: Props) {
  const { params, setParams, status, satellites } = useAppStore();
  return <section className="control-panel panel">
    <div className="eyebrow">SCREENING PARAMETERS</div>
    <label className="field-label" htmlFor="threshold">Monitoring threshold <span>{params.thresholdKm} km</span></label>
    <input id="threshold" type="range" min="10" max="100" step="5" value={params.thresholdKm} onChange={(event) => setParams({ thresholdKm: Number(event.target.value) })} />
    <p className="field-hint">Not a collision threshold · triage signal only</p>
    <div className="control-grid">
      <label className="field-label">Window <select value={params.windowHours} onChange={(event) => setParams({ windowHours: Number(event.target.value) })}><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option></select></label>
      <label className="field-label">Step <select value={params.stepMinutes} onChange={(event) => setParams({ stepMinutes: Number(event.target.value) })}><option value="1">1 min</option><option value="5">5 min</option><option value="10">10 min</option><option value="15">15 min</option></select></label>
    </div>
    <label className="field-label">Working set <select value={params.satelliteGroup} onChange={(event) => setParams({ satelliteGroup: event.target.value })}><option value="starlink">Starlink + Indian assets</option><option value="oneweb">OneWeb + Indian assets</option><option value="active">Active objects</option></select></label>
    <button className="primary-button" onClick={onRun} disabled={status === "loading"}>{status === "loading" ? "SCREENING…" : "RUN SCREENING"}<span>↗</span></button>
    <div className="set-count">{satellites.length ? `${satellites.length} cached objects ready` : "No cached objects loaded"}</div>
  </section>;
}
