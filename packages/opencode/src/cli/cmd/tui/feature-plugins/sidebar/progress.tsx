import type { AssistantMessage, ToolPart } from "@opencode-ai/sdk/v2"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js"

const id = "internal:sidebar-progress"

const MAX_RUNNING_DISPLAY = 3

function useNow() {
  const [now, setNow] = createSignal(Date.now())
  const interval = setInterval(() => setNow(Date.now()), 1000)
  onCleanup(() => clearInterval(interval))
  return now
}

function formatElapsed(ms: number) {
  if (ms < 0) return "0s"
  const total = Math.floor(ms / 1000)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes < 60) return `${minutes}m ${seconds}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const status = createMemo(() => props.api.state.session.status(props.session_id))
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))
  const now = useNow()

  const lastAssistant = createMemo(() =>
    msg().findLast((item): item is AssistantMessage => item.role === "assistant"),
  )

  const running = createMemo(() => {
    const a = lastAssistant()
    if (!a) return [] as ToolPart[]
    return props.api.state
      .part(a.id)
      .flatMap((part) => (part.type === "tool" && part.state.status === "running" ? [part] : []))
  })

  const turnStartedAt = createMemo(() => {
    const s = status()
    if (!s || s.type === "idle") return undefined
    const a = lastAssistant()
    if (a && !a.time.completed) return a.time.created
    const user = msg().findLast((item) => item.role === "user")
    return user?.time?.created
  })

  const turnElapsed = createMemo(() => {
    const start = turnStartedAt()
    if (!start) return undefined
    return now() - start
  })

  const visible = createMemo(() => {
    const s = status()
    if (!s) return false
    return s.type !== "idle"
  })

  const label = createMemo(() => {
    const s = status()
    if (!s) return ""
    if (s.type === "retry") return `Retrying · attempt ${s.attempt}`
    if (s.type === "busy") return "Working"
    return "Idle"
  })

  const dotColor = createMemo(() => {
    const s = status()
    if (s?.type === "retry") return theme().warning
    return theme().accent
  })

  return (
    <Show when={visible()}>
      <box>
        <text fg={theme().text}>
          <b>Progress</b>
        </text>
        <text fg={theme().textMuted}>
          <span style={{ fg: dotColor() }}>●</span> {label()}
          <Show when={turnElapsed() !== undefined}>
            <span> · {formatElapsed(turnElapsed() ?? 0)}</span>
          </Show>
        </text>
        <Show when={running().length > 0}>
          <text fg={theme().textMuted}>
            {running().length} running
          </text>
          <For each={running().slice(0, MAX_RUNNING_DISPLAY)}>
            {(part) => {
              const elapsed = createMemo(() =>
                part.state.status === "running" ? now() - part.state.time.start : 0,
              )
              const label = createMemo(() => {
                if (part.state.status !== "running") return part.tool
                const title = part.state.title?.trim()
                return title && title.length > 0 ? title : part.tool
              })
              return (
                <text fg={theme().textMuted}>
                  <span style={{ fg: theme().accent }}>▸</span> {label()}
                  <span> · {formatElapsed(elapsed())}</span>
                </text>
              )
            }}
          </For>
          <Show when={running().length > MAX_RUNNING_DISPLAY}>
            <text fg={theme().textMuted}>+{running().length - MAX_RUNNING_DISPLAY} more</text>
          </Show>
        </Show>
        <Show when={running().length === 0 && status()?.type === "busy"}>
          <text fg={theme().textMuted}>Thinking…</text>
        </Show>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 90,
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
