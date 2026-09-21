'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Accordion, Alert, Anchor, AspectRatio, Badge, Box, Button, Card, Chip, Code, Divider, Grid, Group, Modal, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { Check, Code2, Layers, Lock, Plus, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useWorkspace, Loading, request } from '@/components/ui/workspace';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { Eyebrow, MiniLabel, PageHeading, PanelTitle, RuleItem, SectionNumber } from '@/components/ui/blocks';
import { templateLabel } from '@/lib/i18n/format';
import { makeTemplate } from '@/lib/brand/template-factory';
import { formats, type Format } from '@/schemas';
import type { Template } from '@/types';

const themes = ['ivory', 'forest', 'sand'] as const;

export function TemplateGallery() {
  const { workspace, reload } = useWorkspace();
  const { t } = useI18n();
  const [brandId, setBrandId] = useState('');
  const [format, setFormat] = useState<Format | 'All'>('All');
  const [creating, setCreating] = useState(false);
  const [draftFormat, setDraftFormat] = useState<Format>('Instagram Post');
  const [draftTheme, setDraftTheme] = useState<Template['theme']>('ivory');
  const [name, setName] = useState('');
  const [svg, setSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inspecting, setInspecting] = useState<Template | null>(null);

  const brands = workspace?.brands ?? [];
  const brand = brands.find(b => b.id === brandId) ?? brands[0];
  const scaffold = useMemo(() => brand ? makeTemplate(brand, draftFormat, draftTheme, '00000000-0000-4000-8000-000000000000').svg : '', [brand, draftFormat, draftTheme]);
  if (!workspace) return <Loading />;

  const templates = workspace.templates.filter(tpl => tpl.brandId === brand?.id && (format === 'All' || tpl.format === format));
  const markup = svg || scaffold;
  const slotLegend = [['heroImage', t.templates.legend.items.heroImage], ['logo', t.templates.legend.items.logo], ['headline', t.templates.legend.items.headline], ['description', t.templates.legend.items.description], ['cta', t.templates.legend.items.cta]] as const;

  async function create() {
    if (!brand) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const created = await request<Template>('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), brandId: brand.id, format: draftFormat, theme: draftTheme, svg: markup }) }, t.common.requestFailed);
      await reload(); setCreating(false); setName(''); setSvg('');
      setNotice(t.templates.form.created(created.name, created.width, created.height));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const ratio = (f: Format) => f === 'Instagram Story' ? 3 / 4 : f === 'Web Hero' ? 2 : 1;

  return (
    <>
      <PageHeading eyebrow={t.templates.eyebrow} lead={t.templates.titleLead} em={t.templates.titleEm} subtitle={t.templates.subtitle}
        action={<Button disabled={!brand} leftSection={creating ? <X size={15} /> : <Plus size={15} />} onClick={() => { setCreating(c => !c); setError(''); setNotice(''); }}>{creating ? t.common.cancel : t.templates.add}</Button>} />

      {notice && <Alert mb="md" color="teal" icon={<Check size={14} />} role="status" data-testid="notice-message">{notice}</Alert>}
      {error && !creating && <Alert mb="md" color="red" role="alert" data-testid="error-message">{error}</Alert>}

      {!brand ? (
        <Paper ta="center" py="xl"><Layers /><Title order={3} mt="sm">{t.templates.needBrandTitle}</Title><Text size="sm" c="navy.6" mb="md">{t.templates.needBrandBody}</Text><Button component={Link} href="/brands" variant="light">{t.templates.goToBrands}</Button></Paper>
      ) : (
        <>
          <Group justify="space-between" mb="lg" wrap="wrap" gap="md">
            <Select aria-label={t.common.selectBrand} value={brand.id} allowDeselect={false} w={260} data-testid="brand-select"
              data={brands.map(b => ({ value: b.id, label: b.name }))} onChange={v => v && setBrandId(v)} />
            <Chip.Group value={format} onChange={v => setFormat(v as Format | 'All')}>
              <Group gap="xs">
                <Chip value="All" variant="light" color="brand">{t.templates.all}</Chip>
                {formats.map(f => <Chip key={f} value={f} variant="light" color="brand">{t.formats[f]}</Chip>)}
              </Group>
            </Chip.Group>
          </Group>

          {creating && (
            <Paper mb="lg" data-testid="template-form">
              <PanelTitle aside={<SectionNumber>{t.templates.form.badge}</SectionNumber>}>{t.templates.form.title}</PanelTitle>
              <Text size="sm" c="navy.6" mb="md">{t.templates.form.hint}</Text>
              <Grid gap="md" mb="md">
                <Grid.Col span={{ base: 12, md: 6 }}><TextInput label={t.templates.form.name} placeholder={t.templates.form.namePlaceholder} maxLength={60} value={name} onChange={e => setName(e.currentTarget.value)} /></Grid.Col>
                <Grid.Col span={{ base: 6, md: 3 }}><Select label={t.templates.form.format} value={draftFormat} allowDeselect={false} data={formats.map(f => ({ value: f, label: t.formats[f] }))} onChange={v => { if (v) { setDraftFormat(v as Format); setSvg(''); } }} /></Grid.Col>
                <Grid.Col span={{ base: 6, md: 3 }}><Select label={t.templates.form.theme} value={draftTheme} allowDeselect={false} data={themes.map(th => ({ value: th, label: t.themes[th] }))} onChange={v => { if (v) { setDraftTheme(v as Template['theme']); setSvg(''); } }} /></Grid.Col>
              </Grid>
              <MiniLabel aside={<Button variant="subtle" size="compact-xs" leftSection={<RotateCcw size={12} />} onClick={() => setSvg('')}>{t.templates.form.reset}</Button>}>{t.templates.form.markup}</MiniLabel>
              <Grid gap="md">
                <Grid.Col span={{ base: 12, md: 7 }}><Textarea className="code-editor" aria-label={t.templates.form.markupAria} minRows={12} maxRows={18} autosize spellCheck={false} maxLength={150000} value={markup} onChange={e => setSvg(e.currentTarget.value)} /></Grid.Col>
                <Grid.Col span={{ base: 12, md: 5 }}>
                  <Stack align="center" justify="center" h="100%" p="md" gap="xs" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)', minHeight: 200 }}>
                    <SvgPreview svg={markup} alt={t.templates.form.wireframe} height={200} />
                    <Text size="xs" fw={700} c="navy.5" style={{ letterSpacing: '0.16em' }}>{t.templates.form.wireframe}</Text>
                  </Stack>
                </Grid.Col>
              </Grid>
              {error && <Alert mt="md" color="red" role="alert" data-testid="error-message">{error}</Alert>}
              <Group justify="space-between" mt="lg" wrap="wrap">
                <Group gap={6}><Lock size={12} color="var(--mantine-color-navy-5)" /><Text size="xs" fw={700} c="navy.5" style={{ letterSpacing: '0.06em' }}>{t.templates.form.requirements}</Text></Group>
                <Button size="md" loading={busy} disabled={name.trim().length < 2} leftSection={<ShieldCheck size={16} />} onClick={() => void create()}>{busy ? t.templates.form.submitting : t.templates.form.submit}</Button>
              </Group>
            </Paper>
          )}

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mb="lg">
            {templates.map(template => {
              const label = templateLabel(t, template);
              return (
                <Card key={template.id} withBorder radius="lg" padding="md" shadow="sm" data-testid="template-card">
                  <Card.Section pos="relative" p="sm" style={{ background: 'var(--mantine-color-navy-0)' }}>
                    <AspectRatio ratio={ratio(template.format)}><Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgPreview svg={template.svg} alt={t.templates.card.geometryAlt(label)} /></Box></AspectRatio>
                    <Badge pos="absolute" top={10} left={10} variant="white" color="navy" size="xs" fw={800}>{template.width} × {template.height}</Badge>
                  </Card.Section>
                  <Group justify="space-between" mt="md" wrap="nowrap">
                    <Box style={{ minWidth: 0 }}><Text fw={700} lineClamp={1}>{label}</Text><Text size="xs" c="navy.5">{t.formats[template.format]} · {t.themes[template.theme]}</Text></Box>
                    <Badge variant="light" color="navy" leftSection={<Lock size={10} />}>{template.alignments.map(a => t.alignments[a]).join(', ')}</Badge>
                  </Group>
                  <Group justify="space-between" mt="sm">
                    <Button variant="subtle" size="xs" color="navy" leftSection={<Code2 size={13} />} onClick={() => setInspecting(template)}>{t.templates.card.inspect}</Button>
                    <Text size="xs" fw={700} c="navy.5" tt="uppercase" style={{ letterSpacing: '0.1em' }}>{t.templates.card.slots}</Text>
                  </Group>
                </Card>
              );
            })}
          </SimpleGrid>
          {!templates.length && <Paper ta="center" py="xl" mb="lg"><Layers /><Title order={3} mt="sm">{t.templates.emptyTitle}</Title><Text size="sm" c="navy.6">{t.templates.emptyBody(brand.name)}</Text></Paper>}

          <Paper>
            <PanelTitle aside={<ShieldCheck size={15} color="var(--mantine-color-navy-5)" />}>{t.templates.legend.title}</PanelTitle>
            <Stack gap="xs">{slotLegend.map(([slot, description]) => <RuleItem key={slot} name={slot} description={description} />)}</Stack>
            <Text size="sm" c="navy.6" mt="md">{t.templates.legend.noteBefore}<Code>{t.templates.legend.noteCode}</Code>{t.templates.legend.noteAfter}</Text>
            <Divider my="md" />
            <Anchor component={Link} href="/architecture" size="sm" fw={600}>{t.templates.legend.link} →</Anchor>
          </Paper>
        </>
      )}

      <TemplateInspector template={inspecting} onClose={() => setInspecting(null)} />
    </>
  );
}

function TemplateInspector({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  if (!template) return <Modal opened={false} onClose={onClose} />;
  const label = templateLabel(t, template);
  const slots = [...template.svg.matchAll(/data-slot="([a-zA-Z]+)"/g)].map(m => m[1]);
  const protectedElements = [...template.svg.matchAll(/data-protected="([a-zA-Z]+)"/g)].map(m => m[1]);
  const rows: [string, string][] = [
    [t.templates.inspector.format, t.formats[template.format]], [t.templates.inspector.canvas, `${template.width} × ${template.height}`], [t.templates.inspector.theme, t.themes[template.theme]],
    [t.templates.inspector.alignments, template.alignments.map(a => t.alignments[a]).join(', ')], [t.templates.inspector.slots, slots.join(', ')], [t.templates.inspector.protected, protectedElements.join(', ') || t.common.none],
  ];
  return (
    <Modal opened onClose={onClose} size="xl" title={<Box><Eyebrow>{t.templates.inspector.eyebrow}</Eyebrow><Title order={2} fz="1.5rem">{label}</Title></Box>} closeButtonProps={{ 'aria-label': t.common.close }} data-testid="inspect-dialog">
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SvgPreview svg={template.svg} alt={t.templates.card.geometryAlt(label)} height={360} />
          <Group gap={6} mt="sm" p="sm" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)' }} data-testid="protected-note">
            <Lock size={14} color="var(--mantine-color-navy-5)" /><Text size="sm" fw={600} c="navy.6">{t.templates.inspector.protectedNote(protectedElements.length)}</Text>
          </Group>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Eyebrow>{t.templates.inspector.fixed}</Eyebrow>
          <Stack gap={0} mb="md">{rows.map(([k, v]) => (
            <Group key={k} justify="space-between" py={8} wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-navy-1)' }}>
              <Text size="xs" c="navy.5" tt="uppercase" fw={700} style={{ letterSpacing: '0.1em', flex: '0 0 120px' }}>{k}</Text><Text size="sm" fw={600} ta="right" style={{ overflowWrap: 'anywhere' }}>{v}</Text>
            </Group>))}</Stack>
          <Accordion variant="contained" radius="md">
            <Accordion.Item value="markup">
              <Accordion.Control><Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }}>{t.templates.inspector.viewMarkup}</Text></Accordion.Control>
              <Accordion.Panel>
                <pre className="code-block">{template.svg}</pre>
                <Button mt="sm" variant="subtle" size="xs" leftSection={<Code2 size={13} />} onClick={async () => { try { await navigator.clipboard.writeText(template.svg); setCopied(true); } catch { setCopied(false); } }}>{copied ? t.common.copied : t.common.copySvg}</Button>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}
