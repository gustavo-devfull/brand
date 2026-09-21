'use client';
import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { useI18n } from '@/components/ui/locale';
export default function ErrorPage({reset}:{reset:()=>void}){
  const {t}=useI18n();
  return <Center mih={320}><Stack align="center" gap="sm"><Title order={2}>{t.errorPage.title}</Title><Text c="dimmed">{t.errorPage.body}</Text><Button variant="light" onClick={reset}>{t.common.tryAgain}</Button></Stack></Center>;
}
