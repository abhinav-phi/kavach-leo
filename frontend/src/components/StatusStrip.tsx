import { useAppStore } from "../store";

const stages = [
  ["PERCEIVE", "Live TLE ingest + propagation"],
  ["REASON", "Pair screening + explainable score"],
  ["EXECUTE", "Alert + monitoring window"],
] as const;

export function StatusStrip() {
  const { status, alerts, selectedAlertId } = useAppStore();
  const active = status === "loading" ? 0 : selectedAlertId ? 2 : alerts.length ? 1 : -1;
  return <div className="status-strip" aria-label="Pipeline stages">
    {stages.map(([title, caption], index) => <div className={`status-stage ${index <= active ? "active" : ""} ${index === active ? "current" : ""}`} key={title}>
      <span className="stage-index">0{index + 1}</span>
      <span><strong>{title}</strong><small>{caption}</small></span>
    </div>)}
  </div>;
}
