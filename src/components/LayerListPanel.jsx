import { useState } from "react";
import { LayerListIcon, CloseWidgetsIcon } from "./icons.jsx";
import "./LayerListPanel.css";

export default function LayerListPanel({
  isOpen,
  onToggle,
  containerRef,
  legendContainerRef,
  status,
}) {
  const [isLayersOpen, setIsLayersOpen] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  return (
    <>
      {status === "ready" && (
        <button
          type="button"
          className="layer-list-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="scene-layer-list-panel"
          aria-label={isOpen ? "Hide Layer List" : "Show Layer List"}
          title={isOpen ? "Hide Layer List" : "Show Layer List"}
        >
          <LayerListIcon />
        </button>
      )}

      <aside
        id="scene-layer-list-panel"
        className={`layer-list-panel ${isOpen && status === "ready" ? "layer-list-panel--open" : ""}`}
        aria-label="Layers"
        aria-hidden={!isOpen || status !== "ready"}
      >
        <div className="layer-list-panel__content">
          <header className="layer-list-panel__header">
            <div className="layer-list-panel__header-row">
              <h1 className="layer-list-panel__title">Layers</h1>
              <button
                type="button"
                className="layer-list-panel__close"
                onClick={onToggle}
                aria-label="Close Layers"
                title="Close"
              >
                <CloseWidgetsIcon />
              </button>
            </div>
          </header>

          <section
            className="layer-list-panel__section layer-list-panel__section--layers"
            aria-label="Layer list"
          >
            <button
              type="button"
              className="layer-list-panel__section-toggle"
              onClick={() => setIsLayersOpen((open) => !open)}
              aria-expanded={isLayersOpen}
              aria-controls="scene-layer-list-body"
            >
              <h2 className="layer-list-panel__section-title">Layer list</h2>
              <span
                className={`layer-list-panel__chevron ${
                  isLayersOpen ? "layer-list-panel__chevron--open" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            <div
              id="scene-layer-list-body"
              className={`layer-list-panel__body calcite-mode-dark ${
                isLayersOpen ? "" : "layer-list-panel__body--collapsed"
              }`}
              ref={containerRef}
            />
          </section>

          <section className="layer-list-panel__section" aria-label="Legend">
            <button
              type="button"
              className="layer-list-panel__section-toggle"
              onClick={() => setIsLegendOpen((open) => !open)}
              aria-expanded={isLegendOpen}
              aria-controls="scene-legend-body"
            >
              <h2 className="layer-list-panel__section-title">Legend</h2>
              <span
                className={`layer-list-panel__chevron ${
                  isLegendOpen ? "layer-list-panel__chevron--open" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            <div
              id="scene-legend-body"
              className={`layer-list-panel__legend ${
                isLegendOpen ? "" : "layer-list-panel__legend--collapsed"
              }`}
              ref={legendContainerRef}
            />
          </section>
        </div>
      </aside>
    </>
  );
}
