import { useMemo } from "react";
import { useAppStore } from "../store";

export function OverviewStrip() {
  const { satellites, alerts } = useAppStore();
  const activeObjects = satellites.filter((satellite) => satellite.hoursSinceEpoch < 48).length;
  const critical = alerts.filter((alert) => alert.riskLevel === "HIGH").length;
  const distribution = useMemo(() => {
    const total = Math.max(1, alerts.length);
    return {
      low: alerts.filter((alert) => alert.riskLevel === "LOW").length / total,
      medium: alerts.filter((alert) => alert.riskLevel === "MEDIUM").length / total,
      high: critical / total,
    };
  }, [alerts, critical]);
  return <section className="overview-strip panel" aria-label="Orbital overview">
    <div className="overview-card overview-objects">
      <div className="overview-heading"><span>ORBITAL OVERVIEW</span><span className="mini-spark">⌁</span></div>
      <div className="overview-main-number">{satellites.length || "—"}<span> objects</span></div>
      <div className="overview-foot"><span className="status-led" />{activeObjects || "—"} active <i /> live catalogue</div>
    </div>
    <div className="overview-card">
      <div className="overview-heading"><span>CONJUNCTION SUMMARY</span><span className="cyan-text">24H</span></div>
      <div className="summary-grid"><div><strong>{alerts.length || "—"}</strong><small>FLAGGED</small></div><div className="danger-number"><strong>{critical || "—"}</strong><small>HIGH RISK</small></div><div><strong>{satellites.length ? Math.min(satellites.length, 5) : "—"}</strong><small>MONITORED</small></div></div>
    </div>
    <div className="overview-card risk-distribution">
      <div className="overview-heading"><span>RISK LEVEL DISTRIBUTION</span><span className="mini-spark">◔</span></div>
      <div className="risk-bars"><span style={{ width: `${Math.max(10, distribution.low * 100)}%` }} /><span style={{ width: `${Math.max(4, distribution.medium * 100)}%` }} /><span style={{ width: `${Math.max(2, distribution.high * 100)}%` }} /></div>
      <div className="risk-legend"><span><i className="legend-low" />Low <b>{alerts.length ? Math.round(distribution.low * 100) : 0}%</b></span><span><i className="legend-medium" />Med <b>{alerts.length ? Math.round(distribution.medium * 100) : 0}%</b></span><span><i className="legend-high" />High <b>{alerts.length ? Math.round(distribution.high * 100) : 0}%</b></span></div>
    </div>
  </section>;
}
