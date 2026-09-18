import { expect, test } from '@playwright/test';

test.describe('o estúdio de campanha', () => {
  test('já vem com uma campanha demo aprovada pela marca', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Na marca.');
    // Trava a suíte no workspace local: com credenciais reais, cada teste criaria um
    // usuário anônimo no projeto Supabase.
    await expect(page.locator('.demo-label')).toHaveText('WORKSPACE DEMO');

    await expect(page.locator('.variation-card')).toHaveCount(3);
    await expect(page.locator('.compliance-badge').first()).toContainText('100%');
    await expect(page.locator('.artboard img').first()).toBeVisible();
  });

  test('transforma um briefing em três direções novas', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.variation-card')).toHaveCount(3);

    await page.getByLabel('O que vamos criar?').fill(
      'Apresente um ritual noturno restaurador para quem valoriza luxo silencioso, manhãs sem pressa e trabalho artesanal.',
    );
    const generate = page.getByRole('button', { name: /Gerar variações/ });
    await expect(generate).toBeEnabled();

    const response = page.waitForResponse(r => r.url().includes('/api/campaigns') && r.request().method() === 'POST');
    await generate.click();
    expect((await response).status()).toBe(200);

    await expect(page.getByText('Validação concluída')).toBeVisible();
    await expect(page.locator('.variation-card')).toHaveCount(3);
    await expect(page.getByText('3 de 3 variações aprovadas')).toBeVisible();
  });

  test('recusa um briefing curto demais para agir', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('O que vamos criar?').fill('curto demais');
    await expect(page.getByRole('button', { name: /Gerar variações/ })).toBeDisabled();
  });

  test('mostra o rastro da decisão por trás de uma variação', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Inspecionar decisão' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('RASTRO DA DECISÃO')).toBeVisible();
    await expect(dialog.getByText('Template', { exact: true })).toBeVisible();
    await expect(dialog.locator('.protected-note')).toHaveText('0 elementos protegidos modificados');
    await expect(dialog.locator('.rule-detail')).toHaveCount(12);
    await expect(dialog.locator('.rule-detail.fail')).toHaveCount(0);

    await dialog.getByRole('button', { name: 'Fechar inspeção' }).click();
    await expect(dialog).toBeHidden();
  });

  test('exporta uma peça aprovada em SVG', async ({ page }) => {
    await page.goto('/');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'SVG' }).first().click();
    expect((await download).suggestedFilename()).toMatch(/\.svg$/);
  });
});

test.describe('o toggle de idioma', () => {
  test('troca a interface e ressemeia o conteúdo demo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Na marca.');

    const toggle = page.getByRole('button', { name: 'Mudar o idioma para inglês' });
    await expect(toggle).toHaveText('PT');

    const reseed = page.waitForResponse(r => r.url().includes('/api/workspace'));
    await toggle.click();
    await reseed;

    // A interface muda na hora e o workspace demo é regerado no servidor.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('On-brand.');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Switch the language to Portuguese' })).toHaveText('EN');
    await expect(page.getByText('Creative brief')).toBeVisible();
  });

  test('a escolha sobrevive a um recarregamento e vale em todas as páginas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mudar o idioma para inglês' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('On-brand.');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('On-brand.');

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Everything on brand.');
    await page.goto('/architecture');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Creative freedom.');
  });

  test('a campanha demo em inglês continua aprovada', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mudar o idioma para inglês' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('On-brand.');

    await expect(page.locator('.variation-card')).toHaveCount(3);
    await expect(page.locator('.compliance-badge').first()).toContainText('100%');
    await page.getByRole('button', { name: 'Inspect decision' }).first().click();
    await expect(page.getByRole('dialog').locator('.rule-detail.fail')).toHaveCount(0);
  });
});

test.describe('edição de marca e tipografia', () => {
  test('edita a marca e refaz os templates gerados', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: 'Editar marca' }).click();

    await expect(page.getByRole('heading', { level: 2, name: /Editar Serein/ })).toBeVisible();
    await page.getByLabel('Nome da marca').fill('Serein Studio');

    const response = page.waitForResponse(r => r.url().includes('/api/brands') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    expect((await response).status()).toBe(200);

    await expect(page.getByText(/Serein Studio atualizada\. 5 templates refeitos/)).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Selecionar marca' })).toHaveValue(/.+/);
  });

  test('um campo numérico apagado bloqueia o salvamento em vez de dar erro do servidor', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: 'Editar marca' }).click();

    const save = page.getByRole('button', { name: 'Salvar alterações' });
    await expect(save).toBeEnabled();

    // Apagar para digitar outro valor é o gesto normal; antes isso virava 0 e um 400.
    await page.getByLabel('Margem do grid').fill('');
    await expect(save).toBeDisabled();
    await expect(page.getByText('1 campo precisa de um valor válido antes de salvar.')).toBeVisible();

    await page.getByLabel('Margem do grid').fill('72');
    await expect(save).toBeEnabled();
  });

  test('uma cor hex incompleta bloqueia o salvamento', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: 'Editar marca' }).click();

    const swatch = page.locator('.color-field').filter({ hasText: 'Primária' }).locator('input[type="text"], input:not([type])').last();
    await swatch.fill('#FF6B0');
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    await swatch.fill('#FF6B00');
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
  });

  test('o seletor de tipografia só oferece famílias registradas', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: 'Editar marca' }).click();
    const display = page.getByLabel('Fonte display');
    await expect(display.locator('option')).toHaveText(['Cormorant Garamond', 'DM Sans']);
  });

  test('busca uma família no Google Fonts e disponibiliza nos tokens', async ({ page }) => {
    await page.goto('/brands');
    await expect(page.getByText('Nenhuma família própria ainda.')).toBeVisible();

    await page.getByLabel('Buscar no Google Fonts').fill('Manrope');
    const response = page.waitForResponse(r => r.url().includes('/api/fonts') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    expect((await response).status()).toBe(201);

    await expect(page.getByText(/Manrope já pode ser usada/)).toBeVisible();
    await expect(page.locator('.font-row')).toHaveCount(3);

    // A família nova passa a valer como token da marca.
    await page.getByRole('button', { name: 'Editar marca' }).click();
    await expect(page.getByLabel('Fonte display').locator('option')).toHaveText(['Cormorant Garamond', 'DM Sans', 'Manrope']);
  });

  test('recusa uma família que o Google não tem', async ({ page }) => {
    await page.goto('/brands');
    await page.getByLabel('Buscar no Google Fonts').fill('Fonte Que Nao Existe');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.locator('.error-message')).toContainText('não tem uma fonte chamada');
  });
});

