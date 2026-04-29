import { describe, expect, test } from 'bun:test'
import { getPersonalityLayer } from './personalityLayer.js'

describe('personality layer', () => {
  test('returns a compact default layer', () => {
    delete process.env.NEURON_PERSONALITY_LAYER
    const layer = getPersonalityLayer()
    expect(layer).toBeTruthy()
    expect(layer!.length).toBeLessThanOrEqual(360)
    expect(layer).toContain('warm')
  })

  test('can be disabled', () => {
    process.env.NEURON_PERSONALITY_LAYER = '0'
    expect(getPersonalityLayer()).toBeNull()
    delete process.env.NEURON_PERSONALITY_LAYER
  })
})

