'use client';
import Link from 'next/link';
import { useI18n } from '@/components/ui/locale';
export default function NotFound(){
  const {t}=useI18n();
  return <div className="empty-state"><span className="eyebrow">{t.notFound.eyebrow}</span><h1>{t.notFound.title}</h1><Link className="button" href="/">{t.notFound.action}</Link></div>;
}
