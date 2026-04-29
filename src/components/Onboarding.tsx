import { c as _c } from "react-compiler-runtime";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, logEvent } from 'src/services/analytics/index.js';
import { setupTerminal, shouldOfferTerminalSetup } from '../commands/terminalSetup/terminalSetup.js';
import { useExitOnCtrlCDWithKeybindings } from '../hooks/useExitOnCtrlCDWithKeybindings.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { Box, Link, Newline, Text, useTheme } from '../ink.js';
import { useKeybindings } from '../keybindings/useKeybinding.js';
import { isAnthropicAuthEnabled } from '../utils/auth.js';
import { normalizeApiKeyForConfig } from '../utils/authPortable.js';
import { getCustomApiKeyStatus, getGlobalConfig } from '../utils/config.js';
import { env } from '../utils/env.js';
import { isRunningOnHomespace } from '../utils/envUtils.js';
import { PreflightStep } from '../utils/preflightChecks.js';
import type { ThemeSetting } from '../utils/theme.js';
import { getInitialSettings, updateSettingsForSource } from '../utils/settings/settings.js';
import { ApproveApiKey } from './ApproveApiKey.js';
import { ConsoleOAuthFlow } from './ConsoleOAuthFlow.js';
import { Select } from './CustomSelect/select.js';
import { WelcomeV2 } from './LogoV2/WelcomeV2.js';
import { PressEnterToContinue } from './PressEnterToContinue.js';
import { ThemePicker } from './ThemePicker.js';
import { SpinnerPicker } from './SpinnerPicker.js';
import TextInput from './TextInput.js';
import { OrderedList } from './ui/OrderedList.js';
type StepId = 'preflight' | 'theme' | 'spinner' | 'user-name' | 'assistant-name' | 'oauth' | 'api-key' | 'security' | 'terminal-setup';
interface OnboardingStep {
  id: StepId;
  component: React.ReactNode;
}
type Props = {
  onDone(): void;
};
type ProfileNameStepProps = {
  title: string;
  description: string;
  helpText: string;
  placeholder: string;
  initialValue: string;
  required?: boolean;
  onSubmit(value: string | undefined): void;
};
const MAX_PROFILE_NAME_LENGTH = 40;
export function Onboarding({
  onDone
}: Props): React.ReactNode {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [skipOAuth, setSkipOAuth] = useState(false);
  const [oauthEnabled] = useState(() => isAnthropicAuthEnabled());
  const [theme, setTheme] = useTheme();
  const initialSettings = useMemo(() => getInitialSettings(), []);
  const initialUserName = useMemo(() => initialSettings.userName ?? getGlobalConfig().oauthAccount?.displayName ?? '', [initialSettings]);
  const initialAssistantName = useMemo(() => initialSettings.assistantName ?? 'Neuron', [initialSettings]);
  useEffect(() => {
    logEvent('tengu_began_setup', {
      oauthEnabled
    });
  }, [oauthEnabled]);
  function goToNextStep() {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      logEvent('tengu_onboarding_step', {
        oauthEnabled,
        stepId: steps[nextIndex]?.id as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    } else {
      onDone();
    }
  }
  function handleThemeSelection(newTheme: ThemeSetting) {
    setTheme(newTheme);
    goToNextStep();
  }
  const exitState = useExitOnCtrlCDWithKeybindings();

  // Define all onboarding steps
  const themeStep = <Box marginX={1}>
    <ThemePicker onThemeSelect={handleThemeSelection} showIntroText={true} helpText="To change this later, run /theme" hideEscToCancel={true} skipExitHandling={true} // Skip exit handling as Onboarding already handles it
    />
  </Box>;
  const spinnerStep = <Box marginX={1}>
    <SpinnerPicker onSelect={type => {
      updateSettingsForSource('localSettings', {
        spinnerType: type
      });
      goToNextStep();
    }} />
  </Box>;
  const userNameStep = <ProfileNameStep title="What should Neuron call you?" description="A small personal touch for greetings, status notes, and smoother handoffs across sessions." helpText="Press Enter to continue. You can change this later in user settings." placeholder="e.g. Marwan" initialValue={initialUserName} required={true} onSubmit={value => {
    updateSettingsForSource('userSettings', {
      userName: value
    });
    goToNextStep();
  }} />;
  const assistantNameStep = <ProfileNameStep title="What should your AI agent be called?" description="Choose the name that should appear in welcome moments and conversational introductions." helpText="Press Enter to continue." placeholder="e.g. Neuron, Nova, Atlas" initialValue={initialAssistantName} required={true} onSubmit={value => {
    updateSettingsForSource('userSettings', {
      assistantName: value
    });
    goToNextStep();
  }} />;
  const securityStep = <Box flexDirection="column" gap={1} paddingLeft={1}>
    <Text bold>Before you start:</Text>
    <Box flexDirection="column" width={70}>
      {/**
         * OrderedList misnumbers items when rendering conditionally,
         * so put all items in the if/else
         */}
      <OrderedList>
        <OrderedList.Item>
          <Text>Keep review in the loop</Text>
          <Text dimColor wrap="wrap">
            Neuron can move quickly, but you should review its responses,
            <Newline />
            especially before running generated code.
            <Newline />
          </Text>
        </OrderedList.Item>
        <OrderedList.Item>
          <Text>
            Work in trusted projects
          </Text>
          <Text dimColor wrap="wrap">
            Prompt injection is real. For the practical safety model, see:
            <Newline />
            <Link url="https://github.com/Marwan78888/Neuron-Cli/blob/main/SECURITY.md" />
          </Text>
        </OrderedList.Item>
      </OrderedList>
    </Box>
    <PressEnterToContinue />
  </Box>;
  const preflightStep = <PreflightStep onSuccess={goToNextStep} />;
  // Create the steps array - determine which steps to include based on reAuth and oauthEnabled
  const apiKeyNeedingApproval = useMemo(() => {
    // Add API key step if needed
    // On homespace, ANTHROPIC_API_KEY is preserved in process.env for child
    // processes but ignored by Claude Code itself (see auth.ts).
    if (!process.env.ANTHROPIC_API_KEY || isRunningOnHomespace() || !isAnthropicAuthEnabled()) {
      return '';
    }
    const customApiKeyTruncated = normalizeApiKeyForConfig(process.env.ANTHROPIC_API_KEY);
    if (getCustomApiKeyStatus(customApiKeyTruncated) === 'new') {
      return customApiKeyTruncated;
    }
  }, []);
  function handleApiKeyDone(approved: boolean) {
    if (approved) {
      setSkipOAuth(true);
    }
    goToNextStep();
  }
  const steps: OnboardingStep[] = [];
  if (oauthEnabled) {
    steps.push({
      id: 'preflight',
      component: preflightStep
    });
  }
  steps.push({
    id: 'theme',
    component: themeStep
  });
  steps.push({
    id: 'spinner',
    component: spinnerStep
  });
  steps.push({
    id: 'user-name',
    component: userNameStep
  });
  steps.push({
    id: 'assistant-name',
    component: assistantNameStep
  });
  if (apiKeyNeedingApproval) {
    steps.push({
      id: 'api-key',
      component: <ApproveApiKey customApiKeyTruncated={apiKeyNeedingApproval} onDone={handleApiKeyDone} />
    });
  }
  if (oauthEnabled) {
    steps.push({
      id: 'oauth',
      component: <SkippableStep skip={skipOAuth} onSkip={goToNextStep}>
        <ConsoleOAuthFlow onDone={goToNextStep} />
      </SkippableStep>
    });
  }
  steps.push({
    id: 'security',
    component: securityStep
  });
  if (shouldOfferTerminalSetup()) {
    steps.push({
      id: 'terminal-setup',
      component: <Box flexDirection="column" gap={1} paddingLeft={1}>
        <Text bold>Use Neuron&apos;s terminal setup?</Text>
        <Box flexDirection="column" width={70} gap={1}>
          <Text>
            For the optimal coding experience, enable the recommended settings
            <Newline />
            for your terminal:{' '}
            {env.terminal === 'Apple_Terminal' ? 'Option+Enter for newlines and visual bell' : 'Shift+Enter for newlines'}
          </Text>
          <Select options={[{
            label: 'Yes, use recommended settings',
            value: 'install'
          }, {
            label: 'No, maybe later with /terminal-setup',
            value: 'no'
          }]} onChange={(value: string) => {
            if (value === 'install') {
              // Errors already logged in setupTerminal, just swallow and proceed
              void setupTerminal(theme).catch(() => { }).finally(goToNextStep);
            } else {
              goToNextStep();
            }
          }} onCancel={() => goToNextStep()} />
          <Text dimColor>
            {exitState.pending ? <>Press {exitState.keyName} again to exit</> : <>Enter to confirm · Esc to skip</>}
          </Text>
        </Box>
      </Box>
    });
  }
  const currentStep = steps[currentStepIndex];
  const currentStepNumber = currentStepIndex + 1;
  const totalSteps = steps.length;

  // Handle Enter on security step and Escape on terminal-setup step
  // Dependencies match what goToNextStep uses internally
  const handleSecurityContinue = useCallback(() => {
    if (currentStepIndex === steps.length - 1) {
      onDone();
    } else {
      goToNextStep();
    }
  }, [currentStepIndex, steps.length, oauthEnabled, onDone]);
  const handleTerminalSetupSkip = useCallback(() => {
    goToNextStep();
  }, [currentStepIndex, steps.length, oauthEnabled, onDone]);
  useKeybindings({
    'confirm:yes': handleSecurityContinue
  }, {
    context: 'Confirmation',
    isActive: currentStep?.id === 'security'
  });
  useKeybindings({
    'confirm:no': handleTerminalSetupSkip
  }, {
    context: 'Confirmation',
    isActive: currentStep?.id === 'terminal-setup'
  });
  return <Box flexDirection="column">
    <WelcomeV2 />
    <Box flexDirection="column" marginTop={1} marginLeft={1}>
      <Text dimColor>
        Step {currentStepNumber}/{totalSteps} · {currentStep?.id?.replace(/-/g, ' ')}
      </Text>
    </Box>
    <Box flexDirection="column" marginTop={1}>
      {currentStep?.component}
      {exitState.pending && <Box padding={1}>
        <Text dimColor>Press {exitState.keyName} again to exit</Text>
      </Box>}
    </Box>
  </Box>;
}
function ProfileNameStep({
  title,
  description,
  helpText,
  placeholder,
  initialValue,
  required = false,
  onSubmit
}: ProfileNameStepProps): React.ReactNode {
  const normalizedInitialValue = initialValue.replace(/\s+/g, ' ').trim().slice(0, MAX_PROFILE_NAME_LENGTH);
  const [value, setValue] = useState(normalizedInitialValue);
  const [cursorOffset, setCursorOffset] = useState(normalizedInitialValue.length);
  const [error, setError] = useState<string | null>(null);
  const {
    columns
  } = useTerminalSize();
  const inputColumns = Math.max(24, Math.min(columns - 8, 56));
  const handleSubmit = useCallback(() => {
    const normalizedValue = value.replace(/\s+/g, ' ').trim();
    if (required && !normalizedValue) {
      setError('Please enter a name to continue.');
      return;
    }
    if (normalizedValue.length > MAX_PROFILE_NAME_LENGTH) {
      setError(`Please keep the name under ${MAX_PROFILE_NAME_LENGTH} characters.`);
      return;
    }
    setError(null);
    onSubmit(normalizedValue || undefined);
  }, [onSubmit, required, value]);
  return <Box flexDirection="column" gap={1} paddingLeft={1} width={72}>
    <Text bold>{title}</Text>
    <Text dimColor wrap="wrap">
      {description}
    </Text>
    <Box borderStyle="round" borderColor="inactive" paddingLeft={1}>
      <TextInput value={value} onChange={nextValue => {
        setValue(nextValue);
        if (error) {
          setError(null);
        }
      }} onSubmit={handleSubmit} focus={true} showCursor={true} placeholder={placeholder} columns={inputColumns} cursorOffset={cursorOffset} onChangeCursorOffset={setCursorOffset} />
    </Box>
    <Text dimColor>{helpText}</Text>
    {error && <Text color="error">{error}</Text>}
  </Box>;
}
export function SkippableStep(t0: {
  skip: boolean;
  onSkip(): void;
  children: React.ReactNode;
}) {
  const $ = _c(4);
  const {
    skip,
    onSkip,
    children
  } = t0;
  let t1;
  let t2;
  if ($[0] !== onSkip || $[1] !== skip) {
    t1 = () => {
      if (skip) {
        onSkip();
      }
    };
    t2 = [skip, onSkip];
    $[0] = onSkip;
    $[1] = skip;
    $[2] = t1;
    $[3] = t2;
  } else {
    t1 = $[2];
    t2 = $[3];
  }
  useEffect(t1, t2);
  if (skip) {
    return null;
  }
  return children;
}
