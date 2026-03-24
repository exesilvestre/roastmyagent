import type { NewSessionTestStepProps } from "./types";

export function TestStep({
  testRequestPreview,
  testLoading,
  testHint,
  connectionPayload,
  localError,
  titleTrimmed,
  submitting,
  onBack,
  onTest,
  onCreate,
}: NewSessionTestStepProps) {
  return (
    <div className="newSessionModal_form">
      <p className="newSessionModal_hint">
        This is what will be sent for the test. Run the check below; edit connection on step 2 if
        something looks wrong.
      </p>
      <div className="newSessionModal_previewBlock">
        <div className="newSessionModal_previewLabel">Request preview</div>
        <pre className="newSessionModal_previewPre">{testRequestPreview || "—"}</pre>
      </div>
      <div className="newSessionModal_section newSessionModal_sectionNoBorder">
        <div className="newSessionModal_testRow">
          <button
            type="button"
            className="newSessionModal_test"
            disabled={testLoading || !connectionPayload}
            onClick={() => void onTest()}
          >
            {testLoading ? "Testing…" : "Test connection"}
          </button>
          {testHint ? <p className="newSessionModal_testHint">{testHint}</p> : null}
        </div>
      </div>
      {localError ? (
        <p className="newSessionModal_error" role="alert">
          {localError}
        </p>
      ) : null}
      <div className="newSessionModal_actions newSessionModal_actionsStep2">
        <button type="button" className="newSessionModal_cancel" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="newSessionModal_submit"
          disabled={submitting || !titleTrimmed}
          onClick={() => void onCreate()}
        >
          {submitting ? "Creating…" : "Create session"}
        </button>
      </div>
    </div>
  );
}
