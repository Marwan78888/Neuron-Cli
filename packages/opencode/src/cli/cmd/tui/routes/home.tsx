import { Prompt, type PromptRef } from "@tui/component/prompt"
import { RGBA } from "@opentui/core"
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { useProject } from "../context/project"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { TuiPluginRuntime } from "../plugin"
import { useTheme } from "../context/theme"

let once = false
const placeholder = {
  normal: ["Fix a TODO in the codebase", "What is the tech stack of this project?", "Fix broken tests"],
  shell: ["ls -la", "git status", "pwd"],
}

const BANNER_LINES = [
  "███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗ ███╗   ██╗",
  "████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗████╗  ██║",
  "██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║██╔██╗ ██║",
  "██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██║╚██╗██║",
  "██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝██║ ╚████║",
  "╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝",
]

const WHITE = RGBA.fromInts(144, 145, 150)
const SOFT_WHITE = RGBA.fromInts(179, 179, 179)
const GLITCH_A = RGBA.fromInts(255, 0, 29)
const GLITCH_B = RGBA.fromInts(228, 36, 255)
const GLITCH_C = RGBA.fromInts(255, 245, 0)
const GLITCH_D = RGBA.fromInts(37, 255, 0)
const GLITCH_E = RGBA.fromInts(22, 34, 255)

export function Home() {
  const sync = useSync()
  const project = useProject()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const { theme } = useTheme()
  const [glitchFrame, setGlitchFrame] = createSignal(-1)
  let glitchTimer: ReturnType<typeof setInterval> | undefined
  let sent = false

  const stopGlitch = () => {
    if (!glitchTimer) return
    clearInterval(glitchTimer)
    glitchTimer = undefined
  }

  const triggerGlitch = () => {
    stopGlitch()
    setGlitchFrame(0)
    glitchTimer = setInterval(() => {
      setGlitchFrame((frame) => {
        const next = frame + 1
        if (next > 7) {
          stopGlitch()
          return -1
        }
        return next
      })
    }, 70)
  }

  onCleanup(() => {
    stopGlitch()
  })

  const bannerColor = createMemo(() => {
    const frame = glitchFrame()
    if (frame < 0) return WHITE
    return [GLITCH_A, GLITCH_B, GLITCH_C, GLITCH_D, GLITCH_E, theme.text][frame % 6] ?? WHITE
  })

  const bannerShadow = createMemo(() => {
    const frame = glitchFrame()
    if (frame < 0) return SOFT_WHITE
    return [GLITCH_E, GLITCH_A, GLITCH_B, GLITCH_C, GLITCH_D, theme.textMuted][frame % 6] ?? SOFT_WHITE
  })

  const lineOffset = (index: number) => {
    const frame = glitchFrame()
    if (frame < 0) return 0
    const wave = [0, 2, 1, 3, 0, 1, 0, 2]
    return (wave[(frame + index) % wave.length] ?? 0) - 1
  }

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (route.prompt) {
      r.set(route.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  // Wait for sync and model store to be ready before auto-submitting --prompt
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <>
      <box flexGrow={1} alignItems="center" paddingLeft={2} paddingRight={2}>
        <box flexGrow={1} minHeight={0} />
        <box height={4} minHeight={0} flexShrink={1} />
        <box flexShrink={0}>
          <TuiPluginRuntime.Slot name="home_logo" mode="replace">
            <box
              flexDirection="column"
              alignItems="center"
              gap={1}
              onMouse={(evt) => {
                if (evt.type !== "up") return
                triggerGlitch()
              }}
            >
              <box flexDirection="column" alignItems="center">
                {BANNER_LINES.map((line, index) => (
                  <text fg={bannerColor()}>
                    {`${" ".repeat(Math.max(0, lineOffset(index)))}${line}`}
                  </text>
                ))}
              </box>
              <text fg={bannerColor()}>N E U R O N</text>
              <text fg={bannerShadow()}>Calm, local-first coding agent</text>
            </box>
          </TuiPluginRuntime.Slot>
        </box>
        <box height={1} minHeight={0} flexShrink={1} />
        <box width="100%" maxWidth={75} zIndex={1000} paddingTop={1} flexShrink={0}>
          <TuiPluginRuntime.Slot
            name="home_prompt"
            mode="replace"
            workspace_id={project.workspace.current()}
            ref={bind}
          >
            <Prompt
              ref={bind}
              workspaceID={project.workspace.current()}
              right={<TuiPluginRuntime.Slot name="home_prompt_right" workspace_id={project.workspace.current()} />}
              placeholders={placeholder}
            />
          </TuiPluginRuntime.Slot>
        </box>
        <TuiPluginRuntime.Slot name="home_bottom" />
        <box flexGrow={1} minHeight={0} />
        <Toast />
      </box>
      <box width="100%" flexShrink={0}>
        <TuiPluginRuntime.Slot name="home_footer" mode="single_winner" />
      </box>
    </>
  )
}
