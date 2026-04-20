import type { Config } from "@opencode-ai/sdk/v2"
import { createMemo } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useProject } from "@tui/context/project"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"

const AGENT_BROWSER_SKILL_URL = "https://skills.sh/vercel-labs/agent-browser/agent-browser"

type SearchProviderID = "perplexity" | "brave"

type WorkspaceConfig = Config & {
  search?: {
    provider?: SearchProviderID
    apiKey?: string
  }
  skills?: {
    paths?: string[]
    urls?: string[]
  }
  permission?: unknown
}

function currentProvider(config: WorkspaceConfig) {
  return config.search?.provider ?? "perplexity"
}

function mergePermission(permission: unknown, enabled: boolean) {
  if (!permission || typeof permission !== "object" || Array.isArray(permission)) {
    return enabled ? "allow" : { "*": "ask" }
  }
  return {
    ...permission,
    "*": enabled ? "allow" : "ask",
  }
}

function fullAccessEnabled(permission: unknown) {
  if (permission === "allow") return true
  if (!permission || typeof permission !== "object" || Array.isArray(permission)) return false
  return Reflect.get(permission, "*") === "allow"
}

function withAgentBrowserSkill(config: WorkspaceConfig) {
  const urls = config.skills?.urls ?? []
  if (urls.includes(AGENT_BROWSER_SKILL_URL)) return config
  return {
    ...config,
    skills: {
      ...config.skills,
      urls: [...urls, AGENT_BROWSER_SKILL_URL],
    },
  }
}

export function DialogSearchProvider() {
  const dialog = useDialog()
  const project = useProject()
  const sdk = useSDK()
  const sync = useSync()
  const { theme } = useTheme()
  const toast = useToast()

  const config = createMemo(() => sync.data.config as WorkspaceConfig)

  async function save(next: WorkspaceConfig) {
    const workspace = project.workspace.current()
    const previous = config()
    const payload = withAgentBrowserSkill(next)
    sync.set("config", payload as Config)
    try {
      await sdk.client.config.update({
        workspace,
        config: payload as Config,
      })
      toast.show({
        variant: "success",
        message: "Search settings updated",
      })
    } catch (error) {
      sync.set("config", previous as Config)
      toast.show({
        variant: "error",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  function openProviderSelect() {
    dialog.replace(() => (
      <DialogSelect
        title="Search provider"
        current={currentProvider(config())}
        options={[
          {
            title: "Perplexity",
            value: "perplexity" as const,
            description: "Use Perplexity as the preferred external search backend.",
          },
          {
            title: "Brave",
            value: "brave" as const,
            description: "Use Brave Search as the preferred external search backend.",
          },
        ]}
        onSelect={(option) => {
          void save({
            ...config(),
            search: {
              ...config().search,
              provider: option.value,
            },
          })
          dialog.replace(() => <DialogSearchProvider />)
        }}
      />
    ))
  }

  function openApiKeyPrompt() {
    dialog.replace(() => (
      <DialogPrompt
        title="Search API key"
        placeholder="API key"
        value={config().search?.apiKey ?? ""}
        description={() => (
          <box gap={1}>
            <text fg={theme.textMuted}>
              Save the API key for {currentProvider(config()) === "perplexity" ? "Perplexity" : "Brave Search"} in
              the workspace config.
            </text>
            <text fg={theme.textMuted}>Neuron will keep the agent-browser skill URL attached for web research flows.</text>
          </box>
        )}
        onConfirm={(value) => {
          void save({
            ...config(),
            search: {
              ...config().search,
              provider: currentProvider(config()),
              apiKey: value.trim(),
            },
          })
          dialog.replace(() => <DialogSearchProvider />)
        }}
      />
    ))
  }

  return (
    <DialogSelect
      title="Search settings"
      options={[
        {
          title: "Preferred provider",
          value: "provider",
          description: currentProvider(config()) === "perplexity" ? "Perplexity" : "Brave",
          onSelect: () => openProviderSelect(),
        },
        {
          title: "Search API key",
          value: "api-key",
          description: config().search?.apiKey ? "Configured" : "Not configured",
          onSelect: () => openApiKeyPrompt(),
        },
        {
          title: fullAccessEnabled(config().permission) ? "Disable full computer access" : "Enable full computer access",
          value: "full-access",
          description: fullAccessEnabled(config().permission)
            ? "Tools run without permission prompts in this workspace."
            : "Ask before tool use in this workspace.",
          onSelect: async () => {
            await save({
              ...config(),
              permission: mergePermission(config().permission, !fullAccessEnabled(config().permission)),
            })
            dialog.replace(() => <DialogSearchProvider />)
          },
        },
        {
          title: "Search skill",
          value: "skill",
          description: AGENT_BROWSER_SKILL_URL,
          onSelect: async () => {
            await save(config())
            dialog.replace(() => <DialogSearchProvider />)
          },
        },
      ]}
    />
  )
}
