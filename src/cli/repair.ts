import chalk from 'chalk'
import { installGlobalPackage } from 'src/utils/autoUpdater.js'
import { regenerateCompletionCache } from 'src/utils/completionCache.js'
import {
  formatCliCommand,
  getCliBinaryName,
  getCliDisplayName,
} from 'src/utils/cliIdentity.js'
import { getDoctorDiagnostic } from 'src/utils/doctorDiagnostic.js'
import { gracefulShutdown } from 'src/utils/gracefulShutdown.js'
import {
  installOrUpdateClaudePackage,
  localInstallationExists,
} from 'src/utils/localInstaller.js'
import {
  checkInstall,
  cleanupNpmInstallations,
  cleanupShellAliases,
  installLatest as installLatestNative,
  removeInstalledSymlink,
} from 'src/utils/nativeInstaller/index.js'
import { getPackageManager } from 'src/utils/nativeInstaller/packageManagers.js'
import { writeToStdout } from 'src/utils/process.js'
import { getInitialSettings } from 'src/utils/settings/settings.js'

type RepairOptions = {
  force?: boolean
}

function printFollowUpNotes(notes: string[]): void {
  if (notes.length === 0) {
    return
  }

  writeToStdout('\nNotes:\n')
  for (const note of notes) {
    writeToStdout(`- ${note}\n`)
  }
}

export async function repair(
  target: string | undefined,
  options: RepairOptions = {},
) {
  const cliName = getCliDisplayName()
  const cliBinary = getCliBinaryName()
  const channel = getInitialSettings()?.autoUpdatesChannel ?? 'latest'
  const requestedTarget = target || channel
  const diagnostic = await getDoctorDiagnostic()

  writeToStdout(`Repairing ${cliName}...\n`)
  writeToStdout(`Target: ${requestedTarget}\n`)

  if (diagnostic.warnings.length > 0) {
    writeToStdout('\nDetected issues:\n')
    for (const warning of diagnostic.warnings) {
      writeToStdout(`- ${warning.issue}\n`)
    }
  }

  if (diagnostic.installationType === 'development') {
    writeToStdout(
      chalk.yellow(
        `\nDevelopment build detected. ${cliName} repair does not modify a source checkout.\n`,
      ),
    )
    writeToStdout('Rebuild it with:\n')
    writeToStdout(chalk.bold('  git pull && bun install && bun run build\n'))
    await gracefulShutdown(0)
  }

  if (diagnostic.installationType === 'package-manager') {
    const packageManager = await getPackageManager()
    writeToStdout(
      chalk.yellow(
        `\n${cliName} is managed by ${packageManager ?? 'a package manager'}.\n`,
      ),
    )
    writeToStdout(
      `Reinstall it with your package manager, then run ${formatCliCommand('doctor')}.\n`,
    )
    await gracefulShutdown(0)
  }

  if (diagnostic.installationType === 'native') {
    const result = await installLatestNative(requestedTarget, options.force ?? true)

    if (result.lockFailed) {
      const pidInfo = result.lockHolderPid
        ? ` (PID ${result.lockHolderPid})`
        : ''
      process.stderr.write(
        `Another ${cliName} process${pidInfo} is currently installing or updating. Please try again in a moment.\n`,
      )
      await gracefulShutdown(1)
    }

    if (!result.latestVersion) {
      process.stderr.write(`Failed to repair the native ${cliBinary} installation.\n`)
      process.stderr.write(`Run ${formatCliCommand('doctor')} for diagnostics.\n`)
      await gracefulShutdown(1)
    }

    const setupMessages = await checkInstall(true)
    const cleanupResult = await cleanupNpmInstallations()
    const aliasMessages = await cleanupShellAliases()
    await regenerateCompletionCache()

    writeToStdout(
      chalk.green(`Native ${cliName} repair completed (${result.latestVersion}).\n`),
    )
    writeToStdout(`Verify with ${formatCliCommand('--help')}.\n`)
    printFollowUpNotes([
      ...setupMessages.map(message => message.message),
      ...cleanupResult.warnings,
      ...aliasMessages.map(message => message.message),
    ])
    await gracefulShutdown(0)
  }

  const useLocalRepair =
    diagnostic.installationType === 'npm-local' ||
    (diagnostic.installationType === 'unknown' &&
      (await localInstallationExists()))

  if (!useLocalRepair) {
    await removeInstalledSymlink()
  }

  const status = useLocalRepair
    ? await installOrUpdateClaudePackage(channel, requestedTarget)
    : await installGlobalPackage(requestedTarget)

  switch (status) {
    case 'success':
      await regenerateCompletionCache()
      writeToStdout(chalk.green(`${cliName} repair completed.\n`))
      writeToStdout(`Verify with ${formatCliCommand('--help')}.\n`)
      await gracefulShutdown(0)
      break
    case 'no_permissions':
      process.stderr.write(
        `Error: insufficient permissions to repair the ${cliBinary} installation.\n`,
      )
      process.stderr.write(
        `Try: npm install -g ${MACRO.PACKAGE_URL}@${requestedTarget}\n`,
      )
      process.stderr.write(
        `If npm permissions stay broken, use ${formatCliCommand('install')} for the native installer.\n`,
      )
      await gracefulShutdown(1)
      break
    case 'install_failed':
      process.stderr.write(`Error: failed to repair ${cliName}.\n`)
      if (useLocalRepair) {
        process.stderr.write(
          `Try: cd ~/.neuron/local && npm install ${MACRO.PACKAGE_URL}@${requestedTarget}\n`,
        )
      } else {
        process.stderr.write(
          `Try: npm install -g ${MACRO.PACKAGE_URL}@${requestedTarget}\n`,
        )
      }
      process.stderr.write(`Then run ${formatCliCommand('doctor')}.\n`)
      await gracefulShutdown(1)
      break
    case 'in_progress':
      process.stderr.write(
        `Another ${cliName} process is already repairing or updating this installation.\n`,
      )
      await gracefulShutdown(1)
      break
  }
}
