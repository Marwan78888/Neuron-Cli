export const BRAND_NAME = "Neuron"
export const CLI_DISPLAY_NAME = "neuron"
export const DEFAULT_PROVIDER_NAME = "Neuron Default"

export function displayProviderName(providerID: string, fallback: string) {
  if (providerID === "opencode") return DEFAULT_PROVIDER_NAME
  if (providerID === "opencode-go") return "Neuron Go"
  return fallback
}

