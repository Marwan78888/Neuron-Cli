import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"

const id = "internal:home-welcome"

const STEPS = [
  { title: "Parallel by default", hint: "Edit or review many files in one turn" },
  { title: "Self-directed sub-agents", hint: "Explore, review, test — spawned when useful" },
  { title: "Skill-aware", hint: "The right tool finds you, not the other way around" },
  { title: "Safe by construction", hint: "Jailbreak defense + rule precedence built in" },
]

const ACTIONS = [
  { label: "Connect a provider", cmd: "/connect" },
  { label: "Switch model", cmd: "/models" },
  { label: "Pick a theme", cmd: "/themes" },
]

function Welcome(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const [reveal, setReveal] = createSignal(0)
  const [pulse, setPulse] = createSignal(0)

  const timers: ReturnType<typeof setTimeout>[] = []
  const schedule = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))

  schedule(120, () => setReveal(1))
  schedule(360, () => setReveal(2))
  schedule(620, () => setReveal(3))
  schedule(900, () => setReveal(4))
  schedule(1200, () => setReveal(5))

  const pulseTimer = setInterval(() => setPulse((x) => (x + 1) % 4), 640)

  onCleanup(() => {
    timers.forEach(clearTimeout)
    clearInterval(pulseTimer)
  })

  const dot = createMemo(() => {
    const x = pulse()
    if (x === 0) return "◆"
    if (x === 1) return "◇"
    if (x === 2) return "◈"
    return "◇"
  })

  const dismiss = () => props.api.kv.set("bootstrap_completed", true)

  return (
    <box
      width="100%"
      maxWidth={75}
      backgroundColor={theme().backgroundPanel}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      gap={1}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme().text} attributes={TextAttributes.BOLD}>
          <span style={{ fg: theme().primary }}>{dot()} </span>Welcome to Neuron
        </text>
        <text fg={theme().textMuted} onMouseDown={dismiss}>
          skip
        </text>
      </box>

      <Show when={reveal() >= 1}>
        <text fg={theme().textMuted}>A calm, local-first coding agent — built to outrun Claude Code.</text>
      </Show>

      <Show when={reveal() >= 2}>
        <box gap={0}>
          <For each={STEPS}>
            {(step, index) => (
              <Show when={reveal() >= 2 + Math.floor(index() / 2)}>
                <box flexDirection="row" gap={1}>
                  <text flexShrink={0} fg={theme().primary}>
                    ▸
                  </text>
                  <text fg={theme().text} flexShrink={0}>
                    {step.title}
                  </text>
                  <text fg={theme().textMuted}>— {step.hint}</text>
                </box>
              </Show>
            )}
          </For>
        </box>
      </Show>

      <Show when={reveal() >= 5}>
        <box flexDirection="row" gap={2} paddingTop={1}>
          <For each={ACTIONS}>
            {(action) => (
              <box flexDirection="row" gap={1}>
                <text fg={theme().textMuted}>{action.label}</text>
                <text fg={theme().text}>{action.cmd}</text>
              </box>
            )}
          </For>
        </box>
      </Show>

      <Show when={reveal() >= 5}>
        <text fg={theme().textMuted}>Type anything below to begin. This card will not appear again.</text>
      </Show>
    </box>
  )
}

function View(props: { api: TuiPluginApi }) {
  const done = createMemo(() => props.api.kv.get("bootstrap_completed", false))
  const first = createMemo(() => props.api.state.session.count() === 0)
  const show = createMemo(() => first() && !done())

  createEffect(() => {
    if (!first() && !done()) props.api.kv.set("bootstrap_completed", true)
  })

  return (
    <Show when={show()}>
      <Welcome api={props.api} />
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "Replay welcome tour",
      value: "welcome.replay",
      category: "System",
      hidden: api.route.current.name !== "home",
      onSelect() {
        api.kv.set("bootstrap_completed", false)
        api.ui.dialog.clear()
      },
    },
  ])

  api.slots.register({
    order: 50,
    slots: {
      home_bottom() {
        return <View api={api} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
