'use client';
import { useI18n } from '@/components/ui/locale';
export default function Loading(){
  const {t}=useI18n();
  return <div className="empty-state"><div className="spinner"/>{t.loadingPage}</div>;
}
