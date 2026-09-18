/**
 * Verifica uma conexão Supabase de ponta a ponta com as mesmas credenciais que o app
 * usa: a publishable key e um usuário anônimo. Nada de service-role — se o RLS estiver
 * errado, este script precisa sentir isso do mesmo jeito que um visitante sentiria.
 *
 *   npm run supabase:verify
 *
 * Cria dois usuários anônimos descartáveis e apaga as linhas que criou. Os dois
 * usuários permanecem em auth.users (removê-los exigiria a service-role key).
 */
import { readFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const tables = ['brands', 'brand_tokens', 'brand_rules', 'brand_assets', 'brand_fonts', 'templates', 'campaigns', 'creative_specs', 'generated_assets'] as const;
const bucket = 'brand-assets';
// O mesmo id fixo do workspace demo: é justamente ele que colide entre inquilinos.
const sharedBrandId = '10000000-0000-4000-8000-000000000001';

let failures = 0;
const pass = (label: string, detail = '') => console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
const fail = (label: string, detail: string) => { failures++; console.log(`  ✗ ${label}\n      ${detail}`); };
const section = (label: string) => console.log(`\n${label}`);

async function env() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = await readFile(file, 'utf8');
      const values = new Map<string, string>();
      for (const line of raw.split('\n')) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (match) values.set(match[1], match[2].trim().replace(/^["']|["']$/g, ''));
      }
      const url = values.get('NEXT_PUBLIC_SUPABASE_URL');
      const key = values.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      if (url && key) return { url, key, file };
    } catch { /* tenta o próximo arquivo */ }
  }
  return null;
}

async function signIn(url: string, key: string) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw new Error(error.message);
  return { client, userId: data.user!.id };
}

async function main() {
  console.log('Verificando a conexão Supabase\n' + '─'.repeat(52));

  const config = await env();
  if (!config) {
    console.log('\n✗ Não encontrei NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local.');
    console.log('  Copie .env.example para .env.local e preencha os dois valores.');
    process.exit(1);
  }
  section(`Credenciais (${config.file})`);
  pass('URL do projeto', config.url);
  pass('Publishable key', `${config.key.slice(0, 12)}…`);

  section('Autenticação anônima');
  let primary: { client: SupabaseClient; userId: string };
  try {
    primary = await signIn(config.url, config.key);
    pass('Sessão anônima criada', primary.userId);
  } catch (error) {
    fail('Sessão anônima', `${(error as Error).message}\n      Habilite "Anonymous sign-ins" em Authentication → Sign In / Providers.`);
    process.exit(1);
  }

  section('Tabelas e RLS de leitura');
  for (const table of tables) {
    const { error } = await primary.client.from(table).select('owner_id').limit(1);
    if (error) fail(table, `${error.message}${error.message.includes('does not exist') ? '\n      A migração ainda não foi aplicada.' : ''}`);
    else pass(table);
  }

  section('Bucket de imagens');
  const probe = await primary.client.storage.from(bucket).list(primary.userId);
  if (probe.error) fail(bucket, `${probe.error.message}\n      Confira se o bucket e as políticas de storage foram criados.`);
  else pass(bucket, 'acessível');

  section('Escrita (o caminho que o app usa)');
  const brand = { id: sharedBrandId, owner_id: primary.userId, name: 'Verificação', payload: { id: sharedBrandId, name: 'Verificação' } };
  const written = await primary.client.from('brands').upsert(brand, { onConflict: 'owner_id,id' });
  if (written.error) fail('insert em brands', written.error.message);
  else pass('insert em brands');

  // O bucket só aceita imagens, então o teste sobe um PNG 1x1 de verdade.
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const objectPath = `${primary.userId}/${sharedBrandId}/verify.png`;
  let stored = false;
  const uploaded = await primary.client.storage.from(bucket).upload(objectPath, pixel, { contentType: 'image/png', upsert: true });
  if (uploaded.error) fail('upload no storage', uploaded.error.message);
  else {
    const back = await primary.client.storage.from(bucket).download(objectPath);
    if (back.error) fail('download do storage', back.error.message);
    else { stored = true; pass('upload e download no storage', `${(await back.data.arrayBuffer()).byteLength} bytes`); }
  }

  section('Isolamento entre inquilinos');
  const second = await signIn(config.url, config.key);
  pass('Segunda sessão anônima', second.userId);

  const leaked = await second.client.from('brands').select('id,owner_id');
  if (leaked.error) fail('leitura do segundo usuário', leaked.error.message);
  else if (leaked.data.some(row => row.owner_id === primary.userId)) fail('RLS de leitura', 'o segundo usuário enxergou linhas do primeiro');
  else pass('RLS de leitura', 'nenhuma linha do outro inquilino visível');

  // Só é um teste de verdade se o arquivo existir — senão o 404 passaria por RLS.
  if (!stored) fail('RLS do storage', 'não verificado: o upload do primeiro usuário falhou');
  else {
    const stolen = await second.client.storage.from(bucket).download(objectPath);
    if (!stolen.error) fail('RLS do storage', 'o segundo usuário baixou o arquivo do primeiro');
    else pass('RLS do storage', 'download de outro inquilino recusado');
  }

  const spoofed = await second.client.from('brands').insert({ id: crypto.randomUUID(), owner_id: primary.userId, name: 'Falsificada', payload: {} });
  if (!spoofed.error) fail('RLS de escrita', 'o segundo usuário gravou uma linha em nome do primeiro');
  else pass('RLS de escrita', 'escrita em nome de outro inquilino recusada');

  // O workspace demo tem ids fixos, então dois visitantes gravam o MESMO id de marca.
  // Só funciona se a chave primária for composta (owner_id, id).
  const shared = await second.client.from('brands').upsert({ ...brand, owner_id: second.userId }, { onConflict: 'owner_id,id' });
  if (shared.error) fail('id de seed compartilhado', `${shared.error.message}\n      A chave primária precisa ser (owner_id, id), não só (id).`);
  else pass('id de seed compartilhado', 'dois inquilinos convivem com o mesmo id de marca');

  section('Limpeza');
  await primary.client.storage.from(bucket).remove([objectPath]);
  await primary.client.from('brands').delete().eq('owner_id', primary.userId).eq('id', sharedBrandId);
  await second.client.from('brands').delete().eq('owner_id', second.userId).eq('id', sharedBrandId);
  pass('Linhas de teste removidas', 'os dois usuários anônimos continuam em auth.users');

  console.log('\n' + '─'.repeat(52));
  if (failures) {
    console.log(`${failures} verificação(ões) falharam. Veja os detalhes acima.`);
    process.exit(1);
  }
  console.log('Tudo certo. O app pode usar este projeto Supabase.');
}

main().catch(error => { console.error('\nFalha inesperada:', error); process.exit(1); });
