'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ActionIcon, Alert, Anchor, Badge, Box, Button, Card, Center, Divider, Grid, Group, Paper, Select, SimpleGrid, Stack, Text, Textarea, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { ArrowDownToLine, ArrowRight, Layers, Lock, Maximize2, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { useWorkspace, Loading, request } from '@/components/ui/workspace';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { Eyebrow, LiveDot, MiniLabel, PageHeading, PanelTitle, RuleItem, SectionNumber } from '@/components/ui/blocks';
import { Swatch } from '@/components/ui/swatch/Swatch';
import { templateLabel } from '@/lib/i18n/format';
import { Inspect } from './inspect';
import { formats, type Format } from '@/schemas';
import type { Campaign, Variation } from '@/types';

export function Studio() {
  const { workspace, setWorkspace } = useWorkspace();
  const { t } = useI18n();
  const [brandId, setBrandId] = useState('');
  const [brief, setBrief] = useState('');
  const [format, setFormat] = useState<Format>('Instagram Post');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Variation | null>(null);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [generated, setGenerated] = useState(false);
  const [exporting, setExporting] = useState('');
  if (!workspace) return <Loading />;

  const brand = workspace.brands.find(b => b.id === brandId) || workspace.brands[0];
  const assets = workspace.assets.filter(a => a.brandId === brand.id && a.kind === 'image');
  const templates = workspace.templates.filter(tpl => tpl.brandId === brand.id);
  const campaign = activeCampaign?.brandId === brand.id ? activeCampaign : workspace.campaigns.find(c => c.brandId === brand.id);
  const variations = campaign?.variations || [];
  // O briefing padrão é conteúdo demo, então acompanha o idioma até o usuário digitar o seu.
  const briefValue = brief || t.demo.brief;
  const approved = variations.filter(v => v.compliance.approved).length;

  async function generate() {
    setBusy(true); setError('');
    try {
      const result = await request<Campaign>('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: brand.id, brief: briefValue, format }) }, t.common.requestFailed);
      setActiveCampaign(result); setWorkspace(w => w ? { ...w, campaigns: [result, ...w.campaigns] } : w); setGenerated(true);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function download(id: string, kind: 'svg' | 'png') {
    setExporting(id + kind); setError('');
    try {
      const response = await fetch(`/api/export?id=${id}&format=${kind}`);
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a'); a.href = url; a.download = `${brand.name}-${id.slice(0, 8)}.${kind}`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError((e as Error).message); } finally { setExporting(''); }
  }

  const checks = [t.studioPage.compliance.items.logo, t.studioPage.compliance.items.palette, t.studioPage.compliance.items.typography,
    t.studioPage.compliance.items.layout, t.studioPage.compliance.items.copy(brand.rules.text.maxHeadlineCharacters), t.studioPage.compliance.items.assets];

  return (
    <>
      <PageHeading eyebrow={t.studioPage.eyebrow} lead={t.studioPage.titleLead} em={t.studioPage.titleEm} subtitle={t.studioPage.subtitle}
        action={<Button component={Link} href="/architecture" variant="default" leftSection={<Workflow size={15} />} rightSection={<ArrowRight size={13} />}>{t.studioPage.howItWorks}</Button>} />

      <Paper py="sm" px="lg" mb="lg" radius="xl">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="md">
            {[t.studioPage.pipeline.one, t.studioPage.pipeline.two, t.studioPage.pipeline.three].map((step, i) => (
              <Group key={step} gap="sm">
                {i > 0 && <ArrowRight size={14} color="var(--mantine-color-navy-3)" />}
                <SectionNumber>0{i + 1}</SectionNumber>
                <Text size="sm" fw={600}>{step}</Text>
              </Group>
            ))}
          </Group>
          <Group gap={6}><Lock size={12} color="var(--mantine-color-navy-5)" /><Text size="sm" c="navy.6">{t.studioPage.pipeline.end}</Text></Group>
        </Group>
      </Paper>

      <Grid gap="lg" align="stretch" mb="xl">
        <Grid.Col span={{ base: 12, lg: 3.5 }}>
          <Paper h="100%">
            <PanelTitle aside={<SectionNumber>01</SectionNumber>}>{t.studioPage.context.title}</PanelTitle>
            <Select aria-label={t.common.selectBrand} value={brand.id} allowDeselect={false} data-testid="brand-select"
              data={workspace.brands.map(b => ({ value: b.id, label: b.name }))}
              onChange={v => { if (v) { setBrandId(v); setGenerated(false); setActiveCampaign(null); } }} />
            <Group mt="lg" gap="md" wrap="nowrap" align="center">
              <Box style={{ flex: '0 1 58%', minWidth: 0 }}><SvgPreview svg={brand.logoSvg} alt={brand.name} height={56} /></Box>
              <Text size="xs" fw={700} c="navy.5" tt="uppercase" style={{ letterSpacing: '0.14em', flex: 1 }}>{t.studioPage.context.officialLogo}</Text>
            </Group>
            <Divider my="md" />
            <MiniLabel aside={<Lock size={11} color="var(--mantine-color-navy-4)" />}>{t.studioPage.context.palette}</MiniLabel>
            <Group gap="md">{[...new Set(Object.values(brand.tokens.colors).flat())].map(color => <Swatch key={color} color={color} size="sm" />)}</Group>
            <MiniLabel aside={<Lock size={11} color="var(--mantine-color-navy-4)" />}>{t.studioPage.context.typography}</MiniLabel>
            <Stack gap="xs">
              {[[brand.tokens.typography.display, t.studioPage.context.display, 'display-aa'], [brand.tokens.typography.body, t.studioPage.context.body, '']].map(([family, role, cls]) => (
                <Group key={role} gap="sm" p="sm" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)' }}>
                  <Text className={cls} fz={26} lh={1} fw={500}>Aa</Text>
                  <Box><Text size="sm" fw={600}>{family}</Text><Text size="xs" c="navy.5">{role}</Text></Box>
                </Group>
              ))}
            </Stack>
            <MiniLabel aside={<Text size="xs" c="navy.5" fw={700}>{t.studioPage.context.assetsAvailable(assets.length)}</Text>}>{t.studioPage.context.assets}</MiniLabel>
            {assets.length
              ? <SimpleGrid cols={3} spacing="xs">{assets.slice(0, 3).map(a => <img key={a.id} src={a.data} alt={a.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--mantine-radius-sm)' }} />)}</SimpleGrid>
              : <Anchor component={Link} href="/brands" size="sm">{t.studioPage.context.uploadFirst}</Anchor>}
            <Divider my="md" />
            <Anchor component={Link} href="/templates" size="sm" fw={600}><Group gap={6}><Layers size={14} />{t.studioPage.context.approvedTemplates(templates.length)}<ArrowRight size={13} /></Group></Anchor>
            <Anchor component={Link} href="/brands" size="sm" fw={600} mt={6} display="block">{t.studioPage.context.viewBrand} →</Anchor>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Paper h="100%">
            <PanelTitle aside={<SectionNumber>02</SectionNumber>}>{t.studioPage.brief.title}</PanelTitle>
            <Textarea label={t.studioPage.brief.label} description={t.studioPage.brief.hint} placeholder={t.studioPage.brief.placeholder}
              id="brief" value={briefValue} maxLength={2000} minRows={5} autosize onChange={e => setBrief(e.currentTarget.value)} />
            <Group justify="space-between" mt={6} mb="md">
              <Group gap={4}><Sparkles size={12} color="var(--mantine-color-brand-6)" /><Text size="xs" c="navy.5">{t.studioPage.brief.nudge}</Text></Group>
              <Text size="xs" c="navy.5">{t.studioPage.brief.counter(briefValue.length)}</Text>
            </Group>
            <Select label={t.studioPage.brief.formatLabel} description={t.studioPage.brief.formatNote} id="format" value={format} allowDeselect={false}
              data={formats.map(f => ({ value: f, label: t.formats[f] }))} onChange={v => v && setFormat(v as Format)}
              rightSection={<Text size="xs" c="navy.5" fw={700}>{format === 'Instagram Story' ? '9:16' : format === 'Web Hero' ? '2:1' : '1:1'}</Text>} rightSectionWidth={44} />
            <Alert mt="md" variant="light" color="brand" icon={<Sparkles size={16} />} title={t.studioPage.brief.agentTitle}>{t.studioPage.brief.agentBody}</Alert>
            {error && <Alert mt="md" color="red" role="alert" data-testid="error-message">{error}</Alert>}
            <Group justify="space-between" mt="lg" wrap="wrap">
              <Group gap={6}><LiveDot /><Text size="xs" fw={700} c="navy.5" style={{ letterSpacing: '0.1em' }}>{t.studioPage.brief.mockLabel}</Text></Group>
              <Button size="md" loading={busy} disabled={briefValue.trim().length < 20 || !assets.length} onClick={() => void generate()}
                leftSection={<Sparkles size={16} />} rightSection={<ArrowRight size={16} />}>{busy ? t.studioPage.brief.generating : t.studioPage.brief.generate}</Button>
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 3.5 }}>
          <Paper h="100%">
            <PanelTitle aside={<ShieldCheck size={16} color="var(--mantine-color-navy-5)" />}>{t.studioPage.compliance.title}</PanelTitle>
            <ThemeIcon size={48} radius="md" variant="light" color="brand" mb="sm"><ShieldCheck size={24} /></ThemeIcon>
            <Title order={3} mb={4}>{generated ? t.studioPage.compliance.headingDone : t.studioPage.compliance.headingIdle}</Title>
            <Text size="sm" c="navy.6" mb="md">{generated ? t.studioPage.compliance.introDone : t.studioPage.compliance.introIdle}</Text>
            <Stack gap="xs">{checks.map(([name, description]) => <RuleItem key={name} name={name} description={description} />)}</Stack>
            <Divider my="md" />
            <Group gap={6}><LiveDot /><Text size="xs" c="navy.5" fw={600}>{generated ? t.studioPage.compliance.doneFooter(approved, variations.length) : t.studioPage.compliance.idleFooter}</Text></Group>
          </Paper>
        </Grid.Col>
      </Grid>

      <Group justify="space-between" align="flex-end" mb="md" wrap="wrap">
        <Box>
          <Title order={2} fz="1.4rem">{t.studioPage.results.title} <Text span c="brand.6">{variations.length.toString().padStart(2, '0')}</Text></Title>
          <Text size="sm" c="navy.6">{generated ? t.studioPage.results.subtitleDone : t.studioPage.results.subtitleIdle}</Text>
        </Box>
        <Group gap={6}><LiveDot /><Text size="xs" c="navy.5" fw={600}>{variations.length ? t.studioPage.results.statusDone(approved) : t.studioPage.results.statusIdle}</Text></Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ opacity: busy ? 0.5 : 1, transition: 'opacity .2s' }}>
        {variations.map((variation, index) => (
          <Card key={variation.id} withBorder radius="lg" padding="md" shadow="sm" data-testid="variation-card">
            <Card.Section pos="relative" style={{ background: 'var(--mantine-color-navy-0)' }}>
              <Badge pos="absolute" top={10} left={10} variant="white" color="navy" size="xs" fw={800} style={{ zIndex: 1 }}>{t.studioPage.results.direction(index + 1)}</Badge>
              {variation.svg
                ? <SvgPreview svg={variation.svg} alt={variation.spec.headline} height={260} />
                : <Center mih={260} p="lg"><Stack align="center" gap={4}><ShieldCheck size={28} color="var(--mantine-color-red-7)" /><Text fw={700}>{t.studioPage.results.blockedTitle}</Text><Text size="xs" c="navy.5" ta="center">{t.studioPage.results.blockedBody}</Text></Stack></Center>}
              <Tooltip label={t.studioPage.results.inspect}>
                <ActionIcon pos="absolute" bottom={10} right={10} variant="white" color="navy" onClick={() => setSelected(variation)} aria-label={t.studioPage.results.inspectAria(index + 1)}><Maximize2 size={14} /></ActionIcon>
              </Tooltip>
            </Card.Section>
            <Group justify="space-between" mt="md" wrap="nowrap">
              <Box style={{ minWidth: 0 }}>
                <Text fw={700} lineClamp={1}>{t.studioPage.results.names[index] ?? variation.spec.headline}</Text>
                <Text size="xs" c="navy.5">{templateLabel(t, { name: variation.templateName, nameKey: variation.templateNameKey })} · {t.formats[variation.format]}</Text>
              </Box>
              <Badge color={variation.compliance.approved ? 'teal' : 'red'} variant="light" leftSection={<ShieldCheck size={11} />} data-testid="compliance-badge">{variation.compliance.percentage}%</Badge>
            </Group>
            <Group justify="space-between" mt="sm">
              <Button variant="subtle" size="xs" color="navy" leftSection={<Workflow size={13} />} onClick={() => setSelected(variation)}>{t.studioPage.results.inspect}</Button>
              <Group gap={4}>
                {(['svg', 'png'] as const).map(kind => (
                  <Button key={kind} variant="default" size="xs" disabled={!variation.compliance.approved || Boolean(exporting)} loading={exporting === variation.id + kind}
                    leftSection={<ArrowDownToLine size={12} />} onClick={() => void download(variation.id, kind)}>{kind.toUpperCase()}</Button>
                ))}
              </Group>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
      {!variations.length && <Center mih={200}><Stack align="center" gap={4}><Layers /><Title order={3}>{t.studioPage.results.emptyTitle}</Title><Text c="navy.6">{t.studioPage.results.emptyBody}</Text></Stack></Center>}

      <Group justify="space-between" mt="xl" wrap="wrap">
        <Group gap={6}><Lock size={13} color="var(--mantine-color-navy-5)" /><Text size="xs" c="navy.5">{t.studioPage.footnote}</Text></Group>
        <Anchor component={Link} href="/architecture" size="xs" fw={700}>{t.studioPage.exploreEngine} →</Anchor>
      </Group>
      <Inspect variation={selected} onClose={() => setSelected(null)} />
    </>
  );
}
