#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import os from "node:os"
import { fileURLToPath } from "node:url"

const args = process.argv.slice(2)
const command = args[0] ?? "help"
const extraArgs = args.slice(1)

function configPath() {
  return path.join(os.homedir(), ".config", "neuron", "launcher.env")
}

function loadConfig() {
  const file = configPath()
  if (!existsSync(file)) return {}
  const text = readFileSync(file, "utf8")
  const result = {}

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    value = value.replace(/^['"]|['"]$/g, "")
    result[key] = value
  }

  return result
}

function resolveProjectPath() {
  const config = loadConfig()
  const localInstalledRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "repo")
  return (
    process.env.NEURON_PROJECT_PATH ||
    config.NEURON_PROJECT_PATH ||
    localInstalledRepo
  )
}

function printHelp() {
  console.log(`Neuron CLI

Usage:
  neuron start [args...]
  neuron repo-path
  neuron help

Environment:
  NEURON_PROJECT_PATH   Override the local Neuron repo path
`)
}

function runNeuronStart(forwarded) {
  if (forwarded.includes("--help") || forwarded.includes("-h")) {
    console.log(`neuron start

Starts the local Neuron CLI using the configured project path.

Usage:
  neuron start
  neuron start --print-logs

Project path:
  ${resolveProjectPath()}
`)
    process.exit(0)
  }

  const projectPath = resolveProjectPath()
  const entry = path.join(projectPath, "packages", "opencode", "src", "index.ts")
  const launchPath = process.cwd()
  const hasExplicitProject = forwarded.some((arg) => !arg.startsWith("-"))
  const runtimeArgs = hasExplicitProject ? forwarded : [...forwarded, launchPath]

  if (!existsSync(projectPath)) {
    console.error(`Neuron project not found: ${projectPath}`)
    console.error("Update ~/.config/neuron/launcher.env or set NEURON_PROJECT_PATH.")
    process.exit(1)
  }

  if (!existsSync(entry)) {
    console.error(`Neuron entrypoint not found: ${entry}`)
    process.exit(1)
  }

  const result = spawnSync(
    "bun",
    [
      "run",
      "--cwd",
      path.join(projectPath, "packages", "opencode"),
      "--conditions=browser",
      "./src/index.ts",
      "--",
      ...runtimeArgs,
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NEURON_PROJECT_PATH: projectPath,
        NEURON_LAUNCH_CWD: launchPath,
      },
    },
  )

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  process.exit(result.status ?? 0)
}

switch (command) {
  case "start":
    runNeuronStart(extraArgs)
    break
  case "repo-path":
    console.log(resolveProjectPath())
    break
  case "help":
  case "--help":
  case "-h":
    printHelp()
    break
  default:
    console.error(`Unknown command: ${command}`)
    console.error("")
    printHelp()
    process.exit(1)
}
