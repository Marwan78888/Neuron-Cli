import fs from "fs/promises"
import os from "os"
import path from "path"
import type { Argv } from "yargs"
import { EOL } from "os"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { AppRuntime } from "@/effect/app-runtime"
import { Skill } from "../../skill"
import { Global } from "../../global"
import { Filesystem } from "../../util"
import * as Archive from "../../util/archive"
import * as ConfigMarkdown from "../../config/markdown"

type SkillScope = "global" | "project"
type SkillEcosystem = "agents" | "claude" | "openclaw"

function destinationRoot(scope: SkillScope, ecosystem: SkillEcosystem, cwd: string) {
  if (scope === "project") {
    if (ecosystem === "claude") return path.join(cwd, ".claude", "skills")
    if (ecosystem === "openclaw") return path.join(cwd, "skills")
    return path.join(cwd, ".agents", "skills")
  }

  if (ecosystem === "claude") return path.join(Global.Path.home, ".claude", "skills")
  if (ecosystem === "openclaw") return path.join(Global.Path.home, ".openclaw", "skills")
  return path.join(Global.Path.home, ".agents", "skills")
}

async function fetchSource(input: string) {
  if (!/^https?:\/\//.test(input)) return path.resolve(input)
  const res = await fetch(input)
  if (!res.ok) throw new Error(`Failed to download skill: ${res.status} ${res.statusText}`)
  const filename = new URL(input).pathname.split("/").filter(Boolean).pop() || "skill.download"
  const tmp = path.join(os.tmpdir(), `neuron-skill-${Date.now()}-${filename}`)
  if (res.body) await Filesystem.writeStream(tmp, res.body)
  else await Filesystem.write(tmp, Buffer.from(await res.arrayBuffer()))
  return tmp
}

async function resolveSkillDir(input: string) {
  const target = await fetchSource(input)
  const stats = await Filesystem.statAsync(target)
  if (!stats) throw new Error(`Skill source not found: ${input}`)

  if (stats.isDirectory()) {
    const direct = path.join(target, "SKILL.md")
    if (await Filesystem.exists(direct)) return target

    const matches = await Filesystem.glob("**/SKILL.md", { cwd: target, absolute: true, dot: true })
    if (matches.length === 1) return path.dirname(matches[0])
    if (matches.length > 1) {
      throw new Error(`Multiple skills found in ${input}. Point to one skill directory or SKILL.md file.`)
    }
    throw new Error(`No SKILL.md found in ${input}`)
  }

  if (path.basename(target).toUpperCase() === "SKILL.MD") return path.dirname(target)

  const lower = target.toLowerCase()
  if (lower.endsWith(".skill") || lower.endsWith(".zip")) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "neuron-skill-unpack-"))
    await Archive.extractZip(target, tempDir)
    const matches = await Filesystem.glob("**/SKILL.md", { cwd: tempDir, absolute: true, dot: true })
    if (matches.length === 0) throw new Error(`No SKILL.md found in package: ${input}`)
    if (matches.length > 1) {
      const topLevel = matches.find((item) => path.basename(path.dirname(item)) !== "__MACOSX") ?? matches[0]
      return path.dirname(topLevel)
    }
    return path.dirname(matches[0])
  }

  throw new Error(`Unsupported skill source: ${input}`)
}

async function detectSkillName(skillDir: string) {
  const mdPath = path.join(skillDir, "SKILL.md")
  const md = await ConfigMarkdown.parse(mdPath)
  const raw = typeof md.data === "object" && md.data ? md.data : {}
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : path.basename(skillDir)
  return { name, mdPath }
}

const SkillListCommand = cmd({
  command: "list",
  describe: "list all available skills",
  async handler() {
    await bootstrap(process.cwd(), async () => {
      const skills = await AppRuntime.runPromise(
        Skill.Service.use((svc) => svc.all()),
      )
      process.stdout.write(JSON.stringify(skills, null, 2) + EOL)
    })
  },
})

const SkillImportCommand = cmd({
  command: "import <source>",
  describe: "import a Claude Code or OpenClaw skill from a folder, SKILL.md, .skill, .zip, or URL",
  builder: (yargs: Argv) =>
    yargs
      .positional("source", {
        describe: "path or URL to a skill directory, SKILL.md file, .skill package, or zip archive",
        type: "string",
        demandOption: true,
      })
      .option("scope", {
        type: "string",
        choices: ["global", "project"] as const,
        default: "global" as const,
        describe: "where to install the imported skill",
      })
      .option("ecosystem", {
        type: "string",
        choices: ["agents", "claude", "openclaw"] as const,
        default: "agents" as const,
        describe: "which skill directory layout to install into",
      })
      .option("name", {
        type: "string",
        describe: "override the imported skill folder name",
      })
      .option("force", {
        type: "boolean",
        default: false,
        describe: "overwrite an existing skill with the same name",
      }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const cwd = process.cwd()
      const skillDir = await resolveSkillDir(args.source)
      const detected = await detectSkillName(skillDir)
      const name = (args.name || detected.name).trim()
      const root = destinationRoot(args.scope as SkillScope, args.ecosystem as SkillEcosystem, cwd)
      const dest = path.join(root, name)

      await fs.mkdir(root, { recursive: true })

      if (await Filesystem.exists(dest)) {
        if (!args.force) throw new Error(`Skill already exists: ${dest}. Re-run with --force to overwrite.`)
        await fs.rm(dest, { recursive: true, force: true })
      }

      await fs.cp(skillDir, dest, { recursive: true, force: true })

      process.stdout.write(`Imported skill ${name} to ${dest}` + EOL)
      process.stdout.write(`Restart Neuron if the skill directory is new in this session.` + EOL)
    })
  },
})

export const SkillCommand = cmd({
  command: "skill",
  describe: "list or import skills",
  builder: (yargs) => yargs.command(SkillListCommand).command(SkillImportCommand).demandCommand(0),
  async handler() {
    await SkillListCommand.handler()
  },
})
