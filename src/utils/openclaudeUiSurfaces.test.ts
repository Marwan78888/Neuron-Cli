import { describe, expect, test } from 'bun:test'
import { join } from 'path'

import { optionForPermissionSaveDestination } from '../components/permissions/rules/AddPermissionRules.tsx'
import { isClaudeSettingsPath } from './permissions/filesystem.ts'
import { getValidationTip } from './settings/validationTips.ts'

describe('Neuron settings path surfaces', () => {
  test('isClaudeSettingsPath recognizes project .neuron settings files', () => {
    expect(
      isClaudeSettingsPath(
        join(process.cwd(), '.neuron', 'settings.json'),
      ),
    ).toBe(true)

    expect(
      isClaudeSettingsPath(
        join(process.cwd(), '.neuron', 'settings.local.json'),
      ),
    ).toBe(true)
  })

  test('permission save destinations point user settings to ~/.neuron', () => {
    expect(optionForPermissionSaveDestination('userSettings')).toEqual({
      label: 'User settings',
      description: 'Saved in ~/.neuron/settings.json',
      value: 'userSettings',
    })
  })

  test('permission save destinations point project settings to .neuron', () => {
    expect(optionForPermissionSaveDestination('projectSettings')).toEqual({
      label: 'Project settings',
      description: 'Checked in at .neuron/settings.json',
      value: 'projectSettings',
    })

    expect(optionForPermissionSaveDestination('localSettings')).toEqual({
      label: 'Project settings (local)',
      description: 'Saved in .neuron/settings.local.json',
      value: 'localSettings',
    })
  })
})

describe('Neuron validation tips', () => {
  test('permissions.defaultMode invalid value keeps suggestion but no Claude docs link', () => {
    const tip = getValidationTip({
      path: 'permissions.defaultMode',
      code: 'invalid_value',
      enumValues: [
        'acceptEdits',
        'bypassPermissions',
        'default',
        'dontAsk',
        'plan',
      ],
    })

    expect(tip).toEqual({
      suggestion:
        'Valid modes: "acceptEdits" (ask before file changes), "plan" (analysis only), "bypassPermissions" (auto-accept all), or "default" (standard behavior)',
    })
  })
})
