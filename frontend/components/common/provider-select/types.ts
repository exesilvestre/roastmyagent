export type ProviderSelectOption = {
  id: string;
  label: string;
};

export type ProviderSelectProps = {
  value: string;
  onChange: (id: string) => void;
  options: ProviderSelectOption[];
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
};
