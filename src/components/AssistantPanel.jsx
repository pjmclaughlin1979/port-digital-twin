import { useEffect, useRef, useState } from "react";
import { AssistantIcon, CloseWidgetsIcon } from "./icons.jsx";
import { answerAssistantQuestion, SUGGESTED_PROMPTS } from "../lib/assistantQuery.js";
import "./AssistantPanel.css";

let messageIdCounter = 0;
const nextMessageId = () => `assistant-message-${++messageIdCounter}`;

export default function AssistantPanel({
  isOpen,
  onToggle,
  status,
  queryVessels,
  movements,
  onSelectVessel,
  onSelectMovement,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const ask = async (question) => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;
    setMessages((prev) => [...prev, { id: nextMessageId(), role: "user", text: trimmed }]);
    setInput("");
    setIsThinking(true);
    try {
      const result = await answerAssistantQuestion(trimmed, { queryVessels, movements });
      setMessages((prev) => [...prev, { id: nextMessageId(), role: "assistant", ...result }]);
    } catch (err) {
      console.error("Data assistant failed to answer", err);
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          role: "assistant",
          text: "Something went wrong answering that — please try again.",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    ask(input);
  };

  const reset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <>
      {status === "ready" && (
        <button
          type="button"
          className="assistant-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="scene-assistant-panel"
          aria-label={isOpen ? "Hide Data Assistant" : "Show Data Assistant"}
          title={isOpen ? "Hide Data Assistant" : "Show Data Assistant"}
        >
          <AssistantIcon />
        </button>
      )}

      {isOpen && status === "ready" && (
        <div className="assistant-panel__backdrop" onClick={onToggle}>
          <aside
            id="scene-assistant-panel"
            className="assistant-panel"
            aria-label="Data assistant"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="assistant-panel__header">
              <div>
                <h1 className="assistant-panel__title">Data Assistant</h1>
                <p className="assistant-panel__subtitle">
                  Ask about vessels in the harbour or the shipping schedule
                </p>
              </div>
              <div className="assistant-panel__header-actions">
                {messages.length > 0 && (
                  <button
                    type="button"
                    className="assistant-panel__reset"
                    onClick={reset}
                    disabled={isThinking}
                    title="Start over"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  className="assistant-panel__close"
                  onClick={onToggle}
                  aria-label="Close Data Assistant"
                  title="Close"
                >
                  <CloseWidgetsIcon />
                </button>
              </div>
            </header>

            <div className="assistant-panel__messages" ref={messagesRef}>
              {messages.length === 0 && (
                <div className="assistant-panel__entry">
                  <p>
                    I can answer questions about vessels currently broadcasting AIS in
                    the harbour and the Port of Cork shipping schedule — try one of
                    these:
                  </p>
                  <div className="assistant-panel__prompts">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="assistant-panel__prompt"
                        onClick={() => ask(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`assistant-panel__message assistant-panel__message--${message.role}`}
                >
                  <p>{message.text}</p>
                  {(message.vessel || message.movement) && (
                    <button
                      type="button"
                      className="assistant-panel__locate"
                      onClick={() =>
                        message.vessel
                          ? onSelectVessel?.(message.vessel)
                          : onSelectMovement?.(message.movement)
                      }
                    >
                      Locate on map
                    </button>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="assistant-panel__message assistant-panel__message--assistant assistant-panel__message--thinking">
                  <span className="assistant-panel__dot" />
                  <span className="assistant-panel__dot" />
                  <span className="assistant-panel__dot" />
                </div>
              )}
            </div>

            <form className="assistant-panel__form" onSubmit={handleSubmit}>
              <input
                type="text"
                className="assistant-panel__input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about vessels or the shipping schedule…"
                aria-label="Ask the data assistant a question"
              />
              <button
                type="submit"
                className="assistant-panel__send"
                disabled={!input.trim() || isThinking}
              >
                Send
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
