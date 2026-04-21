import { Effect } from "effect"
import type { Session } from "../session"
import type { SessionStatus } from "../session/status"
import { SessionID } from "../session/schema"

export const MAX_DEPTH = 2
export const MAX_DIRECT_CHILDREN = 5
export const MAX_TREE_TOTAL = 20

export class LimitError extends Error {
  readonly _tag = "TaskLimitExceeded"
  constructor(
    readonly kind: "depth" | "direct" | "total",
    message: string,
  ) {
    super(message)
  }
}

export const check = Effect.fn("TaskLimits.check")(function* (
  sessions: Session.Interface,
  status: SessionStatus.Interface,
  parentID: SessionID,
) {
  const depth = yield* walkDepth(sessions, parentID)
  if (depth + 1 > MAX_DEPTH) {
    return new LimitError(
      "depth",
      `Sub-agent depth cap reached (max ${MAX_DEPTH}). Delegating any deeper would stall the run; do the work in the current agent instead.`,
    )
  }

  const runningDirect = yield* countRunningChildren(sessions, status, parentID)
  if (runningDirect + 1 > MAX_DIRECT_CHILDREN) {
    return new LimitError(
      "direct",
      `Concurrent sub-agent cap reached (max ${MAX_DIRECT_CHILDREN} running direct children per session). Wait for an existing sub-agent to finish or merge two tasks into one.`,
    )
  }

  const rootID = yield* walkRoot(sessions, parentID)
  const tree = yield* countTree(sessions, rootID)
  const subAgents = Math.max(0, tree - 1)
  if (subAgents + 1 > MAX_TREE_TOTAL) {
    return new LimitError(
      "total",
      `Total sub-agent cap reached for this session tree (max ${MAX_TREE_TOTAL}). Finish some tasks before spawning more.`,
    )
  }

  return undefined
})

const walkDepth = Effect.fn("TaskLimits.walkDepth")(function* (sessions: Session.Interface, startID: SessionID) {
  let depth = 0
  let cursor: SessionID | undefined = startID
  while (cursor) {
    const info = yield* sessions.get(cursor).pipe(Effect.catchCause(() => Effect.succeed(undefined)))
    if (!info) return depth
    if (!info.parentID) return depth
    depth++
    if (depth > MAX_DEPTH + 2) return depth
    cursor = SessionID.make(info.parentID)
  }
  return depth
})

const walkRoot = Effect.fn("TaskLimits.walkRoot")(function* (sessions: Session.Interface, startID: SessionID) {
  let cursor: SessionID = startID
  for (let i = 0; i < 32; i++) {
    const info = yield* sessions.get(cursor).pipe(Effect.catchCause(() => Effect.succeed(undefined)))
    if (!info?.parentID) return cursor
    cursor = SessionID.make(info.parentID)
  }
  return cursor
})

const countRunningChildren = Effect.fn("TaskLimits.countRunningChildren")(function* (
  sessions: Session.Interface,
  status: SessionStatus.Interface,
  parentID: SessionID,
) {
  const kids = yield* sessions
    .children(parentID)
    .pipe(Effect.catchCause(() => Effect.succeed<Array<{ id: string }>>([])))
  const statuses = yield* status.list()
  return kids.filter((kid) => {
    const s = statuses.get(SessionID.make(kid.id))
    return s !== undefined && s.type !== "idle"
  }).length
})

const countTree = Effect.fn("TaskLimits.countTree")(function* (sessions: Session.Interface, rootID: SessionID) {
  let total = 0
  const queue: SessionID[] = [rootID]
  while (queue.length > 0) {
    const current = queue.shift()!
    total++
    if (total > MAX_TREE_TOTAL + 5) return total
    const kids = yield* sessions
      .children(current)
      .pipe(Effect.catchCause(() => Effect.succeed<Array<{ id: string }>>([])))
    for (const kid of kids) queue.push(SessionID.make(kid.id))
  }
  return total
})

export * as TaskLimits from "./task-limits"
