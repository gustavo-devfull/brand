import { ZodError } from 'zod';
import { en as zodEn, ptBR as zodPtBR } from 'zod/locales';
import { cookies } from 'next/headers';
import { AppError, describe, fail } from './errors';
import { dictionary, localeCookie, parseLocale, type Locale } from './i18n';

export async function requestLocale():Promise<Locale>{
  return parseLocale((await cookies()).get(localeCookie)?.value);
}

// Reconstrói a mensagem do issue com o mapa do idioma pedido, em vez de mexer na
// configuração global do Zod — que é compartilhada entre requisições concorrentes.
const zodMessage=(locale:Locale)=>{
  const map=(locale==='pt'?zodPtBR():zodEn()).localeError;
  return (issue:ZodError['issues'][number])=>{
    const translated=map(issue as Parameters<typeof map>[0]);
    return typeof translated==='string'?translated:issue.message;
  };
};

export async function apiError(error:unknown){
  const locale=await requestLocale().catch(()=>parseLocale(undefined));
  const t=dictionary(locale);
  const message=error instanceof AppError?describe(t,error)
    :error instanceof ZodError?error.issues.map(i=>`${i.path.join('.')}: ${zodMessage(locale)(i)}`).join('; ')
    :error instanceof Error?error.message
    :t.errors.unexpected();
  return Response.json({error:message},{status:400});
}

/**
 * Defesa contra CSRF: um site de terceiros manda o Origin dele, que nunca bate com o
 * host pelo qual o app foi acessado.
 *
 * A comparação é com o cabeçalho `Host`, não com `new URL(request.url).origin`: o Next
 * deriva aquela origem por conta própria, então acessar o app por um endereço que ele
 * não resolveu — `localhost` enquanto ele escuta em `0.0.0.0`, ou atrás de um proxy —
 * recusaria toda escrita.
 */
export function checkOrigin(request:Request){
  const origin=request.headers.get('origin');
  if(!origin)return; // Requisições same-origin de navegação e clientes não-browser.
  const host=request.headers.get('host');
  let sent:string;
  try{sent=new URL(origin).host;}catch{throw fail('crossOrigin');}
  if(!host||sent!==host)throw fail('crossOrigin');
}

export async function jsonBody(request:Request){
  checkOrigin(request);
  const body=await request.text();
  if(body.length>200000)throw fail('requestTooLarge');
  return JSON.parse(body) as unknown;
}
