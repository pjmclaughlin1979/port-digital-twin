import { useState } from "react";
import { SailboatIcon, CloseWidgetsIcon } from "./icons.jsx";
import "./SidePanel.css";

export default function SidePanel({
  isOpen,
  onToggle,
  title,
  description,
  status,
  vessels = [],
  onSelectVessel,
  slides = [],
  onSelectSlide,
}) {
  const [isVesselsOpen, setIsVesselsOpen] = useState(true);
  const [isSlidesOpen, setIsSlidesOpen] = useState(true);
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

          {status === "ready" && slides.length > 0 && (
            <section className="side-panel__section" aria-label="Bookmarks">
              <button
                type="button"
                className="side-panel__section-toggle"
                onClick={() => setIsSlidesOpen((open) => !open)}
                aria-expanded={isSlidesOpen}
                aria-controls="scene-slides-body"
              >
                <h2 className="side-panel__section-title">
                  Bookmarks ({slides.length})
                </h2>
                <span
                  className={`side-panel__chevron ${
                    isSlidesOpen ? "side-panel__chevron--open" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isSlidesOpen && (
                <ul id="scene-slides-body" className="side-panel__slide-list">
                  {slides.map((slide) => (
                    <li key={slide.id}>
                      <button
                        type="button"
                        className="side-panel__slide"
                        onClick={() => onSelectSlide?.(slide)}
                      >
                        {slide.thumbnailUrl && (
                          <img
                            className="side-panel__slide-thumbnail"
                            src={slide.thumbnailUrl}
                            alt=""
                          />
                        )}
                        <span className="side-panel__slide-title">{slide.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
