'use client';
import { useI18n } from '@/components/ui/locale';
export default function ErrorPage({reset}:{reset:()=>void}){
  const {t}=useI18n();
  return <div className="empty-state"><h1>{t.errorPage.title}</h1><p>{t.errorPage.body}</p><button className="button" onClick={reset}>{t.common.tryAgain}</button></div>;
}
