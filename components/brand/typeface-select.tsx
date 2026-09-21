'use client';
import { useEffect } from 'react';
import { Badge, Combobox, Group, Input, InputBase, Text, useCombobox } from '@mantine/core';
import { builtinFamilies } from '@/lib/renderer/families';
import type { BrandFont } from '@/types';

/** As embutidas são servidas de /public; as da marca chegam como data URL. */
const builtinSources: Record<string, string> = {
  'DM Sans': '/demo/fonts/body.ttf',
  'Cormorant Garamond': '/demo/fonts/display.ttf',
};

/**
 * Registra as famílias no navegador para que cada opção seja desenhada na própria
 * fonte. Idempotente: uma família já carregada não é baixada de novo.
 */
export function useBrowserFonts(fonts: BrandFont[]) {
  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    const sources = [
      ...builtinFamilies.map(family => [family, builtinSources[family]] as const),
      ...fonts.map(font => [font.family, font.data] as const),
    ];
    for (const [family, source] of sources) {
      if (document.fonts.check(`12px "${family}"`)) continue;
      const face = new FontFace(family, `url(${source})`);
      face.load().then(loaded => document.fonts.add(loaded)).catch(() => { /* a opção cai na fonte da interface */ });
    }
  }, [fonts]);
}

export type TypefaceOption = { family: string; source: 'builtin' | BrandFont['source'] };

export function TypefaceSelect({ label, value, options, sourceLabels, onChange, error, testId }: {
  label: string;
  value: string;
  options: TypefaceOption[];
  sourceLabels: Record<TypefaceOption['source'], string>;
  onChange: (family: string) => void;
  error?: React.ReactNode;
  testId?: string;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.selectActiveOption(),
  });
  const selected = options.find(o => o.family === value);

  return (
    <Combobox store={combobox} onOptionSubmit={family => { onChange(family); combobox.closeDropdown(); }}>
      <Combobox.Target>
        <InputBase component="button" type="button" pointer label={label} error={error} data-testid={testId}
          rightSection={<Combobox.Chevron />} rightSectionPointerEvents="none" onClick={() => combobox.toggleDropdown()}>
          {selected
            ? <Text span style={{ fontFamily: `"${selected.family}", var(--mantine-font-family)` }}>{selected.family}</Text>
            : <Input.Placeholder>{label}</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {options.map(option => (
            <Combobox.Option value={option.family} key={option.family} active={option.family === value}>
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Text size="lg" lh={1.1} style={{ fontFamily: `"${option.family}", var(--mantine-font-family)` }}>{option.family}</Text>
                <Badge size="xs" variant="light" color={option.source === 'builtin' ? 'navy' : 'brand'}>{sourceLabels[option.source]}</Badge>
              </Group>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
