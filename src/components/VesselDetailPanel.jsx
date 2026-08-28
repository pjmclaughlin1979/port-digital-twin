import "./VesselDetailPanel.css";

function formatNumber(value, unit, digits = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function VesselDetailPanel({ vessel, onClose }) {
  if (!vessel) return null;

  const related = vessel.related ?? { status: "loading" };

  return (
    <aside className="vessel-detail" aria-label={`Details for ${vessel.name}`}>
      <div className="vessel-detail__header">
        <div>
          <h2 className="vessel-detail__name">{vessel.name}</h2>
          <p className="vessel-detail__type">{vessel.type}</p>
        </div>
        <button
          type="button"
          className="vessel-detail__close"
          onClick={onClose}
          aria-label="Close vessel details"
        >
          ×
        </button>
      </div>

      <section className="vessel-detail__section" aria-label="Vessel information">
        <h3 className="vessel-detail__section-title">Information</h3>
        <dl className="vessel-detail__grid">
          <div>
            <dt>MMSI</dt>
            <dd>{vessel.mmsi ?? "—"}</dd>
          </div>
          <div>
            <dt>Callsign</dt>
            <dd>{vessel.callsign?.trim() || "—"}</dd>
          </div>
          <div>
            <dt>IMO</dt>
            <dd>{vessel.imo ?? "—"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{vessel.status?.trim() || "—"}</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>{vessel.destination?.trim() || "—"}</dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd>{formatNumber(vessel.speed, " kn", 1)}</dd>
          </div>
          <div>
            <dt>Course</dt>
            <dd>{formatNumber(vessel.course, "°")}</dd>
          </div>
          <div>
            <dt>Heading</dt>
            <dd>{formatNumber(vessel.heading, "°")}</dd>
          </div>
        </dl>
        <p className="vessel-detail__updated">Last update: {formatTimestamp(vessel.timestamp)}</p>
      </section>

      <section className="vessel-detail__section" aria-label="Related vessel details">
        <h3 className="vessel-detail__section-title">Related details</h3>
        {related.status === "loading" && (
          <p className="vessel-detail__status">Loading…</p>
        )}
        {(related.status === "unavailable" || related.status === "error") && (
          <p className="vessel-detail__status">No additional details available.</p>
        )}
        {related.status === "ready" && (
          <dl className="vessel-detail__grid">
            <div>
              <dt>Length</dt>
              <dd>{formatNumber(related.length, " m", 1)}</dd>
            </div>
            <div>
              <dt>Beam</dt>
              <dd>{formatNumber(related.beam, " m", 1)}</dd>
            </div>
          </dl>
        )}
      </section>
    </aside>
  );
}
