import type { ProviderConfigModalActiveBannerProps } from "./types";

export function ActiveBanner({
  activeLabel,
  activeModel,
}: ProviderConfigModalActiveBannerProps) {
  if (activeLabel != null) {
    return (
      <div className="providerModal_activeBanner" role="status">
        <span className="providerModal_activeLabel">Active now</span>
        <span className="providerModal_activeValue">
          {activeLabel}
          {activeModel ? (
            <>
              {" "}
              · <span className="providerModal_activeModel">{activeModel}</span>
            </>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <div className="providerModal_activeBanner providerModal_activeBanner_muted" role="status">
      <span className="providerModal_activeLabel">Active now</span>
      <span className="providerModal_activeValue">None, update cloud or local below</span>
    </div>
  );
}


// review