'use client';
import Link from 'next/link';
import { Anchor, Box, Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Timeline, Title } from '@mantine/core';
import { ArrowRight, Braces, Database, FileCheck2, Image as ImageIcon, Lock, Ruler, ShieldCheck, Sparkles, Type } from 'lucide-react';
import { useI18n } from '@/components/ui/locale';
import { PageHeading, PanelTitle, RuleItem, SectionNumber } from '@/components/ui/blocks';

const stageIcons = [Database, Sparkles, FileCheck2, Ruler, ShieldCheck];
const guaranteeIcons = [Lock, Type, ImageIcon, Braces];

export function ArchitectureOverview() {
  const { t } = useI18n();
  return (
    <>
      <PageHeading eyebrow={t.architecture.eyebrow} lead={t.architecture.titleLead} em={t.architecture.titleEm} subtitle={t.architecture.subtitle}
        action={<Button component={Link} href="/campaigns" leftSection={<Sparkles size={15} />} rightSection={<ArrowRight size={15} />}>{t.architecture.openStudio}</Button>} />

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg" mb="lg">
        {t.architecture.stages.map((stage, index) => {
          const Icon = stageIcons[index];
          return (
            <Paper key={stage.title} data-testid="stage-card">
              <Group gap="sm" align="flex-start" mb="sm">
                <ThemeIcon size={38} radius="md" variant="light" color="brand"><Icon size={18} /></ThemeIcon>
                <Box><SectionNumber>0{index + 1}</SectionNumber><Title order={3} mt={4} fz="1.15rem">{stage.title}</Title></Box>
              </Group>
              <Text size="sm" c="navy.6" lh={1.65} mb="md">{stage.body}</Text>
              <Stack gap={6} pt="md" style={{ borderTop: '1px solid var(--mantine-color-navy-1)' }}>
                {stage.points.map(point => <Group key={point} gap="sm" wrap="nowrap"><ThemeIcon size="sm" radius="sm" variant="light" color="teal"><ShieldCheck size={11} /></ThemeIcon><Text size="sm" c="navy.6">{point}</Text></Group>)}
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>

      <Paper mb="lg" data-testid="flow-panel">
        <PanelTitle aside={<SectionNumber>{t.architecture.flow.badge}</SectionNumber>}>{t.architecture.flow.title}</PanelTitle>
        <Timeline active={t.architecture.flow.steps.length} bulletSize={26} lineWidth={2} color="brand">
          {t.architecture.flow.steps.map((step, i) => (
            <Timeline.Item key={step} bullet={<Text size="xs" fw={800}>{i + 1}</Text>} title={<Text fw={700}>{step}</Text>} data-testid="flow-node" />
          ))}
        </Timeline>
        <Text size="sm" c="navy.6" mt="md">{t.architecture.flow.note}</Text>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="lg">
        {t.architecture.guarantees.map((guarantee, index) => {
          const Icon = guaranteeIcons[index];
          return (
            <Paper key={guarantee.title} data-testid="guarantee-card">
              <ThemeIcon size={38} radius="md" variant="light" color="brand" mb="sm"><Icon size={18} /></ThemeIcon>
              <Title order={3} fz="1rem" mb={6}>{guarantee.title}</Title>
              <Text size="sm" c="navy.6" lh={1.6}>{guarantee.body}</Text>
            </Paper>
          );
        })}
      </SimpleGrid>

      <Group justify="space-between" wrap="wrap">
        <Group gap={6}><Lock size={13} color="var(--mantine-color-navy-5)" /><Text size="xs" c="navy.5">{t.architecture.footnote}</Text></Group>
        <Anchor component={Link} href="/templates" size="xs" fw={700}>{t.architecture.inspectTemplate} →</Anchor>
      </Group>
    </>
  );
}
