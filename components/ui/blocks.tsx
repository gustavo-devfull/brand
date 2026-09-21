'use client';
import type { ReactNode } from 'react';
import { Badge, Box, Group, Stack, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { Check, Lock, TriangleAlert } from 'lucide-react';

/** Rótulo pequeno em caixa alta, com o traço laranja à esquerda. */
export function Eyebrow({ children, line = true }: { children: ReactNode; line?: boolean }) {
  return (
    <Group gap={8} mb={12}>
      {line && <Box w={18} h={2} bg="brand.5" style={{ borderRadius: 2 }} />}
      <Text size="xs" fw={700} tt="uppercase" c="navy.6" style={{ letterSpacing: '0.18em' }}>{children}</Text>
    </Group>
  );
}

/** Cabeçalho de página: eyebrow, título com destaque serifado, subtítulo e ação à direita. */
export function PageHeading({ eyebrow, lead, em, subtitle, action }: { eyebrow: string; lead: string; em: string; subtitle: string; action?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap" gap="md">
      <Box maw={720}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Title order={1} style={{ letterSpacing: '-0.05em' }}>{lead} <span className="serif-em">{em}</span></Title>
        <Text c="navy.6" mt="sm">{subtitle}</Text>
      </Box>
      {action && <Group gap="sm">{action}</Group>}
    </Group>
  );
}

/** Título de painel com um detalhe à direita (número de seção, ícone, contagem). */
export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <Group justify="space-between" mb="md">
      <Text size="sm" fw={700} tt="uppercase" c="navy.6" style={{ letterSpacing: '0.14em' }}>{children}</Text>
      {aside}
    </Group>
  );
}

/** Rótulo de subseção dentro de um painel. */
export function MiniLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <Group justify="space-between" mt="md" mb={8}>
      <Text size="xs" fw={700} tt="uppercase" c="navy.5" style={{ letterSpacing: '0.12em' }}>{children}</Text>
      {aside}
    </Group>
  );
}

export function SectionNumber({ children }: { children: ReactNode }) {
  return <Badge variant="light" color="brand" size="sm" fw={800}>{children}</Badge>;
}

/** Linha de regra: ícone de estado, nome, descrição e o cadeado de "protegido". */
export function RuleItem({ name, description, status = 'pass', locked = true }: { name: string; description?: string; status?: 'pass' | 'warning' | 'fail'; locked?: boolean }) {
  const color = status === 'pass' ? 'teal' : status === 'warning' ? 'yellow' : 'red';
  const Icon = status === 'pass' ? Check : TriangleAlert;
  return (
    <Group gap="sm" wrap="nowrap" p="sm" style={{ background: 'var(--mantine-color-navy-0)', borderRadius: 'var(--mantine-radius-md)' }}>
      <ThemeIcon size="md" radius="sm" variant="light" color={color}><Icon size={13} /></ThemeIcon>
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={600} lineClamp={1}>{name}</Text>
        {description && <Text size="xs" c="navy.5">{description}</Text>}
      </Stack>
      {locked && <Tooltip label="Protegido"><Lock size={12} color="var(--mantine-color-navy-4)" /></Tooltip>}
    </Group>
  );
}

/** Ponto verde pulsante de "sistema ativo". */
export function LiveDot() {
  return <Box w={8} h={8} bg="teal.5" style={{ borderRadius: 999, boxShadow: '0 0 0 4px rgba(20, 184, 120, 0.14)' }} />;
}
