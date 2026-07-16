import { useAppStore } from "../store";

export function ScoreBreakdown() {
  const { alerts, selectedAlertId, selectAlert } = useAppStore();
  const alert = alerts.find((item) => item.id === selectedAlertId);
  if (!alert) return null;
  const { scoreBreakdown: score } = alert;
  return <aside className="score-breakdown panel">
    <button className="close-button" onClick={() => selectAlert(null)} aria-label="Close alert details">×</button>
    <div className="eyebrow">FOCUS LOCK · {alert.riskLevel}</div><h2>Closest approach</h2>
    <div className="focus-distance"><strong>{alert.minDistanceKm.toFixed(2)}</strong><span>km miss distance</span></div><div className="focus-pair">{alert.satA}<b>×</b>{alert.satB}</div>
    <div className="formula"><div><span>Proximity</span><strong>{score.proximityFactor.toFixed(2)} × 70%</strong><em>{(score.proximityFactor * score.proximityWeight * 100).toFixed(1)}</em></div><div><span>Closing speed</span><strong>{score.closingSpeedFactor.toFixed(2)} × 30%</strong><em>{(score.closingSpeedFactor * score.closingSpeedWeight * 100).toFixed(1)}</em></div><div className="formula-total"><span>Risk score</span><strong>{alert.riskScore.toFixed(1)} <small>/ 100</small></strong></div></div>
    <div className="window-card"><span className="window-icon">◷</span><div><small>MONITORING WINDOW</small><strong>{new Date(alert.monitoringWindow.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(alert.monitoringWindow.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><p>Action awareness window · not a maneuver plan</p></div></div>
  </aside>;
}
