'use client';
import { Alert, Button, Checkbox, ColorInput, Grid, Group, NumberInput, Paper, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm, hasLength, isInRange, isNotEmpty, matches } from '@mantine/form';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { MiniLabel, PanelTitle, SectionNumber } from '@/components/ui/blocks';
import { TypefaceSelect, type TypefaceOption } from './typeface-select';
import type { Brand } from '@/types';

const placeholderLogo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><circle cx="45" cy="45" r="26" fill="#243D33"/><rect x="88" y="32" width="170" height="8" fill="#243D33"/><rect x="88" y="52" width="110" height="8" fill="#C4A889"/></svg>';

/** O mesmo formato que o schema do servidor espera — o formulário edita o payload direto. */
export type BrandFormValues = {
  name: string;
  logoSvg: string;
  tokens: {
    colors: { primary: string; secondary: string; background: string; accent: string };
    typography: { display: string; body: string };
    spacing: { small: number; medium: number; large: number };
    grid: { columns: number; margin: number; gutter: number };
  };
  rules: {
    logo: { minimumWidth: number; minimumClearspace: number };
    text: { maxHeadlineCharacters: number; maxHeadlineLines: number; maxDescriptionCharacters: number };
    requireImage: boolean;
  };
};

export const blankBrand: BrandFormValues = {
  name: '', logoSvg: placeholderLogo,
  tokens: {
    colors: { primary: '#243D33', secondary: '#C4A889', background: '#F4F0E8', accent: '#C4A889' },
    typography: { display: 'Cormorant Garamond', body: 'DM Sans' },
    spacing: { small: 8, medium: 24, large: 64 },
    grid: { columns: 12, margin: 64, gutter: 24 },
  },
  rules: {
    logo: { minimumWidth: 140, minimumClearspace: 24 },
    text: { maxHeadlineCharacters: 60, maxHeadlineLines: 2, maxDescriptionCharacters: 120 },
    requireImage: true,
  },
};

export const fromBrand = (brand: Brand): BrandFormValues => ({
  name: brand.name, logoSvg: brand.logoSvg,
  tokens: {
    colors: { primary: brand.tokens.colors.primary, secondary: brand.tokens.colors.secondary, background: brand.tokens.colors.background, accent: brand.tokens.colors.accent },
    typography: { display: brand.tokens.typography.display, body: brand.tokens.typography.body },
    spacing: { ...brand.tokens.spacing },
    grid: { ...brand.tokens.grid },
  },
  rules: {
    logo: { minimumWidth: brand.rules.logo.minimumWidth, minimumClearspace: brand.rules.logo.minimumClearspace },
    text: { ...brand.rules.text },
    requireImage: brand.rules.requireImage,
  },
});

/** Completa o que o schema exige e o formulário não edita. */
export const toPayload = (v: BrandFormValues) => ({
  name: v.name.trim(), logoSvg: v.logoSvg,
  tokens: { colors: { ...v.tokens.colors, additional: [] as string[] }, typography: { ...v.tokens.typography, weights: [400] }, spacing: v.tokens.spacing, grid: v.tokens.grid },
  rules: { logo: { ...v.rules.logo, rotationAllowed: false, recolorAllowed: false }, text: v.rules.text, requireImage: v.rules.requireImage },
});

const hex = /^#[0-9a-fA-F]{6}$/;

