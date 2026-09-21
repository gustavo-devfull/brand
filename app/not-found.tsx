'use client';
import Link from 'next/link';
import { Button, Center, Stack, Title } from '@mantine/core';
import { useI18n } from '@/components/ui/locale';
import { Eyebrow } from '@/components/ui/blocks';
export default function NotFound(){
  const {t}=useI18n();
  return <Center mih={320}><Stack align="center" gap="sm"><Eyebrow line={false}>{t.notFound.eyebrow}</Eyebrow><Title order={1}>{t.notFound.title}</Title><Button component={Link} href="/" variant="light">{t.notFound.action}</Button></Stack></Center>;
}
