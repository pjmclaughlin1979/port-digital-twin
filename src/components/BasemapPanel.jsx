import { BasemapIcon, CloseWidgetsIcon } from "./icons.jsx";
import "./BasemapPanel.css";

export default function BasemapPanel({ isOpen, onToggle, containerRef, status }) {
  return (
    <>
      {status === "ready" && (
        <button
          type="button"
          className="basemap-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="scene-basemap-panel"
          aria-label={isOpen ? "Hide Basemap" : "Show Basemap"}
          title={isOpen ? "Hide Basemap" : "Show Basemap"}
        >
          <BasemapIcon />
        </button>
      )}

      <aside
        id="scene-basemap-panel"
        className={`basemap-panel ${isOpen && status === "ready" ? "basemap-panel--open" : ""}`}
        aria-label="Basemap"
        aria-hidden={!isOpen || status !== "ready"}
      >
        <div className="basemap-panel__content">
          <header className="basemap-panel__header-row">
            <h1 className="basemap-panel__title">Basemap</h1>
            <button
              type="button"
              className="basemap-panel__close"
              onClick={onToggle}
              aria-label="Close Basemap"
              title="Close"
            >
              <CloseWidgetsIcon />
            </button>
          </header>

          <div className="basemap-panel__body calcite-mode-dark" ref={containerRef} />
        </div>
      </aside>
    </>
  );
}
