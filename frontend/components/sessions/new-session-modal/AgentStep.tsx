import type { NewSessionAgentStepProps } from "./types";

export function AgentStep({
  title,
  onTitleChange,
  agentDescription,
  onAgentDescriptionChange,
  localError,
  onClose,
  onNext,
}: NewSessionAgentStepProps) {
  return (
    <div className="newSessionModal_form">
      <p className="newSessionModal_hint">
        Name the agent and describe what it does. That context is used like a system prompt for
        tailored adversarial tests.
      </p>
      <label className="newSessionModal_label">
        Agent name
        <input
          className="newSessionModal_input"
          value={title}
          onChange={(ev) => onTitleChange(ev.target.value)}
          autoComplete="off"
          placeholder="e.g. Support triage bot"
        />
      </label>
      <label className="newSessionModal_label">
        What it does (optional)
        <textarea
          className="newSessionModal_textarea newSessionModal_textarea_step1"
          value={agentDescription}
          onChange={(ev) => onAgentDescriptionChange(ev.target.value)}
          placeholder="System Prompt, Role, allowed tools, data it sees, boundaries…"
        />
      </label>
      {localError ? (
        <p className="newSessionModal_error" role="alert">
          {localError}
        </p>
      ) : null}
      <div className="newSessionModal_actions">
        <button type="button" className="newSessionModal_cancel" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="newSessionModal_submit" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
