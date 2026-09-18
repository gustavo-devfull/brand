import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ArchitectureOverview } from '@/components/architecture/overview';
import { dictionary,localeCookie,parseLocale } from '@/lib/i18n';

export async function generateMetadata():Promise<Metadata>{
  const t=dictionary(parseLocale((await cookies()).get(localeCookie)?.value));
  return {title:t.architecture.metadataTitle,description:t.architecture.metadataDescription};
}

export default function Architecture(){return <ArchitectureOverview/>;}
