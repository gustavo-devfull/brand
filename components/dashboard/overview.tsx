'use client';
import Link from 'next/link';
import { Anchor, Badge, Box, Button, Card, Center, Divider, Grid, Group, Paper, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, UnstyledButton } from '@mantine/core';
import { ArrowRight, Boxes, Check, Layers, PanelTop, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { useWorkspace, Loading } from '@/components/ui/workspace';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { LiveDot, MiniLabel, PageHeading, PanelTitle, SectionNumber } from '@/components/ui/blocks';
import { Swatch } from '@/components/ui/swatch/Swatch';
import { ruleText } from '@/lib/i18n/format';
import type { RuleId } from '@/types';

export function Overview() {
  const { workspace, cloud } = useWorkspace();
  const { t } = useI18n();
  if (!workspace) return <Loading />;

  const variations = workspace.campaigns.flatMap(c => c.variations);
  const approved = variations.filter(v => v.compliance.approved);
  const rate = variations.length ? Math.round(approved.length / variations.length * 100) : 0;
  const byRule = new Map<RuleId, { name: string; pass: number; total: number }>();
  for (const rule of variations.flatMap(v => v.compliance.rules)) {
    const entry = byRule.get(rule.ruleId) ?? { name: ruleText(t, rule).name, pass: 0, total: 0 };
    entry.total++; if (rule.status === 'pass') entry.pass++; byRule.set(rule.ruleId, entry);
  }
  const ruleRows = [...byRule.entries()].sort((a, b) => a[1].pass / a[1].total - b[1].pass / b[1].total);
  const stats = [
    { label: t.overview.stats.brands, value: workspace.brands.length, hint: t.overview.stats.brandsHint, icon: Boxes, href: '/brands' },
    { label: t.overview.stats.templates, value: workspace.templates.length, hint: t.overview.stats.templatesHint, icon: PanelTop, href: '/templates' },
    { label: t.overview.stats.campaigns, value: workspace.campaigns.length, hint: t.overview.stats.campaignsHint, icon: Layers, href: '/campaigns' },
    { label: t.overview.stats.approved, value: approved.length, hint: t.overview.stats.approvedHint(variations.length), icon: ShieldCheck, href: '/campaigns' },
  ];
  const recent = [...workspace.campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <>
      <PageHeading eyebrow={t.overview.eyebrow} lead={t.overview.titleLead} em={t.overview.titleEm} subtitle={t.overview.subtitle}
        action={<Button component={Link} href="/campaigns" leftSection={<Sparkles size={15} />} rightSection={<ArrowRight size={15} />}>{t.overview.newCampaign}</Button>} />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="lg">
        {stats.map(({ label, value, hint, icon: Icon, href }) => (
          <UnstyledButton key={label} component={Link} href={href} data-testid="stat-card">
            <Paper h="100%" style={{ transition: 'transform .2s, box-shadow .2s' }}>
              <ThemeIcon size={38} radius="md" variant="light" color="brand" mb="sm"><Icon size={18} /></ThemeIcon>
              <Text fz="2.2rem" fw={800} lh={1} style={{ letterSpacing: '-0.05em' }}>{value.toString().padStart(2, '0')}</Text>
              <Text size="xs" fw={700} tt="uppercase" c="navy.6" mt={4} style={{ letterSpacing: '0.12em' }}>{label}</Text>
              <Text size="xs" c="navy.5">{hint}</Text>
            </Paper>
          </UnstyledButton>
        ))}
      </SimpleGrid>

      <Grid gap="lg" mb="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper h="100%">
            <PanelTitle aside={<ShieldCheck size={16} color="var(--mantine-color-navy-5)" />}>{t.overview.health.title}</PanelTitle>
            <Progress value={rate} color="teal" size="lg" radius="xl" aria-label={t.overview.health.gaugeAria(rate)} />
            <Group align="baseline" gap="sm" mt="sm" mb="md">
              <Text fz="2rem" fw={800} lh={1} style={{ letterSpacing: '-0.04em' }}>{rate}%</Text>
              <Text size="sm" c="navy.6">{t.overview.health.gaugeCaption(approved.length, variations.length)}</Text>
            </Group>
            <MiniLabel aside={<Text size="xs" c="navy.5" fw={700}>{t.overview.health.ruleCount(ruleRows.length)}</Text>}>{t.overview.health.rulePerformance}</MiniLabel>
            {ruleRows.length ? (
              <Stack gap="sm">
                {ruleRows.map(([id, rule]) => {
                  const percent = Math.round(rule.pass / rule.total * 100);
                  return (
                    <Group key={id} gap="sm" wrap="nowrap" data-testid="rule-bar">
                      <ThemeIcon size="sm" radius="sm" variant="light" color={percent === 100 ? 'teal' : 'yellow'}>{percent === 100 ? <Check size={12} /> : <TriangleAlert size={12} />}</ThemeIcon>
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" fw={600} mb={4}>{rule.name}</Text>
                        <Progress value={percent} color={percent === 100 ? 'teal' : 'yellow'} size="xs" radius="xl" />
                      </Box>
                      <Text size="xs" c="navy.5" w={40} ta="right">{rule.pass}/{rule.total}</Text>
                    </Group>
                  );
                })}
              </Stack>
            ) : <Text size="sm" c="navy.5">{t.overview.health.empty}</Text>}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper h="100%">
            <PanelTitle aside={<SectionNumber>{recent.length.toString().padStart(2, '0')}</SectionNumber>}>{t.overview.recent.title}</PanelTitle>
            {recent.length ? (
              <Stack gap="sm">
                {recent.map(campaign => {
                  const brand = workspace.brands.find(b => b.id === campaign.brandId);
                  const ok = campaign.variations.filter(v => v.compliance.approved).length;
                  return (
                    <Group key={campaign.id} gap="md" wrap="nowrap" p="sm" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)' }}>
                      <Group gap={0}>{campaign.variations.slice(0, 3).map(v => (
                        <Box key={v.id} w={38} h={38} mr={-10} style={{ borderRadius: 10, overflow: 'hidden', border: '2px solid white', background: 'var(--mantine-color-navy-1)' }}>
                          {v.svg ? <SvgPreview svg={v.svg} alt={v.spec.headline} height={38} /> : <Center h="100%"><ShieldCheck size={14} color="var(--mantine-color-red-7)" /></Center>}
                        </Box>))}</Group>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={700} lineClamp={1}>{campaign.name}</Text>
                        <Text size="xs" c="navy.5">{brand?.name ?? t.overview.recent.unknownBrand} · {t.formats[campaign.format]} · {new Date(campaign.createdAt).toLocaleDateString(t.htmlLang)}</Text>
                      </Box>
                      <Badge variant="light" color={ok === campaign.variations.length ? 'teal' : 'red'} leftSection={<ShieldCheck size={11} />}>{ok}/{campaign.variations.length}</Badge>
                    </Group>
                  );
                })}
              </Stack>
            ) : (
              <Center py="xl"><Stack align="center" gap={4}><Layers /><Title order={3}>{t.overview.recent.emptyTitle}</Title><Text size="sm" c="navy.6">{t.overview.recent.emptyBody}</Text><Button component={Link} href="/campaigns" variant="light" mt="sm">{t.overview.recent.openStudio}</Button></Stack></Center>
            )}
            <Divider my="md" />
            <Group gap={6}><LiveDot /><Text size="xs" c="navy.5" tt="uppercase" fw={600} style={{ letterSpacing: '0.08em' }}>{cloud ? t.workspace.modeCloud : t.workspace.modeLocal}</Text></Group>
          </Paper>
        </Grid.Col>
      </Grid>

      <Paper>
        <PanelTitle aside={<Anchor component={Link} href="/brands" size="xs" fw={700}>{t.overview.roster.manage} →</Anchor>}>{t.overview.roster.title}</PanelTitle>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} spacing="md">
          {workspace.brands.map(brand => {
            const assets = workspace.assets.filter(a => a.brandId === brand.id).length;
            const templates = workspace.templates.filter(tpl => tpl.brandId === brand.id).length;
            return (
              <Card key={brand.id} component={Link} href="/brands" withBorder radius="md" padding="md" shadow="none" style={{ background: 'var(--mantine-color-navy-0)' }} data-testid="roster-card">
                <Box h={52} mb="xs"><SvgPreview svg={brand.logoSvg} alt={brand.name} height={46} /></Box>
                <Text fw={700}>{brand.name}</Text>
                <Group gap={5} my={6}>{[...new Set(Object.values(brand.tokens.colors).flat())].slice(0, 6).map(c => <Swatch key={c} color={c} variant="dot" size={16} withLabel={false} />)}</Group>
                <Text size="xs" c="navy.5">{t.overview.roster.counts(templates, assets)}</Text>
              </Card>
            );
          })}
        </SimpleGrid>
      </Paper>
    </>
  );
}
