import type { CloudLlmProviderId } from "@/lib/types/llm-provider";

export type ProviderConfigModalProps = {
  open: boolean;
  onClose: () => void;
};

/** Which column the primary save action applies to */
export type UpdateTarget = "cloud" | "local";

/**
 * Single activity flag replacing multiple booleans.
 * - checkingPing: "Test connection (no save)" on local when Ollama is active
 * - checkingHelpRetry: "Check connection again" inside the help panel
 */
export type BusyState =
  | "idle"
  | "savingCloud"
  | "savingLocal"
  | "activatingLocal"
  | "checkingPing"
  | "checkingHelpRetry";

export type ProviderModalErrors = {
  cloud?: string;
  localSave?: string;
  localConnect?: string;
};

export type ProviderSelectOption = {
  id: CloudLlmProviderId;
  label: string;
};

export type ProviderConfigModalActiveBannerProps = {
  activeLabel: string | null;
  activeModel: string | null;
};

export type ProviderConfigModalCloudProps = {
  focused: boolean;
  onColumnClick: () => void;
  isOllamaActive: boolean;
  isCurrentCloud: boolean;
  loading: boolean;
  providersEmpty: boolean;
  selectedId: CloudLlmProviderId;
  onSelectedIdChange: (id: CloudLlmProviderId) => void;
  providerSelectOptions: ProviderSelectOption[];
  apiKeyDraft: string;
  modelDraft: string;
  onApiKeyDraftChange: (value: string) => void;
  onModelDraftChange: (value: string) => void;
  onCloudFieldFocus: () => void;
  cloudError?: string;
  providerHasApiKey: boolean;
};

export type ProviderConfigModalLocalProps = {
  focused: boolean;
  onColumnClick: () => void;
  isOllamaActive: boolean;
  ollamaModelDraft: string;
  onOllamaModelDraftChange: (value: string) => void;
  onLocalFieldFocus: () => void;
  localSaveError?: string;
  localConnectError?: string;
  localHelpVisible: boolean;
  testDisabled: boolean;
  testBusy: boolean;
  onTestConnection: () => void;
  retryDisabled: boolean;
  retryBusy: boolean;
  onRetryHelpCheck: () => void;
};

export type ProviderConfigModalFooterProps = {
  updateTarget: UpdateTarget;
  onUpdateTargetChange: (target: UpdateTarget) => void;
  buttonLabel: string;
  footerDisabled: boolean;
  onPrimaryAction: () => void;
};
