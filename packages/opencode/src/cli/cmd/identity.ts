import { cmd } from "./cmd"
import { UI } from "../ui"
import { BRAND_NAME, CLI_DISPLAY_NAME, displayProviderName } from "@/brand"
import { InstallationVersion } from "../../installation/version"
import { Auth } from "@/auth"
import { AppRuntime } from "@/effect/app-runtime"
import { Effect } from "effect"
import { ModelsDev } from "../../provider"
import { EOL } from "os"

export const IdentityCommand = cmd({
  command: "identity",
  describe: `show current ${BRAND_NAME} identity, version, and connected providers`,
  builder: (yargs) =>
    yargs.option("json", {
      describe: "output as JSON",
      type: "boolean",
      default: false,
    }),
  async handler(args) {
    const credentials = await AppRuntime.runPromise(
      Effect.gen(function* () {
        const auth = yield* Auth.Service
        return Object.entries(yield* auth.all())
      }),
    )
    const database = await ModelsDev.get().catch(
      () => ({}) as Awaited<ReturnType<typeof ModelsDev.get>>,
    )

    const providers = credentials.map(([id, cred]) => ({
      id,
      name: displayProviderName(id, database[id]?.name ?? id),
      type: cred.type,
    }))

    const envProviders: { provider: string; envVar: string }[] = []
    for (const [providerID, provider] of Object.entries(database)) {
      const envVars = (provider as { env?: string[] }).env ?? []
      const name = (provider as { name?: string }).name ?? providerID
      for (const envVar of envVars) {
        if (process.env[envVar]) {
          envProviders.push({ provider: displayProviderName(providerID, name), envVar })
        }
      }
    }

    const identity = {
      product: BRAND_NAME,
      cli: CLI_DISPLAY_NAME,
      version: InstallationVersion,
      directory: process.cwd(),
      providers,
      env_providers: envProviders,
    }

    if (args.json) {
      process.stdout.write(JSON.stringify(identity, null, 2) + EOL)
      return
    }

    UI.empty()
    UI.println(UI.logo("  "))
    UI.empty()
    UI.println(UI.Style.TEXT_INFO_BOLD + "  Product:     ", UI.Style.TEXT_NORMAL, identity.product)
    UI.println(UI.Style.TEXT_INFO_BOLD + "  CLI:         ", UI.Style.TEXT_NORMAL, identity.cli)
    UI.println(UI.Style.TEXT_INFO_BOLD + "  Version:     ", UI.Style.TEXT_NORMAL, identity.version)
    UI.println(UI.Style.TEXT_INFO_BOLD + "  Directory:   ", UI.Style.TEXT_NORMAL, identity.directory)
    UI.empty()

    if (providers.length === 0) {
      UI.println(UI.Style.TEXT_DIM + "  No connected providers. Run `neuron providers login` to connect one.")
    } else {
      UI.println(UI.Style.TEXT_INFO_BOLD + "  Providers:")
      for (const p of providers) {
        UI.println(`    - ${p.name} ${UI.Style.TEXT_DIM}(${p.id}, ${p.type})`)
      }
    }

    if (envProviders.length > 0) {
      UI.empty()
      UI.println(UI.Style.TEXT_INFO_BOLD + "  Environment credentials:")
      for (const ep of envProviders) {
        UI.println(`    - ${ep.provider} ${UI.Style.TEXT_DIM}via ${ep.envVar}`)
      }
    }

    UI.empty()
  },
})
