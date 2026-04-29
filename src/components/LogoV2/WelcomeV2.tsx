import * as React from 'react'
import { Box, Text } from 'src/ink.js'
import { NeuronBanner } from './NeuronBanner.js'

const WELCOME_V2_WIDTH = 58

export function WelcomeV2(): React.ReactNode {
  return (
    <Box
      width={WELCOME_V2_WIDTH}
      flexDirection="column"
      alignItems="center"
      gap={1}
    >
      <NeuronBanner
        width="100%"
        subtitle={`v${MACRO.DISPLAY_VERSION ?? MACRO.VERSION}`}
      />
      <Text bold color="white">
        Welcome to Neuron
      </Text>
      <Text color="chromeYellow">Let&apos;s tune the cockpit.</Text>
      <Text dimColor>Fast setup, calmer defaults, sharper sessions.</Text>
    </Box>
  )
}
