import { createSignal, onCleanup, Show } from "solid-js"
import { useTheme } from "../context/theme"

export interface TodoItemProps {
  status: string
  content: string
  priority?: string
}

// Pulses an opacity channel at ~1Hz so consumers can highlight the
// currently-active todo without needing a full animation runtime.
function usePulse(active: () => boolean) {
  const [phase, setPhase] = createSignal(0)
  const interval = setInterval(() => {
    if (!active()) return
    setPhase((p) => (p + 1) % 2)
  }, 700)
  onCleanup(() => clearInterval(interval))
  return phase
}

function statusGlyph(status: string) {
  if (status === "completed") return "✓"
  if (status === "in_progress") return "▸"
  if (status === "cancelled") return "✗"
  return "○"
}

function priorityDot(priority: string | undefined, theme: ReturnType<typeof useTheme>["theme"]) {
  if (priority === "high") return theme.error
  if (priority === "medium") return theme.warning
  return undefined
}

export function TodoItem(props: TodoItemProps) {
  const { theme } = useTheme()
  const pulse = usePulse(() => props.status === "in_progress")

  const bodyColor = () => {
    if (props.status === "in_progress") return theme.text
    if (props.status === "completed") return theme.textMuted
    if (props.status === "cancelled") return theme.textMuted
    return theme.text
  }

  const glyphColor = () => {
    if (props.status === "in_progress") return pulse() === 0 ? theme.warning : theme.accent
    if (props.status === "completed") return theme.success
    if (props.status === "cancelled") return theme.error
    return theme.textMuted
  }

  const dot = () => priorityDot(props.priority, theme)

  return (
    <box flexDirection="row" gap={1}>
      <text flexShrink={0} fg={glyphColor()}>
        {props.status === "in_progress" ? <b>{statusGlyph(props.status)}</b> : statusGlyph(props.status)}
      </text>
      <Show when={dot()}>
        <text flexShrink={0} fg={dot()}>
          ●
        </text>
      </Show>
      <text
        flexGrow={1}
        wrapMode="word"
        style={{
          fg: bodyColor(),
        }}
      >
        {props.status === "in_progress" ? <b>{props.content}</b> : props.content}
      </text>
    </box>
  )
}
