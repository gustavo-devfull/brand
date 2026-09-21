'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Alert, Anchor, Badge, Box, Button, Card, Divider, FileButton, Grid, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { Check, Download, Grid3x3, Layers, Lock, Pencil, Plus, Ruler, ShieldCheck, Type, Upload, X } from 'lucide-react';
import { useWorkspace, Loading, request } from '@/components/ui/workspace';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { LiveDot, MiniLabel, PageHeading, PanelTitle, RuleItem, SectionNumber } from '@/components/ui/blocks';
import { Swatch } from '@/components/ui/swatch/Swatch';
import { builtinFamilies } from '@/lib/renderer/families';
import { BrandForm, blankBrand, fromBrand, toPayload, type BrandFormValues } from './brand-form';
import { useBrowserFonts, type TypefaceOption } from './typeface-select';
import type { Brand, BrandFont } from '@/types';

export function BrandManager() {
  const { workspace, reload } = useWorkspace();
  const { t } = useI18n();
  const [brandId, setBrandId] = useState('');
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [googleFamily, setGoogleFamily] = useState('');
  const brand = workspace?.brands.find(b => b.id === brandId) ?? workspace?.brands[0];
  const brandFonts = workspace?.fonts.filter(f => f.brandId === brand?.id) ?? [];
  useBrowserFonts(brandFonts);
  if (!workspace) return <Loading />;

  const assets = workspace.assets.filter(a => a.brandId === brand?.id);
  const templates = workspace.templates.filter(tpl => tpl.brandId === brand?.id);
  const typefaces: TypefaceOption[] = [...builtinFamilies.map(family => ({ family, source: 'builtin' as const })), ...brandFonts.map(f => ({ family: f.family, source: f.source }))];
  const sourceLabels = { builtin: t.brands.fonts.builtin, google: t.brands.fonts.google, upload: t.brands.fonts.upload };
  const inUse = (family: string) => brand && [brand.tokens.typography.display, brand.tokens.typography.body].includes(family);
  const start = (next: 'create' | 'edit') => { setError(''); setNotice(''); setMode(m => m === next ? 'idle' : next); };
  const withStatus = async (key: string, run: () => Promise<string>) => {
    setBusy(key); setError(''); setNotice('');
    try { setNotice(await run()); } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  };

  const submitBrand = (values: BrandFormValues) => void withStatus('brand', async () => {
    if (mode === 'edit' && brand) {
      const result = await request<{ brand: Brand; regeneratedTemplates: number; customTemplates: number }>('/api/brands',
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: brand.id, ...toPayload(values) }) }, t.common.requestFailed);
      await reload(); setMode('idle');
      return `${t.brands.edit.saved(result.brand.name, result.regeneratedTemplates)}${result.customTemplates ? ` ${t.brands.edit.customWarning(result.customTemplates)}` : ''}`;
    }
    const created = await request<Brand>('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toPayload(values)) }, t.common.requestFailed);
    await reload(); setBrandId(created.id); setMode('idle');
    return t.brands.form.created(created.name);
  });

  const uploadImages = (files: File[]) => { if (!brand) return; void withStatus('upload', async () => {
    for (const file of files) {
      const form = new FormData(); form.append('file', file); form.append('brandId', brand.id);
      const response = await fetch('/api/assets', { method: 'POST', body: form });
      if (!response.ok) throw new Error((await response.json()).error);
    }
    await reload(); return t.brands.library.uploaded(files.length, brand.name);
  }); };

  const addGoogleFont = () => { if (!brand || !googleFamily.trim()) return; void withStatus('google', async () => {
    const font = await request<BrandFont>('/api/fonts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId: brand.id, family: googleFamily.trim() }) }, t.common.requestFailed);
    await reload(); setGoogleFamily(''); return t.brands.fonts.added(font.family);
  }); };

  const uploadFont = (file: File | null) => { if (!brand || !file) return; void withStatus('font', async () => {
    const form = new FormData(); form.append('file', file); form.append('brandId', brand.id);
    const response = await fetch('/api/fonts', { method: 'PUT', body: form });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    await reload(); return t.brands.fonts.added((body as BrandFont).family);
  }); };

  const editing = mode === 'edit';
  const detail = (k: string, v: string) => (
    <Group key={k} justify="space-between" py={8} style={{ borderBottom: '1px solid var(--mantine-color-navy-1)' }}>
      <Text size="xs" c="navy.5" tt="uppercase" fw={700} style={{ letterSpacing: '0.1em' }}>{k}</Text><Text size="sm" fw={600}>{v}</Text>
    </Group>
  );

  return (
    <>
      <PageHeading eyebrow={t.brands.eyebrow} lead={t.brands.titleLead} em={t.brands.titleEm} subtitle={t.brands.subtitle}
        action={<>
          {brand && <Button variant="default" leftSection={editing ? <X size={15} /> : <Pencil size={15} />} onClick={() => start('edit')}>{editing ? t.common.cancel : t.brands.edit.action}</Button>}
          <Button leftSection={mode === 'create' ? <X size={15} /> : <Plus size={15} />} onClick={() => start('create')}>{mode === 'create' ? t.common.cancel : t.brands.register}</Button>
        </>} />

      {notice && <Alert mb="md" color="teal" icon={<Check size={14} />} role="status" data-testid="notice-message">{notice}</Alert>}
      {error && mode === 'idle' && <Alert mb="md" color="red" role="alert" data-testid="error-message">{error}</Alert>}

      {mode !== 'idle' && (
        <BrandForm key={`${mode}-${brand?.id}`} mode={mode} initial={editing && brand ? fromBrand(brand) : blankBrand} typefaces={typefaces} sourceLabels={sourceLabels}
          busy={busy === 'brand'} error={error} onSubmit={submitBrand} />
      )}

      {!brand ? (
        <Paper ta="center" py="xl"><Layers /><Text fw={700} mt="sm">{t.brands.emptyTitle}</Text><Text size="sm" c="navy.6">{t.brands.emptyBody}</Text></Paper>
      ) : (
        <>
          <Group justify="space-between" mb="lg" wrap="wrap">
            <Select aria-label={t.common.selectBrand} value={brand.id} allowDeselect={false} w={260} data-testid="brand-select"
              data={workspace.brands.map(b => ({ value: b.id, label: b.name }))} onChange={v => { if (v) { setBrandId(v); setMode('idle'); } }} />
            <Group gap={6}><LiveDot /><Text size="xs" c="navy.5" fw={600}>{t.brands.counts(templates.length, assets.length)}</Text></Group>
          </Group>

          <Grid gap="lg" mb="lg" align="stretch">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper h="100%">
                <PanelTitle aside={<Lock size={14} color="var(--mantine-color-navy-5)" />}>{t.brands.identity.title}</PanelTitle>
                <Group gap="md" wrap="nowrap" mb="md">
                  <Box style={{ flex: '0 1 58%', minWidth: 0 }}><SvgPreview svg={brand.logoSvg} alt={brand.name} height={56} /></Box>
                  <Text size="xs" fw={700} c="navy.5" tt="uppercase" style={{ letterSpacing: '0.14em', flex: 1 }}>{t.studioPage.context.officialLogo}</Text>
                </Group>
                <Stack gap={0}>
                  {detail(t.brands.identity.registered, new Date(brand.createdAt).toLocaleDateString(t.htmlLang))}
                  {detail(t.brands.identity.rotation, brand.rules.logo.rotationAllowed ? t.common.allowed : t.common.forbidden)}
                  {detail(t.brands.identity.recolor, brand.rules.logo.recolorAllowed ? t.common.allowed : t.common.forbidden)}
                  {detail(t.brands.identity.minimumWidth, `${brand.rules.logo.minimumWidth}px`)}
                  {detail(t.brands.identity.clearspace, `${brand.rules.logo.minimumClearspace}px`)}
                </Stack>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper h="100%">
                <PanelTitle aside={<Type size={15} color="var(--mantine-color-navy-5)" />}>{t.brands.tokens.title}</PanelTitle>
                <MiniLabel aside={<Lock size={11} color="var(--mantine-color-navy-4)" />}>{t.brands.tokens.color}</MiniLabel>
                <Group gap="md" data-testid="swatches">
                  {Object.entries(brand.tokens.colors).flatMap(([key, value]) => Array.isArray(value) ? value.map((v, i) => [`${key}-${i}`, v] as const) : [[key, value] as const]).map(([key, color]) => <Swatch key={key} color={color} size="sm" />)}
                </Group>
                <MiniLabel aside={<Lock size={11} color="var(--mantine-color-navy-4)" />}>{t.brands.tokens.typography}</MiniLabel>
                <Stack gap="xs">
                  {[[brand.tokens.typography.display, t.brands.tokens.display], [brand.tokens.typography.body, t.brands.tokens.body]].map(([family, role]) => (
                    <Group key={role} gap="sm" p="sm" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)' }}>
                      <Text fz={26} lh={1} fw={500} style={{ fontFamily: `"${family}", Georgia, serif` }}>Aa</Text>
                      <Box><Text size="sm" fw={600}>{family}</Text><Text size="xs" c="navy.5">{role}</Text></Box>
                    </Group>))}
                </Stack>
                <MiniLabel aside={<Ruler size={11} color="var(--mantine-color-navy-4)" />}>{t.brands.tokens.spacingGrid}</MiniLabel>
                <Group gap={6}>
                  {[`S ${brand.tokens.spacing.small}`, `M ${brand.tokens.spacing.medium}`, `L ${brand.tokens.spacing.large}`, t.brands.tokens.columns(brand.tokens.grid.columns), t.brands.tokens.margin(brand.tokens.grid.margin), t.brands.tokens.gutter(brand.tokens.grid.gutter)].map((chip, i) => (
                    <Badge key={chip} variant="default" size="md" fw={600} tt="none" leftSection={i === 3 ? <Grid3x3 size={11} /> : undefined}>{chip}</Badge>))}
                </Group>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper h="100%">
                <PanelTitle aside={<ShieldCheck size={15} color="var(--mantine-color-navy-5)" />}>{t.brands.constraints.title}</PanelTitle>
                <Stack gap="xs">
                  {[[t.brands.constraints.headlineCharacters, t.brands.constraints.maximum(brand.rules.text.maxHeadlineCharacters)], [t.brands.constraints.headlineLines, t.brands.constraints.maximum(brand.rules.text.maxHeadlineLines)],
                    [t.brands.constraints.descriptionCharacters, t.brands.constraints.maximum(brand.rules.text.maxDescriptionCharacters)], [t.brands.constraints.imagery, brand.rules.requireImage ? t.common.required : t.common.optional],
                    [t.brands.constraints.palette, t.brands.constraints.approvedTokens], [t.brands.constraints.typography, t.brands.constraints.registeredTypefaces]].map(([name, description]) => <RuleItem key={name} name={name} description={description} />)}
                </Stack>
                <Divider my="md" />
                <Anchor component={Link} href="/templates" size="sm" fw={600}><Group gap={6}><Layers size={14} />{t.brands.constraints.approvedTemplates(templates.length)} →</Group></Anchor>
              </Paper>
            </Grid.Col>
          </Grid>

          <Paper mb="lg" data-testid="font-library">
            <PanelTitle aside={<Type size={15} color="var(--mantine-color-navy-5)" />}>{t.brands.fonts.title}</PanelTitle>
            <Text size="sm" c="navy.6" mb="md">{t.brands.fonts.hint}</Text>
            <Grid gap="lg" mb="lg" align="flex-start">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput label={t.brands.fonts.googleLabel} description={t.brands.fonts.googleHint} placeholder={t.brands.fonts.googlePlaceholder} maxLength={64} value={googleFamily}
                  onChange={e => setGoogleFamily(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGoogleFont(); } }}
                  rightSectionWidth={112} rightSection={<Button size="xs" variant="light" loading={busy === 'google'} disabled={!googleFamily.trim()} leftSection={<Download size={13} />} onClick={addGoogleFont}>{t.brands.fonts.googleAction}</Button>} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Text size="sm" fw={500} mb={2}>{t.brands.fonts.uploadLabel}</Text>
                <Text size="xs" c="navy.5" mb={6}>{t.brands.fonts.uploadHint}</Text>
                <FileButton onChange={uploadFont} accept=".ttf,.otf,font/ttf,font/otf">
                  {props => <Button {...props} variant="default" fullWidth loading={busy === 'font'} leftSection={<Upload size={15} />}>{t.brands.fonts.uploadAction}</Button>}
                </FileButton>
              </Grid.Col>
            </Grid>
            <Stack gap="xs">
              {typefaces.map(option => (
                <Group key={option.family} gap="md" wrap="nowrap" p="sm" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)' }} data-testid="font-row">
                  <ThemeIcon size={38} radius="sm" variant="white" color="navy"><Text fz={18} style={{ fontFamily: `"${option.family}", Georgia, serif` }}>Aa</Text></ThemeIcon>
                  <Box style={{ flex: 1 }}><Text size="sm" fw={700}>{option.family}</Text><Text size="xs" c="navy.5" tt="uppercase" style={{ letterSpacing: '0.08em' }}>{sourceLabels[option.source]}</Text></Box>
                  {inUse(option.family) && <Badge variant="light" color="brand" leftSection={<Lock size={10} />}>{t.brands.fonts.inUse}</Badge>}
                </Group>))}
              {!brandFonts.length && <Text size="xs" c="navy.5">{t.brands.fonts.empty}</Text>}
            </Stack>
          </Paper>

          <Paper>
            <PanelTitle aside={<SectionNumber>{assets.length.toString().padStart(2, '0')}</SectionNumber>}>{t.brands.library.title}</PanelTitle>
            <Text size="sm" c="navy.6" mb="md">{t.brands.library.hint}</Text>
            <Dropzone onDrop={uploadImages} accept={[...IMAGE_MIME_TYPE, 'image/svg+xml']} maxSize={5_000_000} loading={busy === 'upload'} mb="lg" radius="md" data-testid="upload-drop">
              <Group justify="center" gap="md" mih={90} style={{ pointerEvents: 'none' }}>
                <ThemeIcon size={38} radius="md" variant="light" color="brand"><Upload size={18} /></ThemeIcon>
                <Box><Text fw={700}>{t.brands.library.drop}</Text><Text size="xs" c="navy.5">{t.brands.library.dropHint}</Text></Box>
              </Group>
            </Dropzone>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
              {assets.map(asset => (
                <Card key={asset.id} withBorder radius="md" padding={0} shadow="none" data-testid="asset-card">
                  <img src={asset.data} alt={asset.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                  <Box p="xs"><Text size="xs" fw={700} lineClamp={1}>{asset.name}</Text><Text size="xs" c="navy.5" tt="uppercase">{t.assetKinds[asset.kind]} · {asset.mime.replace('image/', '')}</Text></Box>
                </Card>))}
            </SimpleGrid>
            {!assets.length && <Text size="xs" c="navy.5">{t.brands.library.empty}</Text>}
          </Paper>
        </>
      )}
    </>
  );
}
