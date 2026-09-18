import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOrigin } from '@/lib/api';
import { AppError } from '@/lib/errors';

/**
 * `Host` é um cabeçalho proibido para `new Request()`, então os testes montam um objeto
 * com a única superfície que `checkOrigin` usa: `headers.get`.
 */
const req = (headers: Record<string, string | null>, url = 'http://internal/api/brands') =>
  ({ url, headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }) as unknown as Request;

test('aceita uma escrita cujo Origin bate com o Host', () => {
  assert.doesNotThrow(() => checkOrigin(req({ origin: 'http://localhost:3000', host: 'localhost:3000' })));
  assert.doesNotThrow(() => checkOrigin(req({ origin: 'https://brand.example.com', host: 'brand.example.com' })));
});

test('aceita a origem real mesmo quando o servidor escuta em outro endereço', () => {
  // A regressão: `npm run dev` usa --hostname 0.0.0.0, então a origem que o Next deriva
  // para si não é a que o navegador usou. Antes, isso recusava TODA escrita.
  for (const host of ['localhost:3000', '127.0.0.1:3000', '192.168.0.10:3000']) {
    assert.doesNotThrow(
      () => checkOrigin(req({ origin: `http://${host}`, host }, 'http://0.0.0.0:3000/api/brands')),
      `esperava aceitar ${host}`,
    );
  }
});

test('recusa uma escrita vinda de outro site', () => {
  for (const origin of ['https://evil.test', 'http://localhost:3001', 'http://sub.localhost:3000', 'http://localhost']) {
    assert.throws(
      () => checkOrigin(req({ origin, host: 'localhost:3000' })),
      { key: 'crossOrigin' },
      `esperava recusar ${origin}`,
    );
  }
});

test('a comparação é de host, não de esquema', () => {
  // Limitação consciente: `Host` não carrega esquema, e derivar o esquema da requisição
  // recriaria o bug original atrás de um proxy TLS (o servidor vê http, o navegador
  // mandou https) — recusando toda escrita. Explorar isto exigiria controlar o mesmo
  // host no outro esquema, ou seja, já ser o próprio site.
  assert.doesNotThrow(() => checkOrigin(req({ origin: 'https://localhost:3000', host: 'localhost:3000' })));
});

test('recusa um Origin malformado ou um Host ausente', () => {
  assert.throws(() => checkOrigin(req({ origin: 'nao-e-uma-url', host: 'localhost:3000' })), AppError);
  assert.throws(() => checkOrigin(req({ origin: 'http://localhost:3000', host: null })), { key: 'crossOrigin' });
});

test('deixa passar requisições sem Origin', () => {
  // Navegações same-origin e clientes não-browser não mandam o cabeçalho.
  assert.doesNotThrow(() => checkOrigin(req({ host: 'localhost:3000' })));
});
