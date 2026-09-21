'use client';
import { useState } from 'react';
import { Accordion, Badge, Box, Button, Grid, Group, Modal, Paper, Stack, Text, Title } from '@mantine/core';
import { Copy, Lock } from 'lucide-react';
import type { Variation } from '@/types';
import { SvgPreview } from '@/components/ui/preview';
import { useI18n } from '@/components/ui/locale';
import { Eyebrow, RuleItem } from '@/components/ui/blocks';
import { ruleText, templateLabel, rationaleText } from '@/lib/i18n/format';

export function Inspect({ variation, onClose }: { variation: Variation | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  if (!variation) return <Modal opened={false} onClose={onClose} />;

  const decisions: [string, string][] = [
    [t.inspect.fields.template, templateLabel(t, { name: variation.templateName, nameKey: variation.templateNameKey })],
    [t.inspect.fields.image, variation.imageName],
    [t.inspect.fields.headline, variation.spec.headline],
    [t.inspect.fields.cta, variation.spec.cta],
    [t.inspect.fields.alignment, t.alignments[variation.spec.alignment]],
    [t.inspect.fields.theme, t.themes[variation.spec.theme]],
  ];

  return (
    <Modal opened onClose={onClose} size="xl" title={<Box><Eyebrow>{t.inspect.eyebrow}</Eyebrow><Title order={2} fz="1.5rem">{t.inspect.title}</Title></Box>}
      closeButtonProps={{ 'aria-label': t.common.close }} data-testid="inspect-dialog">
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          {variation.svg ? <SvgPreview svg={variation.svg} alt={variation.spec.headline} height={360} /> : <Text c="red">{t.inspect.blocked}</Text>}
          <Group gap={6} mt="sm" p="sm" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)' }} data-testid="protected-note">
            <Lock size={14} color="var(--mantine-color-navy-5)" /><Text size="sm" fw={600} c="navy.6">{t.inspect.protectedNote(variation.compliance.protectedElementsModified)}</Text>
          </Group>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Eyebrow>{t.inspect.decisionsEyebrow}</Eyebrow>
          <Stack gap={0} mb="md">
            {decisions.map(([key, value]) => (
              <Group key={key} justify="space-between" py={8} wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-navy-1)' }}>
                <Text size="xs" c="navy.5" tt="uppercase" fw={700} style={{ letterSpacing: '0.1em', flex: '0 0 120px' }}>{key}</Text>
                <Text size="sm" fw={600} ta="right" style={{ overflowWrap: 'anywhere' }}>{value}</Text>
              </Group>
            ))}
          </Stack>
          <Paper p="md" mb="md" shadow="none" withBorder={false} style={{ background: 'var(--mantine-color-navy-0)' }}>
            <Eyebrow>{t.inspect.whyEyebrow}</Eyebrow>
            <Text size="sm" c="navy.7" lh={1.6}>{rationaleText(t, variation)}</Text>
          </Paper>
          <Accordion variant="contained" radius="md" mb="md">
            <Accordion.Item value="spec">
              <Accordion.Control><Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }}>{t.inspect.viewSpec}</Text></Accordion.Control>
              <Accordion.Panel>
                <pre className="code-block">{JSON.stringify(variation.spec, null, 2)}</pre>
                <Button mt="sm" variant="subtle" size="xs" leftSection={<Copy size={13} />}
                  onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(variation.spec, null, 2)); setCopied(true); } catch { setCopied(false); } }}>
                  {copied ? t.common.copied : t.common.copyJson}
                </Button>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={700} tt="uppercase" c="navy.6" style={{ letterSpacing: '0.1em' }}>{t.inspect.rulesTitle}</Text>
            <Badge variant="light" color={variation.compliance.approved ? 'teal' : 'red'}>{t.inspect.compliant(variation.compliance.percentage)}</Badge>
          </Group>
          <Stack gap="xs">
            {variation.compliance.rules.map(rule => { const text = ruleText(t, rule); return <Box key={rule.ruleId} data-testid="rule-detail" data-status={rule.status}><RuleItem name={text.name} description={text.message} status={rule.status} locked={false} /></Box>; })}
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}
