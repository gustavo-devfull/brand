'use client';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useI18n } from '@/components/ui/locale';
export default function Loading(){
  const {t}=useI18n();
  return <Center mih={320}><Stack align="center" gap="sm"><Loader color="brand"/><Text c="dimmed" size="sm">{t.loadingPage}</Text></Stack></Center>;
}
