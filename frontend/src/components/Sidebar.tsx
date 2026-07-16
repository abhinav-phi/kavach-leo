import { useAppStore } from "../store";

const items = [
  ["◈", "Live View", "live"],
  ["◌", "Risk Alerts", "alerts"],
  ["✣", "Conjunctions", "conjunctions"],
  ["▣", "Catalog", "catalog"],
  ["▥", "Analytics", "analytics"],
  ["⚙", "Settings", "settings"],
] as const;

export function Sidebar() {
  const { alerts } = useAppStore();
  return <aside className="sidebar">
    <nav className="side-nav" aria-label="Primary navigation">
      {items.map(([icon, label, key]) => <button className={`nav-item ${key === "live" ? "active" : ""}`} key={key}>
        <span className="nav-icon">{icon}</span>
        <span>{label}</span>
        {key === "alerts" && alerts.length > 0 && <b className="nav-count">{alerts.length}</b>}
      </button>)}
    </nav>
    <div className="system-status">
      <div className="eyebrow"><span className="status-led" />SYSTEM STATUS</div>
      <strong><span className="status-led" />All systems nominal</strong>
      <small>SGP4 PROPAGATION · LOCAL API</small>
    </div>
  </aside>;
}
