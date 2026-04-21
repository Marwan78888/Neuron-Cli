import z from "zod"
import path from "path"
import { Effect } from "effect"
import * as Tool from "./tool"
import { EditTool } from "./edit"
import { Instance } from "../project/instance"
import DESCRIPTION from "./parallel_edit.txt"

const EditEntry = z.object({
  filePath: z.string().describe("The absolute path to the file to modify"),
  oldString: z.string().describe("The text to replace"),
  newString: z.string().describe("The text to replace it with (must be different from oldString)"),
  replaceAll: z.boolean().optional().describe("Replace all occurrences of oldString (default false)"),
})

const Parameters = z.object({
  edits: z.array(EditEntry).min(2).describe("Two or more edits to apply across files concurrently"),
})

export const ParallelEditTool = Tool.define(
  "parallel_edit",
  Effect.gen(function* () {
    const editInfo = yield* EditTool
    const edit = yield* editInfo.init()

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: z.infer<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const outcomes = yield* Effect.all(
            params.edits.map((entry, index) =>
              edit
                .execute(
                  {
                    filePath: entry.filePath,
                    oldString: entry.oldString,
                    newString: entry.newString,
                    replaceAll: entry.replaceAll,
                  },
                  ctx,
                )
                .pipe(
                  Effect.map((result) => ({ kind: "ok" as const, index, entry, result })),
                  Effect.catchCause((cause) =>
                    Effect.succeed({ kind: "err" as const, index, entry, cause }),
                  ),
                ),
            ),
            { concurrency: "unbounded" },
          )

          const failures = outcomes.flatMap((o) => (o.kind === "err" ? [o] : []))
          const successes = outcomes.flatMap((o) => (o.kind === "ok" ? [o] : []))

          const lines = outcomes.map((o) => {
            const rel = path.relative(Instance.worktree, o.entry.filePath)
            if (o.kind === "ok") return `ok   ${rel}`
            const reason = o.cause.toString().replaceAll("\n", " ").slice(0, 200)
            return `fail ${rel} — ${reason}`
          })

          const summary = [
            `applied ${successes.length}/${outcomes.length} edits`,
            ...lines,
          ].join("\n")

          if (failures.length > 0 && successes.length === 0) {
            throw new Error(
              `parallel_edit: all ${outcomes.length} edits failed.\n${lines.join("\n")}`,
            )
          }

          return {
            title: `${successes.length}/${outcomes.length} files`,
            metadata: {
              applied: successes.length,
              failed: failures.length,
              results: outcomes.map((o) => ({
                filePath: o.entry.filePath,
                ok: o.kind === "ok",
                ...(o.kind === "ok" ? o.result.metadata : {}),
              })),
            },
            output: summary,
          }
        }),
    }
  }),
)
