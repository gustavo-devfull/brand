import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { cookies } from 'next/headers';
import { WorkspaceProvider } from '@/components/ui/workspace';
import { LocaleProvider } from '@/components/ui/locale';
import { Shell } from '@/components/ui/shell';
import { dictionary,localeCookie,parseLocale } from '@/lib/i18n';
import './globals.css';

// Auto-hospedada no build: nenhuma requisição a servidores de fonte em runtime.
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-ui' });

// Ler o idioma no servidor evita um flash de tradução; em troca, as páginas passam
// a ser renderizadas sob demanda em vez de pré-geradas.
export async function generateMetadata():Promise<Metadata>{
  const t=dictionary(parseLocale((await cookies()).get(localeCookie)?.value));
  return {title:t.metadata.title,description:t.metadata.description};
}

export default async function RootLayout({children}:{children:React.ReactNode}){
  const locale=parseLocale((await cookies()).get(localeCookie)?.value);
  return <html lang={dictionary(locale).htmlLang} className={manrope.variable}><body>
    <LocaleProvider initialLocale={locale}><WorkspaceProvider><Shell>{children}</Shell></WorkspaceProvider></LocaleProvider>
  </body></html>;
}
