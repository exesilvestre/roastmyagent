import type { AgentConnectionKind } from "@/lib/types/agent-connection";
import type { CreateSessionAgentConnection } from "@/lib/stores/session-store";

export type NewSessionModalProps = {
  open: boolean;
  onClose: () => void;
};

export type HttpAuth = "none" | "bearer" | "basic";

export type VerifyResult = {
  ok: boolean;
  detail?: string | null;
  preview?: string | null;
};

export type NewSessionModalHeaderProps = {
  step: number;
};

export type NewSessionAgentStepProps = {
  title: string;
  onTitleChange: (value: string) => void;
  agentDescription: string;
  onAgentDescriptionChange: (value: string) => void;
  localError: string | null;
  onClose: () => void;
  onNext: () => void;
};

export type NewSessionConnectionStepProps = {
  mode: AgentConnectionKind;
  onModeChange: (mode: AgentConnectionKind) => void;
  httpUrl: string;
  onHttpUrlChange: (value: string) => void;
  bodyKind: string;
  onBodyKindChange: (value: string) => void;
  httpBodyJson: string;
  onHttpBodyJsonChange: (value: string) => void;
  httpBodyText: string;
  onHttpBodyTextChange: (value: string) => void;
  httpAuth: HttpAuth;
  onHttpAuthChange: (auth: HttpAuth) => void;
  basicUser: string;
  onBasicUserChange: (value: string) => void;
  httpSecret: string;
  onHttpSecretChange: (value: string) => void;
  httpUrlSameAsApi: boolean;
  connectionPayload: CreateSessionAgentConnection | undefined;
  localError: string | null;
  onBack: () => void;
  onNext: () => void;
};

export type NewSessionTestStepProps = {
  testRequestPreview: string;
  testLoading: boolean;
  testHint: string | null;
  connectionPayload: CreateSessionAgentConnection | undefined;
  localError: string | null;
  titleTrimmed: boolean;
  submitting: boolean;
  onBack: () => void;
  onTest: () => Promise<void>;
  onCreate: () => Promise<void>;
};
