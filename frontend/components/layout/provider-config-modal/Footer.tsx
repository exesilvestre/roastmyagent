import type { ProviderConfigModalFooterProps, UpdateTarget } from "./types";


export function Footer({
  updateTarget,
  onUpdateTargetChange,
  buttonLabel,
  footerDisabled,
  onPrimaryAction,
}: ProviderConfigModalFooterProps) {
  return (
    <div className="providerModal_footer">
      <div className="providerModal_footerSaveRow" role="group" aria-label="Save destination">
        <span className="providerModal_footerSaveLabel">Save to</span>
        <div className="providerModal_footerSegment">
          <button
            type="button"
            className={`providerModal_footerSegmentBtn ${updateTarget === "cloud" ? "providerModal_footerSegmentBtn_active" : ""}`}
            aria-pressed={updateTarget === "cloud"}
            onClick={() => onUpdateTargetChange("cloud")}
          >
            Cloud
          </button>
          <button
            type="button"
            className={`providerModal_footerSegmentBtn ${updateTarget === "local" ? "providerModal_footerSegmentBtn_active" : ""}`}
            aria-pressed={updateTarget === "local"}
            onClick={() => onUpdateTargetChange("local")}
          >
            Local
          </button>
        </div>
      </div>
      <button
        type="button"
        className="providerModal_footerBtn"
        disabled={footerDisabled}
        onClick={() => void onPrimaryAction()}
      >
        {buttonLabel}
      </button>
    </div>
  );
}


// review