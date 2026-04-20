import { type Component, type JSX, createEffect, createMemo, createSignal } from "solid-js"
import { Select } from "@opencode-ai/ui/select"
import { Switch } from "@opencode-ai/ui/switch"
import { TextField } from "@opencode-ai/ui/text-field"
import { showToast } from "@opencode-ai/ui/toast"
import type { Config } from "@opencode-ai/sdk/v2/client"
import { useGlobalSync } from "@/context/global-sync"
import { useLanguage } from "@/context/language"
import { useSDK } from "@/context/sdk"
import { SettingsList } from "./settings-list"

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

const PROVIDERS: { value: SearchProviderID; label: string }[] = [
  { value: "perplexity", label: "Perplexity" },
  { value: "brave", label: "Brave" },
]

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

function isFullAccessPermission(permission: unknown) {
  if (permission === "allow") return true
  if (!permission || typeof permission !== "object" || Array.isArray(permission)) return false
  return Reflect.get(permission, "*") === "allow"
}

export const SettingsSearch: Component = () => {
  const globalSync = useGlobalSync()
  const language = useLanguage()
  const sdk = useSDK()
  const [apiKey, setApiKey] = createSignal("")
  const [saving, setSaving] = createSignal(false)

  const child = createMemo(() => globalSync.child(sdk.directory, { bootstrap: false }))
  const config = createMemo(() => child()[0].config as WorkspaceConfig)
  const search = createMemo(() => config().search ?? {})
  const fullAccess = createMemo(() => isFullAccessPermission(config().permission))

  createEffect(() => {
    setApiKey(search().apiKey ?? "")
  })

  const save = async (next: WorkspaceConfig) => {
    const previous = config()
    const [, setStore] = child()
    setSaving(true)
    setStore("config", next as Config)
    try {
      await sdk.client.config.update({ config: next as Config })
    } catch (error) {
      setStore("config", previous as Config)
      const message = error instanceof Error ? error.message : String(error)
      showToast({
        title: language.t("common.requestFailed"),
        description: message,
        variant: "error",
      })
      throw error
    } finally {
      setSaving(false)
    }
  }

  const setProvider = (provider: SearchProviderID) => {
    void save(
      withAgentBrowserSkill({
        ...config(),
        search: {
          ...search(),
          provider,
          apiKey: search().apiKey ?? "",
        },
      }),
    )
  }

  const commitApiKey = () => {
    if (apiKey() === (search().apiKey ?? "")) return
    void save(
      withAgentBrowserSkill({
        ...config(),
        search: {
          ...search(),
          provider: search().provider ?? "perplexity",
          apiKey: apiKey().trim(),
        },
      }),
    )
  }

  const setFullAccess = (enabled: boolean) => {
    void save({
      ...config(),
      permission: enabled ? "allow" : { "*": "ask" },
    })
  }

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex flex-col gap-1 pt-6 pb-8 max-w-[720px]">
          <h2 class="text-16-medium text-text-strong">{language.t("settings.search.title")}</h2>
          <p class="text-13-regular text-text-weak">{language.t("settings.search.description")}</p>
        </div>
      </div>

      <div class="flex flex-col gap-8 max-w-[720px]">
        <SettingsList>
          <SettingsRow
            title={language.t("settings.search.row.provider.title")}
            description={language.t("settings.search.row.provider.description")}
          >
            <Select
              options={PROVIDERS}
              current={PROVIDERS.find((option) => option.value === (search().provider ?? "perplexity"))}
              value={(option) => option.value}
              label={(option) => option.label}
              onSelect={(option) => option && setProvider(option.value)}
              variant="secondary"
              size="small"
              triggerVariant="settings"
            />
          </SettingsRow>

          <SettingsRow
            title={language.t("settings.search.row.apiKey.title")}
            description={language.t("settings.search.row.apiKey.description")}
          >
            <TextField
              type="password"
              value={apiKey()}
              onChange={setApiKey}
              onBlur={commitApiKey}
              placeholder={language.t("settings.search.row.apiKey.placeholder")}
              class="min-w-[280px]"
            />
          </SettingsRow>

          <SettingsRow
            title={language.t("settings.search.row.fullAccess.title")}
            description={language.t("settings.search.row.fullAccess.description")}
          >
            <div class="flex items-center gap-3">
              <Switch checked={fullAccess()} onChange={setFullAccess} />
            </div>
          </SettingsRow>
        </SettingsList>

        <div class="rounded-xl border border-border-weak-base bg-surface-base px-4 py-3">
          <p class="text-13-medium text-text-strong">{language.t("settings.search.agentBrowser.title")}</p>
          <p class="mt-1 text-12-regular text-text-weak">{language.t("settings.search.agentBrowser.description")}</p>
          <p class="mt-2 text-12-medium text-text-base break-all">{AGENT_BROWSER_SKILL_URL}</p>
          <p class="mt-2 text-11-regular text-text-dim">
            {saving() ? language.t("settings.search.saving") : language.t("settings.search.saved")}
          </p>
        </div>
      </div>
    </div>
  )
}

const SettingsRow: Component<{
  title: string
  description: string
  children: JSX.Element
}> = (props) => {
  return (
    <div class="flex flex-wrap items-center gap-4 py-3 border-b border-border-weak-base last:border-none sm:flex-nowrap">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-14-medium text-text-strong">{props.title}</span>
        <span class="text-12-regular text-text-weak">{props.description}</span>
      </div>
      <div class="flex w-full justify-end sm:w-auto sm:shrink-0">{props.children}</div>
    </div>
  )
}
