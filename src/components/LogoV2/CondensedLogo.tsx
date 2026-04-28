import * as React from 'react'
import { useEffect } from 'react'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { stringWidth } from '../../ink/stringWidth.js'
import { Box, Text } from '../../ink.js'
import { useAppState } from '../../state/AppState.js'
import { getEffortSuffix } from '../../utils/effort.js'
import { truncate } from '../../utils/format.js'
import {
  formatModelAndBilling,
  getLogoDisplayData,
  truncatePath,
} from '../../utils/logoV2Utils.js'
import { renderModelSetting } from '../../utils/model/model.js'
import { OffscreenFreeze } from '../OffscreenFreeze.js'
import {
  GuestPassesUpsell,
  incrementGuestPassesSeenCount,
  useShowGuestPassesUpsell,
} from './GuestPassesUpsell.js'
import {
  incrementOverageCreditUpsellSeenCount,
  OverageCreditUpsell,
  useShowOverageCreditUpsell,
} from './OverageCreditUpsell.js'
import { NeuronBanner } from './NeuronBanner.js'

export function CondensedLogo(): React.ReactNode {
  const { columns } = useTerminalSize()
  const agent = useAppState(_temp)
  const effortValue = useAppState(_temp2)
  const model = useMainLoopModel()
  const modelDisplayName = renderModelSetting(model)
  const {
    version,
    cwd,
    billingType,
    agentName: agentNameFromSettings,
  } = getLogoDisplayData()
  const agentName = agent ?? agentNameFromSettings
  const showGuestPassesUpsell = useShowGuestPassesUpsell()
  const showOverageCreditUpsell = useShowOverageCreditUpsell()

  useEffect(() => {
    if (showGuestPassesUpsell) {
      incrementGuestPassesSeenCount()
    }
  }, [showGuestPassesUpsell])

  useEffect(() => {
    if (showOverageCreditUpsell && !showGuestPassesUpsell) {
      incrementOverageCreditUpsellSeenCount()
    }
  }, [showOverageCreditUpsell, showGuestPassesUpsell])

  const textWidth = Math.max(columns - 10, 24)
  const truncatedVersion = truncate(version, Math.max(textWidth - 13, 6))
  const effortSuffix = getEffortSuffix(model, effortValue)
  const { shouldSplit, truncatedModel, truncatedBilling } =
    formatModelAndBilling(
      modelDisplayName + effortSuffix,
      billingType,
      textWidth,
    )
  const cwdAvailableWidth = agentName
    ? textWidth - 1 - stringWidth(agentName) - 3
    : textWidth
  const truncatedCwd = truncatePath(cwd, Math.max(cwdAvailableWidth, 10))
  const pathLine = agentName ? `@${agentName} · ${truncatedCwd}` : truncatedCwd

  return (
    <OffscreenFreeze>
      <Box
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        gap={1}
      >
        <NeuronBanner subtitle={`v${truncatedVersion}`} />
        <Text bold color="white">
          Welcome to Neuron
        </Text>
        <Text color="chromeYellow">Let&apos;s get started.</Text>
        {shouldSplit ? (
          <Box flexDirection="column">
            <Text>
              <Text color="inactive">Model</Text>
              <Text dimColor>{`  ${truncatedModel}`}</Text>
            </Text>
            <Text>
              <Text color="inactive">Mode</Text>
              <Text dimColor>{`   ${truncatedBilling}`}</Text>
            </Text>
          </Box>
        ) : (
          <Text>
            <Text color="inactive">Model</Text>
            <Text dimColor>{`  ${truncatedModel} · ${truncatedBilling}`}</Text>
          </Text>
        )}
        <Text>
          <Text color="inactive">Path</Text>
          <Text dimColor>{`   ${pathLine}`}</Text>
        </Text>
        {showGuestPassesUpsell ? <GuestPassesUpsell /> : null}
        {!showGuestPassesUpsell && showOverageCreditUpsell ? (
          <OverageCreditUpsell maxWidth={textWidth} twoLine={true} />
        ) : null}
      </Box>
    </OffscreenFreeze>
  )
}

function _temp2(s_0: { effortValue: string }) {
  return s_0.effortValue
}

function _temp(s: { agent: string | null | undefined }) {
  return s.agent
}
