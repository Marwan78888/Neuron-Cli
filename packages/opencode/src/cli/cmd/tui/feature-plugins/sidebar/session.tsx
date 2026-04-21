import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"

const id = "internal:sidebar-session"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

function formatElapsed(ms: number) {
  if (ms < 1000) return "just now"
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  if (m < 60) return `${m}m ${rs}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function lastAssistant(list: ReturnType<TuiPluginApi["state"]["session"]["messages"]>) {
  return list.findLast((item): item is AssistantMessage => item.role === "assistant" && item.tokens.output > 0)
}

function contextPercent(last: AssistantMessage | undefined, providers: TuiPluginApi["state"]["provider"]) {
  if (!last) return 0
  const tokens =
    last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
  const model = providers.find((item) => item.id === last.providerID)?.models[last.modelID]
  if (!model?.limit.context) return 0
  return Math.min(100, Math.round((tokens / model.limit.context) * 100))
}

function bar(percent: number, width: number) {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  return {
    filled: "█".repeat(filled),
    empty: "░".repeat(width - filled),
  }
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))
  const last = createMemo(() => lastAssistant(msg()))
  const cost = createMemo(() => msg().reduce((sum, item) => sum + (item.role === "assistant" ? item.cost : 0), 0))
  const percent = createMemo(() => contextPercent(last(), props.api.state.provider))
  const status = createMemo(() => props.api.state.session.status(props.session_id))
  const modelLabel = createMemo(() => {
    const item = last()
    if (!item) return "—"
    const provider = props.api.state.provider.find((p) => p.id === item.providerID)
    const model = provider?.models[item.modelID]
    return model?.name ?? item.modelID
  })

  const [now, setNow] = createSignal(Date.now())
  const tick = setInterval(() => setNow(Date.now()), 1000)
  onCleanup(() => clearInterval(tick))

  const [turnStart, setTurnStart] = createSignal<number | null>(null)
  createEffect(() => {
    const s = status()
    if (s && s.type !== "idle") {
      if (turnStart() === null) setTurnStart(Date.now())
      return
    }
    setTurnStart(null)
  })

  const elapsed = createMemo(() => {
    const start = turnStart()
    if (!start) return null
    return formatElapsed(now() - start)
  })

  const [pulse, setPulse] = createSignal(0)
  const pulseTimer = setInterval(() => setPulse((x) => (x + 1) % 3), 500)
  onCleanup(() => clearInterval(pulseTimer))

  const statusText = createMemo(() => {
    const s = status()
    if (!s) return { label: "—", color: theme().textMuted }
    if (s.type === "idle") return { label: "idle", color: theme().textMuted }
    if (s.type === "retry") return { label: "retrying", color: theme().warning }
    return { label: "working", color: theme().primary }
  })

  const bars = createMemo(() => bar(percent(), 14))

  const percentColor = createMemo(() => {
    const p = percent()
    if (p >= 90) return theme().error
    if (p >= 70) return theme().warning
    return theme().primary
  })

  const dot = createMemo(() => {
    const s = status()
    if (!s || s.type === "idle") return "•"
    const p = pulse()
    if (p === 0) return "◆"
    if (p === 1) return "◈"
    return "◇"
  })

  return (
    <box gap={1}>
      <box flexDirection="row" gap={1} justifyContent="space-between">
        <text fg={theme().text} attributes={TextAttributes.BOLD}>
          Session
        </text>
        <text fg={statusText().color}>
          {dot()} {statusText().label}
          <Show when={elapsed()}>
            <span style={{ fg: theme().textMuted }}> · {elapsed()}</span>
          </Show>
        </text>
      </box>
      <box gap={0}>
        <text fg={theme().textMuted}>Model</text>
        <text fg={theme().text}>{modelLabel()}</text>
      </box>
      <Show when={last()}>
        <box gap={0}>
          <box flexDirection="row" justifyContent="space-between">
            <text fg={theme().textMuted}>Context</text>
            <text fg={theme().textMuted}>{percent()}%</text>
          </box>
          <text>
            <span style={{ fg: percentColor() }}>{bars().filled}</span>
            <span style={{ fg: theme().borderSubtle }}>{bars().empty}</span>
          </text>
        </box>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme().textMuted}>Spent</text>
          <text fg={theme().text}>{money.format(cost())}</text>
        </box>
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 50,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
