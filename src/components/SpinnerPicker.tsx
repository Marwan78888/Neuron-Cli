import React, { useState, useEffect } from 'react';
import { Box, Text, useAnimationFrame } from '../ink.js';
import { Select } from './CustomSelect/select.js';
import { getDefaultCharacters } from './Spinner/utils.js';
import { THINKING_COLOR } from './Spinner/SpinnerGlyph.js';

type SpinnerType = 'rune' | 'arrow' | 'bar' | 'binary';

interface Props {
  onSelect: (type: SpinnerType) => void;
  onCancel?: () => void;
  initialType?: SpinnerType;
  title?: string;
}

export function SpinnerPicker({ onSelect, onCancel, initialType = 'rune', title = 'Choose your spinner:' }: Props) {
  const [selectedType, setSelectedType] = useState<SpinnerType>(initialType);
  const [, time] = useAnimationFrame(120);
  const frame = Math.floor(time / 120);

  const options: { label: string; value: SpinnerType }[] = [
    { label: 'Rune (Default)', value: 'rune' },
    { label: 'Arrow', value: 'arrow' },
    { label: 'Bar', value: 'bar' },
    { label: 'Binary', value: 'binary' },
  ];

  const renderSpinner = (type: SpinnerType) => {
    const chars = getDefaultCharacters(undefined, type);
    const char = chars[frame % chars.length];
    return <Text color={`rgb(${THINKING_COLOR.r},${THINKING_COLOR.g},${THINKING_COLOR.b})`}>{char}</Text>;
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{title}</Text>
      <Box flexDirection="row" gap={2} marginBottom={1}>
        {options.map((opt) => (
          <Box key={opt.value} flexDirection="row" gap={1} borderStyle="round" borderColor={selectedType === opt.value ? 'success' : 'gray'}>
             <Box width={3} justifyContent="center">
                {renderSpinner(opt.value)}
             </Box>
             <Text>{opt.label}</Text>
          </Box>
        ))}
      </Box>
      <Select
        options={options}
        onChange={(val) => {
          setSelectedType(val as SpinnerType);
          onSelect(val as SpinnerType);
        }}
        onCancel={onCancel}
      />
    </Box>
  );
}
