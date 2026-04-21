import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createMemo, For, Show, createSignal } from "solid-js"
import { TodoItem } from "../../component/todo-item"

const id = "internal:sidebar-todo"

const RECENT_COMPLETED_LIMIT = 3

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const list = createMemo(() => props.api.state.session.todo(props.session_id))

  const buckets = createMemo(() => {
    const all = list()
    return {
      in_progress: all.filter((item) => item.status === "in_progress"),
      pending: all.filter((item) => item.status === "pending"),
      completed: all.filter((item) => item.status === "completed"),
      cancelled: all.filter((item) => item.status === "cancelled"),
    }
  })

  const counts = createMemo(() => {
    const b = buckets()
    const total = list().length
    const done = b.completed.length + b.cancelled.length
    return { total, done, remaining: total - done }
  })

  const progress = createMemo(() => {
    const { total, done } = counts()
    if (total === 0) return { filled: 0, empty: 0, label: "0 / 0" }
    const width = 10
    const filled = Math.max(0, Math.min(width, Math.round((done / total) * width)))
    return { filled, empty: width - filled, label: `${done} / ${total}` }
  })

  // Show the pane whenever there is any todo activity, even if the list is
  // fully complete — the user still benefits from seeing the final state.
  const show = createMemo(() => list().length > 0)

  const [expandCompleted, setExpandCompleted] = createSignal(false)
  const recentCompleted = createMemo(() => {
    const c = buckets().completed
    const sliced = expandCompleted() ? c : c.slice(-RECENT_COMPLETED_LIMIT)
    return sliced
  })
  const hiddenCompleted = createMemo(() => {
    const c = buckets().completed
    if (expandCompleted()) return 0
    return Math.max(0, c.length - RECENT_COMPLETED_LIMIT)
  })

  return (
    <Show when={show()}>
      <box gap={0}>
        <box flexDirection="row" gap={1}>
          <text fg={theme().text}>
            <b>Todo</b>
          </text>
          <text fg={theme().textMuted}>
            {progress().label}
          </text>
        </box>

        <Show when={counts().total > 0}>
          <box flexDirection="row" gap={0}>
            <text fg={theme().success}>{"█".repeat(progress().filled)}</text>
            <text fg={theme().border}>{"░".repeat(progress().empty)}</text>
          </box>
        </Show>

        <Show when={buckets().in_progress.length > 0}>
          <box paddingTop={1}>
            <For each={buckets().in_progress}>
              {(item) => <TodoItem status={item.status} content={item.content} priority={item.priority} />}
            </For>
          </box>
        </Show>

        <Show when={buckets().pending.length > 0}>
          <box paddingTop={1}>
            <For each={buckets().pending}>
              {(item) => <TodoItem status={item.status} content={item.content} priority={item.priority} />}
            </For>
          </box>
        </Show>

        <Show when={buckets().completed.length > 0}>
          <box paddingTop={1}>
            <For each={recentCompleted()}>
              {(item) => <TodoItem status={item.status} content={item.content} priority={item.priority} />}
            </For>
            <Show when={hiddenCompleted() > 0}>
              <text fg={theme().textMuted} onMouseDown={() => setExpandCompleted(true)}>
                + {hiddenCompleted()} more completed
              </text>
            </Show>
            <Show when={expandCompleted() && buckets().completed.length > RECENT_COMPLETED_LIMIT}>
              <text fg={theme().textMuted} onMouseDown={() => setExpandCompleted(false)}>
                collapse
              </text>
            </Show>
          </box>
        </Show>

        <Show when={buckets().cancelled.length > 0}>
          <box paddingTop={1}>
            <For each={buckets().cancelled}>
              {(item) => <TodoItem status={item.status} content={item.content} priority={item.priority} />}
            </For>
          </box>
        </Show>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 400,
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
