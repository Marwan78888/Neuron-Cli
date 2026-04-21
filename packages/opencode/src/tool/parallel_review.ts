import z from "zod"
import path from "path"
import { Effect } from "effect"
import * as Tool from "./tool"
import { TaskTool } from "./task"
import { Instance } from "../project/instance"
import DESCRIPTION from "./parallel_review.txt"

const MAX_PARALLEL_REVIEWERS = 5

const Target = z.object({
  filePath: z.string().describe("Absolute path of the file or directory to review"),
  focus: z.string().optional().describe("Optional note telling the reviewer what to prioritise"),
})

const Parameters = z.object({
  targets: z
    .array(Target)
    .min(2)
    .max(MAX_PARALLEL_REVIEWERS)
    .describe(
      `Between 2 and ${MAX_PARALLEL_REVIEWERS} targets to review in parallel. Each target spawns one code-reviewer sub-agent.`,
    ),
  context: z.string().optional().describe("Optional shared context passed to every reviewer (e.g. the PR goal)"),
})

export const ParallelReviewTool = Tool.define(
  "parallel_review",
  Effect.gen(function* () {
    const taskInfo = yield* TaskTool
    const task = yield* taskInfo.init()

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: z.infer<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const outcomes = yield* Effect.all(
            params.targets.map((target, index) => {
              const rel = path.relative(Instance.worktree, target.filePath)
              const promptLines = [
                `Review the following path: ${target.filePath}`,
                ...(target.focus ? [`Focus: ${target.focus}`] : []),
                ...(params.context ? [`Shared context: ${params.context}`] : []),
                "",
                "Return your findings grouped by severity (BLOCKER / HIGH / MEDIUM / LOW).",
              ]
              return task
                .execute(
                  {
                    description: `review ${rel}`,
                    prompt: promptLines.join("\n"),
                    subagent_type: "code-reviewer",
                  },
                  ctx,
                )
                .pipe(
                  Effect.map((result) => ({ kind: "ok" as const, index, target, result })),
                  Effect.catchCause((cause) =>
                    Effect.succeed({ kind: "err" as const, index, target, cause }),
                  ),
                )
            }),
            { concurrency: "unbounded" },
          )

          const sections = outcomes.map((o) => {
            const rel = path.relative(Instance.worktree, o.target.filePath)
            if (o.kind === "ok") {
              return [`## ${rel}`, "", o.result.output].join("\n")
            }
            const reason = o.cause.toString().replaceAll("\n", " ").slice(0, 400)
            return [`## ${rel}`, "", `reviewer failed: ${reason}`].join("\n")
          })

          const successes = outcomes.filter((o) => o.kind === "ok").length
          const output = [
            `# Parallel review — ${successes}/${outcomes.length} reviewers completed`,
            "",
            ...sections,
          ].join("\n\n")

          return {
            title: `${successes}/${outcomes.length} files`,
            metadata: {
              completed: successes,
              failed: outcomes.length - successes,
              results: outcomes.map((o) => ({
                filePath: o.target.filePath,
                ok: o.kind === "ok",
              })),
            },
            output,
          }
        }),
    }
  }),
)
