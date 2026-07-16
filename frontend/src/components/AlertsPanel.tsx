import { useAppStore } from "../store";
import type { ConjunctionAlert } from "../types";

function formatTime(value: string) {
  return `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(value))} UTC`;
}

function RiskBadge({ level }: { level: ConjunctionAlert["riskLevel"] }) {
  return <span className={`risk-badge risk-${level.toLowerCase()}`}><i />{level}</span>;
}

export function AlertsPanel() {
  const { alerts, selectedAlertId, selectAlert } = useAppStore();
  return <section className="alerts-panel panel">
    <div className="panel-heading"><div><div className="eyebrow">CONJUNCTION QUEUE</div><h2>Risk alerts <span>{alerts.length.toString().padStart(2, "0")}</span></h2></div><span className="live-dot">LIVE</span></div>
    {alerts.length === 0 ? <div className="empty-alerts"><div className="empty-orbit">◉</div><strong>No close approaches in view</strong><p>Run screening or widen the monitoring threshold to inspect the cached working set.</p></div> : <div className="alert-list">{alerts.map((alert) => <button className={`alert-card ${selectedAlertId === alert.id ? "selected" : ""}`} key={alert.id} onClick={() => selectAlert(selectedAlertId === alert.id ? null : alert.id)}>
      <div className="alert-top"><RiskBadge level={alert.riskLevel} /><span className="score">{alert.riskScore.toFixed(1)}<small>/100</small></span></div>
      <div className="pair-name"><span>{alert.satA}</span><b>×</b><span>{alert.satB}</span></div>
      <div className="alert-meta"><span>MISS DISTANCE <strong>{alert.minDistanceKm.toFixed(2)} km</strong></span><span>CAO <strong>{formatTime(alert.timeOfClosestApproach)}</strong></span></div>
      <div className="view-alert">{selectedAlertId === alert.id ? "FOCUS LOCKED" : "VIEW CONJUNCTION"}<span>→</span></div>
    </button>)}</div>}
  </section>;
}
