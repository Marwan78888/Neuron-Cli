import { getCwd } from './utils/cwd.js'
import { isDirEmpty } from './utils/file.js'
import { getFsImplementation } from './utils/fsOperations.js'
import { findProjectInstructionFilePathInAncestors } from './utils/projectInstructions.js'

export type Step = {
  key: string
  text: string
  isComplete: boolean
  isCompletable: boolean
  isEnabled: boolean
}

export function getSteps(): Step[] {
  const hasRepoInstructions =
    findProjectInstructionFilePathInAncestors(
      getCwd(),
      getFsImplementation().existsSync,
    ) !== null
  const isWorkspaceDirEmpty = isDirEmpty(getCwd())

  return [
    {
      key: 'workspace',
      text: 'Ask Neuron to create a new app, explore this workspace, or clone a repository',
      isComplete: false,
      isCompletable: true,
      isEnabled: isWorkspaceDirEmpty,
    },
    {
      key: 'claudemd',
      text: 'Set up repo instructions with /init (AGENTS.md or NEURON.md; legacy instruction files also count)',
      isComplete: hasRepoInstructions,
      isCompletable: true,
      isEnabled: !isWorkspaceDirEmpty,
    },
  ]
}

export function isProjectOnboardingComplete(): boolean {
  return getSteps()
    .filter(({ isCompletable, isEnabled }) => isCompletable && isEnabled)
    .every(({ isComplete }) => isComplete)
}
