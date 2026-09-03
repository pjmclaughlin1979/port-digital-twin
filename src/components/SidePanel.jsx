import { useState } from "react";
import { SailboatIcon, CloseWidgetsIcon } from "./icons.jsx";
import "./SidePanel.css";

function formatMovementTime(epochMs) {
  if (!epochMs) return "—";
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MovementGroup({ title, items, onSelectMovement }) {
  return (
    <div className="side-panel__movement-group">
      <h3 className="side-panel__movement-group-title">
        {title} ({items.length})
      </h3>
      {items.length > 0 ? (
        <ul className="side-panel__movement-list">
          {items.map((item, index) => (
            <li key={`${item.VESSEL}-${item.SRT}-${index}`}>
              <button
                type="button"
                className="side-panel__movement"
                onClick={() => onSelectMovement?.(item)}
              >
                <div className="side-panel__movement-row">
                  <span className="side-panel__movement-vessel">{item.VESSEL}</span>
                  <span className="side-panel__movement-time">
                    {formatMovementTime(item.SRT)}
                  </span>
                </div>
                <span className="side-panel__movement-route">
                  {item.FROM_LOC?.trim() || "—"} &rarr; {item.TO_LOC?.trim() || "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="side-panel__vessel-empty">None scheduled.</p>
      )}
    </div>
  );
}

export default function SidePanel({
  isOpen,
  onToggle,
  title,
  description,
  status,
  vessels = [],
  onSelectVessel,
  movements,
  onSelectMovement,
}) {
  const [isVesselsOpen, setIsVesselsOpen] = useState(true);
  const [isMovementsOpen, setIsMovementsOpen] = useState(false);
  const { status: movementsStatus, arrivals = [], departures = [], other = [] } =
    movements ?? {};
  return (
    <>
      {status === "ready" && (
        <button
          type="button"
          className="panel-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="scene-side-panel"
          aria-label={isOpen ? "Hide Vessel Finder" : "Show Vessel Finder"}
          title={isOpen ? "Hide Vessel Finder" : "Show Vessel Finder"}
        >
          <SailboatIcon />
        </button>
      )}

      <aside
        id="scene-side-panel"
        className={`side-panel ${isOpen && status === "ready" ? "side-panel--open" : ""}`}
        aria-label="Scene details"
        aria-hidden={!isOpen || status !== "ready"}
      >
        <div className="side-panel__content">
          <header className="side-panel__header">
            <div className="side-panel__header-row">
              <h1 className="side-panel__title">{title}</h1>
              <button
                type="button"
                className="side-panel__close"
                onClick={onToggle}
                aria-label="Close Vessel Finder"
                title="Close"
              >
                <CloseWidgetsIcon />
              </button>
            </div>
            {description && <p className="side-panel__description">{description}</p>}
          </header>

          {status === "ready" && (
            <section className="side-panel__section" aria-label="Vessels in view">
              <button
                type="button"
                className="side-panel__section-toggle"
                onClick={() => setIsVesselsOpen((open) => !open)}
                aria-expanded={isVesselsOpen}
                aria-controls="scene-vessels-body"
              >
                <h2 className="side-panel__section-title">
                  Vessels in view ({vessels.length})
                </h2>
                <span
                  className={`side-panel__chevron ${
                    isVesselsOpen ? "side-panel__chevron--open" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isVesselsOpen && (
                <div id="scene-vessels-body" className="side-panel__vessels-body">
                  {vessels.length > 0 ? (
                    <ul className="side-panel__vessel-list">
                      {vessels.map((vessel) => (
                        <li key={vessel.objectId}>
                          <button
                            type="button"
                            className="side-panel__vessel"
                            onClick={() => onSelectVessel?.(vessel)}
                          >
                            <span className="side-panel__vessel-name">{vessel.name}</span>
                            <span className="side-panel__vessel-type">{vessel.type}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="side-panel__vessel-empty">No vessels in the current view.</p>
                  )}
                </div>
              )}
            </section>
          )}

          {status === "ready" && (
            <section className="side-panel__section" aria-label="Shipping schedule">
              <button
                type="button"
                className="side-panel__section-toggle"
                onClick={() => setIsMovementsOpen((open) => !open)}
                aria-expanded={isMovementsOpen}
                aria-controls="scene-movements-body"
              >
                <h2 className="side-panel__section-title">
                  Shipping schedule ({arrivals.length + departures.length + other.length})
                </h2>
                <span
                  className={`side-panel__chevron ${
                    isMovementsOpen ? "side-panel__chevron--open" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isMovementsOpen && (
                <div id="scene-movements-body" className="side-panel__movements-body">
                  {movementsStatus === "loading" &&
                    arrivals.length === 0 &&
                    departures.length === 0 &&
                    other.length === 0 && (
                      <p className="side-panel__vessel-empty">Loading…</p>
                    )}
                  {movementsStatus === "error" && (
                    <p className="side-panel__vessel-empty">
                      Unable to load the shipping schedule.
                    </p>
                  )}
                  {movementsStatus !== "loading" && movementsStatus !== "error" && (
                    <>
                      <MovementGroup
                        title="Arrivals"
                        items={arrivals}
                        onSelectMovement={onSelectMovement}
                      />
                      <MovementGroup
                        title="Departures"
                        items={departures}
                        onSelectMovement={onSelectMovement}
                      />
                      <MovementGroup
                        title="Other"
                        items={other}
                        onSelectMovement={onSelectMovement}
                      />
                    </>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