test.describe('as mensagens de erro', () => {
  test('uma marcação inválida é recusada no idioma da interface', async ({ page }) => {
    await page.goto('/templates');
    await page.getByRole('button', { name: 'Adicionar template' }).click();
    await page.getByLabel('Nome do template').fill('Template quebrado');
    await page.getByLabel('Marcação SVG do template').fill('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><script/></svg>');
    await page.getByRole('button', { name: 'Aprovar template' }).click();

    await expect(page.locator('.error-message')).toHaveText('Elemento SVG não suportado: script');
  });

  test('a mesma recusa chega em inglês depois do toggle', async ({ page }) => {
    await page.goto('/templates');
    await page.getByRole('button', { name: 'Mudar o idioma para inglês' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Geometry the agent');

    await page.getByRole('button', { name: 'Add template' }).click();
    await page.getByLabel('Template name').fill('Broken template');
    await page.getByLabel('Template SVG markup').fill('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><script/></svg>');
    await page.getByRole('button', { name: 'Approve template' }).click();

    await expect(page.locator('.error-message')).toHaveText('Unsupported SVG element: script');
  });
});

test.describe('os módulos do workspace', () => {
  test('a visão geral relata o estado do sistema', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tudo na marca.');
    await expect(page.locator('.stat-card')).toHaveCount(4);
    await expect(page.getByText('3 de 3 peças geradas aprovadas')).toBeVisible();
    await expect(page.locator('.rule-bars li')).toHaveCount(12);
    await expect(page.locator('.roster-card')).toHaveCount(1);
  });

  test('o módulo de marca expõe tokens, regras e a biblioteca', async ({ page }) => {
    await page.goto('/brands');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A fonte da verdade.');
    await expect(page.getByRole('combobox', { name: 'Selecionar marca' })).toHaveValue(/.+/);
    await expect(page.locator('.swatches > div').first()).toBeVisible();
    await expect(page.locator('.asset-card')).toHaveCount(3);
    await expect(page.getByText('Solte as imagens aqui, ou procure')).toBeVisible();
  });

  test('o módulo de marca registra um novo sistema', async ({ page }) => {
    await page.goto('/brands');
    await page.getByRole('button', { name: 'Registrar marca' }).click();

    await page.getByLabel('Nome da marca').fill('Aurelia');
    const response = page.waitForResponse(r => r.url().includes('/api/brands') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Registrar sistema de marca' }).click();
    expect((await response).status()).toBe(201);

    await expect(page.getByText(/Aurelia registrada com cinco templates aprovados/)).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Selecionar marca' })).toHaveValue(/.+/);
  });

  test('o módulo de templates lista a geometria aprovada e seu contrato', async ({ page }) => {
    await page.goto('/templates');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Geometria que o agente');
    await expect(page.locator('.template-card')).toHaveCount(5);

    await page.getByRole('button', { name: 'Story do Instagram', exact: true }).click();
    await expect(page.locator('.template-card')).toHaveCount(1);

    await page.getByRole('button', { name: 'Inspecionar contrato' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('CONTRATO DO TEMPLATE')).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('Story vertical');
    await expect(dialog.getByText('1080 × 1920')).toBeVisible();
    await expect(dialog.getByText('heroImage, logo, headline, description, cta')).toBeVisible();
  });

  test('o módulo de templates gera um scaffold e aprova um novo template', async ({ page }) => {
    await page.goto('/templates');
    await page.getByRole('button', { name: 'Adicionar template' }).click();

    await page.getByLabel('Nome do template').fill('Quadrado Editorial');
    await expect(page.getByLabel('Marcação SVG do template')).toContainText('data-slot="headline"');

    const response = page.waitForResponse(r => r.url().includes('/api/templates') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Aprovar template' }).click();
    expect((await response).status()).toBe(201);

    await expect(page.getByText(/Quadrado Editorial aprovado em 1080×1080/)).toBeVisible();
    await expect(page.locator('.template-card')).toHaveCount(6);
  });

  test('o módulo de arquitetura explica o pipeline', async ({ page }) => {
    await page.goto('/architecture');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Liberdade criativa.');
    await expect(page.locator('.stage-card')).toHaveCount(5);
    await expect(page.locator('.flow-node')).toHaveCount(6);
    await expect(page.locator('.guarantee-card')).toHaveCount(4);
  });

  test('a navegação alcança todos os módulos', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('aside.sidebar nav');
    for (const [label, heading] of [
      [/^Visão geral$/, 'Tudo na marca.'],
      [/^Marcas$/, 'A fonte da verdade.'],
      [/^Templates$/, 'Geometria que o agente'],
      [/^Campanhas/, 'Na marca.'],
    ] as const) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    }
  });

  test('uma rota desconhecida continua dentro do sistema', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Esta página não está no sistema.');
    await page.getByRole('link', { name: 'Voltar ao estúdio' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Na marca.');
  });
});