export function BrandForm({ mode, initial, typefaces, sourceLabels, busy, error, onSubmit }: {
  mode: 'create' | 'edit';
  initial: BrandFormValues;
  typefaces: TypefaceOption[];
  sourceLabels: Record<TypefaceOption['source'], string>;
  busy: boolean;
  error: string;
  onSubmit: (values: BrandFormValues) => void;
}) {
  const { t } = useI18n();
  const f = t.brands.form;
  const invalidNumber = (min: number, max: number) => isInRange({ min, max }, `${min}–${max}`);
  const form = useForm<BrandFormValues>({
    mode: 'controlled',
    initialValues: initial,
    validateInputOnBlur: true,
    validate: {
      name: hasLength({ min: 2, max: 60 }, '2–60'),
      logoSvg: isNotEmpty(f.logoLabel),
      tokens: {
        colors: { primary: matches(hex, '#RRGGBB'), secondary: matches(hex, '#RRGGBB'), background: matches(hex, '#RRGGBB'), accent: matches(hex, '#RRGGBB') },
        typography: { display: isNotEmpty(f.display), body: isNotEmpty(f.body) },
        spacing: { small: invalidNumber(1, 4096), medium: invalidNumber(1, 4096), large: invalidNumber(1, 4096) },
        grid: { columns: invalidNumber(1, 24), margin: invalidNumber(1, 4096), gutter: invalidNumber(1, 4096) },
      },
      rules: {
        logo: { minimumWidth: invalidNumber(1, 4096), minimumClearspace: invalidNumber(0, 200) },
        text: { maxHeadlineCharacters: invalidNumber(1, 200), maxHeadlineLines: invalidNumber(1, 5), maxDescriptionCharacters: invalidNumber(1, 500) },
      },
    },
  });
  const editing = mode === 'edit';
  const invalidCount = Object.keys(form.errors).length;

  return (
    <Paper component="form" mb="lg" onSubmit={form.onSubmit(onSubmit)} data-testid="brand-form">
      <PanelTitle aside={<SectionNumber>{editing ? t.brands.edit.badge : f.badge}</SectionNumber>}>{editing ? t.brands.edit.title(initial.name) : f.title}</PanelTitle>
      <Text size="sm" c="navy.6" mb="md">{editing ? t.brands.edit.hint : f.hint}</Text>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 4 }}><TextInput label={f.name} placeholder="Serein" maxLength={60} {...form.getInputProps('name')} /></Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <TypefaceSelect label={f.display} value={form.values.tokens.typography.display} options={typefaces} sourceLabels={sourceLabels}
            onChange={v => form.setFieldValue('tokens.typography.display', v)} error={form.errors['tokens.typography.display']} testId="typeface-display" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <TypefaceSelect label={f.body} value={form.values.tokens.typography.body} options={typefaces} sourceLabels={sourceLabels}
            onChange={v => form.setFieldValue('tokens.typography.body', v)} error={form.errors['tokens.typography.body']} testId="typeface-body" />
        </Grid.Col>
      </Grid>

      <MiniLabel>{f.colorTokens}</MiniLabel>
      <Grid gap="md">
        {([['primary', f.primary], ['secondary', f.secondary], ['background', f.background], ['accent', f.accent]] as const).map(([key, label]) => (
          <Grid.Col key={key} span={{ base: 6, md: 3 }}>
            <ColorInput label={label} format="hex" withPicker withEyeDropper={false} {...form.getInputProps(`tokens.colors.${key}`)}
              onChange={v => form.setFieldValue(`tokens.colors.${key}`, v.toUpperCase())} />
          </Grid.Col>
        ))}
      </Grid>

      <MiniLabel>{f.spacingGrid}</MiniLabel>
      <Grid gap="md">
        {([['tokens.spacing.small', f.small], ['tokens.spacing.medium', f.medium], ['tokens.spacing.large', f.large], ['tokens.grid.columns', f.columns], ['tokens.grid.margin', f.margin], ['tokens.grid.gutter', f.gutter]] as const).map(([path, label]) => (
          <Grid.Col key={path} span={{ base: 6, md: 2 }}><NumberInput label={label} min={1} allowDecimal={false} {...form.getInputProps(path)} /></Grid.Col>
        ))}
      </Grid>

      <MiniLabel>{f.enforcedRules}</MiniLabel>
      <Grid gap="md" align="flex-end">
        {([['rules.logo.minimumWidth', f.minimumWidth], ['rules.logo.minimumClearspace', f.minimumClearspace], ['rules.text.maxHeadlineCharacters', f.maxHeadlineCharacters], ['rules.text.maxHeadlineLines', f.maxHeadlineLines], ['rules.text.maxDescriptionCharacters', f.maxDescriptionCharacters]] as const).map(([path, label]) => (
          <Grid.Col key={path} span={{ base: 6, md: 2 }}><NumberInput label={label} min={0} allowDecimal={false} {...form.getInputProps(path)} /></Grid.Col>
        ))}
        <Grid.Col span={{ base: 12, md: 2 }}><Checkbox label={f.requireImage} {...form.getInputProps('rules.requireImage', { type: 'checkbox' })} /></Grid.Col>
      </Grid>
      <Text size="xs" c="navy.5" mt="sm">{f.logoHint}</Text>

      <MiniLabel>{f.logoLabel}</MiniLabel>
      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Textarea className="code-editor" aria-label={f.logoAria} minRows={7} maxRows={12} autosize spellCheck={false} maxLength={100000} {...form.getInputProps('logoSvg')} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack align="center" justify="center" h="100%" p="md" gap="xs" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)', minHeight: 160 }}>
            <SvgPreview svg={form.values.logoSvg} alt={f.livePreview} height={100} />
            <Text size="xs" fw={700} c="navy.5" style={{ letterSpacing: '0.16em' }}>{f.livePreview}</Text>
          </Stack>
        </Grid.Col>
      </Grid>

      {error && <Alert mt="md" color="red" role="alert" data-testid="error-message">{error}</Alert>}

      <Group justify="space-between" mt="lg" wrap="wrap">
        <Group gap={6}>
          {invalidCount ? <TriangleAlert size={12} color="var(--mantine-color-red-7)" /> : <Lock size={12} color="var(--mantine-color-navy-5)" />}
          <Text size="xs" fw={700} c={invalidCount ? 'red.7' : 'navy.5'} style={{ letterSpacing: '0.06em' }}>{invalidCount ? f.fixFields(invalidCount) : f.sanitized}</Text>
        </Group>
        <Button type="submit" size="md" loading={busy} leftSection={<ShieldCheck size={16} />} data-testid="brand-submit">
          {busy ? (editing ? t.brands.edit.submitting : f.submitting) : (editing ? t.brands.edit.submit : f.submit)}
        </Button>
      </Group>
    </Paper>
  );
}
