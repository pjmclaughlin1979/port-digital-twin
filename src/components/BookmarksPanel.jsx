import { BookmarkIcon, CloseWidgetsIcon } from "./icons.jsx";
import "./BookmarksPanel.css";

export default function BookmarksPanel({ isOpen, onToggle, slides = [], onSelectSlide, status }) {
  return (
    <>
      {status === "ready" && (
        <button
          type="button"
          className="bookmarks-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="scene-bookmarks-panel"
          aria-label={isOpen ? "Hide Bookmarks" : "Show Bookmarks"}
          title={isOpen ? "Hide Bookmarks" : "Show Bookmarks"}
        >
          <BookmarkIcon />
        </button>
      )}

      <aside
        id="scene-bookmarks-panel"
        className={`bookmarks-panel ${isOpen && status === "ready" ? "bookmarks-panel--open" : ""}`}
        aria-label="Bookmarks"
        aria-hidden={!isOpen || status !== "ready"}
      >
        <div className="bookmarks-panel__content">
          <header className="bookmarks-panel__header-row">
            <h1 className="bookmarks-panel__title">Bookmarks</h1>
            <button
              type="button"
              className="bookmarks-panel__close"
              onClick={onToggle}
              aria-label="Close Bookmarks"
              title="Close"
            >
              <CloseWidgetsIcon />
            </button>
          </header>

          {slides.length > 0 ? (
            <ul className="bookmarks-panel__list">
              {slides.map((slide) => (
                <li key={slide.id}>
                  <button
                    type="button"
                    className="bookmarks-panel__slide"
                    onClick={() => onSelectSlide?.(slide)}
                  >
                    {slide.thumbnailUrl && (
                      <img
                        className="bookmarks-panel__slide-thumbnail"
                        src={slide.thumbnailUrl}
                        alt=""
                      />
                    )}
                    <span className="bookmarks-panel__slide-title">{slide.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bookmarks-panel__empty">No bookmarks available.</p>
          )}
        </div>
      </aside>
    </>
  );
}
