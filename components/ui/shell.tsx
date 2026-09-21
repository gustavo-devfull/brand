'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell, Avatar, Badge, Box, Burger, Divider, Group, NavLink, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ArrowUpRight, Boxes, Command, LayoutDashboard, Layers, PanelTop, ShieldCheck, Workflow } from 'lucide-react';
import { useWorkspace } from './workspace';
import { useI18n, LocaleToggle } from './locale';
import { LiveDot } from './blocks';

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cloud } = useWorkspace();
  const { t } = useI18n();
  const [opened, { toggle, close }] = useDisclosure(false);

  const links = [
    { href: '/dashboard', label: t.nav.overview, icon: LayoutDashboard },
    { href: '/brands', label: t.nav.brands, icon: Boxes },
    { href: '/campaigns', label: t.nav.campaigns, icon: Layers, badge: '↗' },
    { href: '/templates', label: t.nav.templates, icon: PanelTop },
  ];
  const active = (href: string) => pathname === href || (href === '/campaigns' && pathname === '/');
  const crumb = pathname === '/brands' ? t.nav.brands : pathname === '/templates' ? t.nav.templates
    : pathname === '/architecture' ? t.nav.architecture : pathname === '/dashboard' ? t.nav.overview : t.topbar.campaignStudio;

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      footer={{ height: 44 }}
      padding="lg"
      styles={{ main: { background: 'transparent' }, header: { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }, navbar: { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }, footer: { background: 'transparent' } }}
    >
      <AppShell.Header px="lg">
        <Group h="100%" justify="space-between">
          <Group gap="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text size="sm" c="navy.5" tt="uppercase" fw={600} style={{ letterSpacing: '0.08em' }}>
              {t.topbar.root} <Text span c="navy.3">/</Text> <Text span c="navy.9" fw={800}>{crumb}</Text>
            </Text>
          </Group>
          <Group gap="sm">
            <Badge variant="light" color={cloud ? 'teal' : 'brand'} size="lg" leftSection={<LiveDot />} fw={800} style={{ letterSpacing: '0.08em' }} data-testid="workspace-mode">
              {cloud ? t.topbar.connected : t.topbar.demo}
            </Badge>
            <LocaleToggle />
            <Tooltip label={t.topbar.viewArchitecture}>
              <UnstyledButton component={Link} href="/architecture" aria-label={t.topbar.viewArchitecture}>
                <ThemeIcon variant="default" size="lg" radius="md"><Workflow size={16} /></ThemeIcon>
              </UnstyledButton>
            </Tooltip>
            <Avatar radius="md" color="brand" size="md">ST</Avatar>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <UnstyledButton component={Link} href="/" onClick={close} mb="lg">
          <Group gap="sm">
            <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'brand.5', to: 'brand.3', deg: 135 }}><Command size={20} /></ThemeIcon>
            <Box>
              <Text fw={800} size="lg" lh={1} style={{ letterSpacing: '-0.03em' }}>brand<Text span fw={400}>engine</Text></Text>
              <Text size="xs" c="navy.5" fw={700} style={{ letterSpacing: '0.14em' }}>{t.nav.wordmarkTag}</Text>
            </Box>
          </Group>
        </UnstyledButton>

        <Group gap="sm" p="sm" mb="lg" style={{ border: '1px solid var(--mantine-color-navy-1)', borderRadius: 'var(--mantine-radius-md)', background: 'white' }}>
          <Avatar size="sm" radius="sm" color="brand" variant="light">S</Avatar>
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={700} lh={1.2}>{t.nav.workspaceName}</Text>
            <Text size="xs" c="navy.5">{t.nav.workspaceKind}</Text>
          </Box>
        </Group>

        <Text size="xs" fw={700} c="navy.4" tt="uppercase" mb={6} style={{ letterSpacing: '0.16em' }}>{t.nav.caption}</Text>
        <Stack gap={4} component="nav" aria-label={t.nav.caption}>
          {links.map(({ href, label, icon: Icon, badge }) => (
            <NavLink key={href} component={Link} href={href} label={label} active={active(href)} onClick={close}
              leftSection={<Icon size={18} />} rightSection={badge && <Text size="xs" c="brand.6" fw={800}>{badge}</Text>}
              variant="light" color="brand" style={{ borderRadius: 'var(--mantine-radius-md)' }} fw={600} />
          ))}
        </Stack>

        <Box mt="auto">
          <NavLink component={Link} href="/architecture" label={t.nav.architecture} active={pathname === '/architecture'} onClick={close}
            leftSection={<Workflow size={18} />} rightSection={<ArrowUpRight size={14} />} variant="light" color="brand" style={{ borderRadius: 'var(--mantine-radius-md)' }} fw={600} />
          <Divider my="md" />
          <Group gap="sm" wrap="nowrap" mb="md">
            <LiveDot />
            <Box>
              <Text size="sm" fw={600} lh={1.2}>{t.nav.systemNoteTitle}</Text>
              <Text size="xs" c="navy.5">{t.nav.systemNoteSubtitle}</Text>
            </Box>
          </Group>
          <Group gap="sm">
            <Avatar radius="md" color="navy" variant="filled" size="md">ST</Avatar>
            <Box>
              <Text size="sm" fw={700} lh={1.2}>{t.nav.profileName}</Text>
              <Text size="xs" c="navy.5">{t.nav.profileRole}</Text>
            </Box>
          </Group>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>

      <AppShell.Footer px="lg" withBorder={false}>
        <Group h="100%" justify="space-between">
          <Group gap={6}><ShieldCheck size={13} color="var(--mantine-color-navy-5)" /><Text size="xs" c="navy.5">{t.footer.tagline}</Text></Group>
          <Text size="xs" c="navy.5" fw={700} style={{ letterSpacing: '0.1em' }}>{t.footer.product} / V1.0</Text>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
