import { useAppStore } from "../store";

export function ObjectInfoPanel() {
  const { satellites, selectedAlertId, alerts } = useAppStore();
  const selected = alerts.find((alert) => alert.id === selectedAlertId);
  const name = selected?.satA ?? satellites.find((satellite) => satellite.isIndianAsset)?.name ?? satellites[0]?.name ?? "Awaiting catalogue";
  const satellite = satellites.find((item) => item.name === name) ?? satellites[0];
  return <section className="object-panel panel">
    <div className="panel-heading"><div><div className="eyebrow">SELECTED TELEMETRY</div><h2>Orbital object</h2></div><span className="object-status">● TRACKED</span></div>
    <div className="object-name"><span className="object-glyph">◉</span><div><strong>{name}</strong><small>{satellite ? `NORAD ${satellite.noradId}` : "NO OBJECT LOCK"}</small></div></div>
    <div className="object-facts">
      <span><small>OBJECT TYPE</small><strong>{satellite?.isIndianAsset ? "PAYLOAD / INDIAN ASSET" : "PAYLOAD"}</strong></span>
      <span><small>ORBIT ALTITUDE</small><strong>550 km</strong></span>
      <span><small>INCLINATION</small><strong>53.0°</strong></span>
      <span><small>VELOCITY</small><strong>7.60 km/s</strong></span>
    </div>
    <div className="object-footer"><span className="status-led" />Propagation healthy <b>ECI / SGP4</b></div>
  </section>;
}
