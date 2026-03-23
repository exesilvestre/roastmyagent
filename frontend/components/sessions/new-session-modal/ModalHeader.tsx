import type { NewSessionModalHeaderProps } from "./types";

export function ModalHeader({ step }: NewSessionModalHeaderProps) {
  return (
    <div className="newSessionModal_header">
      <h2 id="newSessionModal_heading" className="newSessionModal_title">
        New test session
      </h2>
      <nav className="newSessionModal_stepper" aria-label="Session steps">
        <ol className="newSessionModal_stepperList">
          <li
            className={`newSessionModal_step ${step === 0 ? "newSessionModal_stepCurrent" : ""} ${step > 0 ? "newSessionModal_stepDone" : ""}`}
            aria-current={step === 0 ? "step" : undefined}
          >
            <span className="newSessionModal_stepBadge" aria-hidden="true">
              {step > 0 ? "✓" : "1"}
            </span>
            <span className="newSessionModal_stepText">Agent</span>
          </li>
          <li className="newSessionModal_stepLine" aria-hidden="true" />
          <li
            className={`newSessionModal_step ${step === 1 ? "newSessionModal_stepCurrent" : ""} ${step > 1 ? "newSessionModal_stepDone" : ""}`}
            aria-current={step === 1 ? "step" : undefined}
          >
            <span className="newSessionModal_stepBadge" aria-hidden="true">
              {step > 1 ? "✓" : "2"}
            </span>
            <span className="newSessionModal_stepText">Connection</span>
          </li>
          <li className="newSessionModal_stepLine" aria-hidden="true" />
          <li
            className={`newSessionModal_step ${step === 2 ? "newSessionModal_stepCurrent" : ""}`}
            aria-current={step === 2 ? "step" : undefined}
          >
            <span className="newSessionModal_stepBadge" aria-hidden="true">
              3
            </span>
            <span className="newSessionModal_stepText">Test</span>
          </li>
        </ol>
        <p className="newSessionModal_stepCaption">
          {step === 0
            ? "Step 1 of 3: name and describe the agent."
            : step === 1
              ? "Step 2 of 3: how the API reaches the agent."
              : "Step 3 of 3: verify the connection, then create the session."}
        </p>
      </nav>
    </div>
  );
}
