import * as React from 'react'
import { Box, Text } from '../../ink.js'

type NeuronBannerProps = {
  subtitle?: string
  width?: number | string
}

export function NeuronBanner({
  subtitle = 'interactive coding agent',
  width = '100%',
}: NeuronBannerProps): React.ReactNode {
  return (
    <Box
      borderStyle="round"
      borderColor="claude"
      paddingX={2}
      paddingY={0}
      width={width}
      justifyContent="center"
      alignItems="center"
    >
      <Box flexDirection="column" alignItems="center">
        <Text bold color="chromeYellow">
          NEURON
        </Text>
        {subtitle ? (
          <Text dimColor color="inactive">
            {subtitle}
          </Text>
        ) : null}
      </Box>
    </Box>
  )
}
