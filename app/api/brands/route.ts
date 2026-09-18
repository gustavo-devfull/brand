import { randomUUID } from 'node:crypto';
import { brandInputSchema, brandUpdateSchema, formats } from '@/schemas';
import { repository } from '@/lib/brand/repository';
import { parseSvg } from '@/lib/renderer/parser';
import { makeTemplate } from '@/lib/brand/template-factory';
import { fontBook, layoutText } from '@/lib/renderer/fonts';
import type { Measurer } from '@/lib/brand/template-factory';
import { apiError, jsonBody } from '@/lib/api';
import { fail } from '@/lib/errors';
import type { Brand, BrandFont } from '@/types';

/** A tipografia só pode apontar para uma família embutida ou registrada nesta marca. */
function measurer(brand:Brand,fonts:BrandFont[]):Measurer{
  const book=fontBook(fonts.filter(f=>f.brandId===brand.id));
  for(const family of [brand.tokens.typography.display,brand.tokens.typography.body]){
    if(!book.has(family))throw fail('typographyUnknown',{family});
  }
  return (text,family,size,width)=>layoutText(book,text,family,size,width);
}

function checkLogo(logoSvg:string){
  const logo=parseSvg(logoSvg);
  if(!logo.documentElement.getAttribute('viewBox'))throw fail('logoNeedsViewBox');
}

export async function POST(request:Request){try{
  const input=brandInputSchema.parse(await jsonBody(request));
  checkLogo(input.logoSvg);
  const brand:Brand={...input,id:randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  const repo=await repository();
  const measure=measurer(brand,(await repo.read()).fonts);
  await repo.saveMany([
    {kind:'brands',value:brand},
    ...formats.map(format=>({kind:'templates' as const,value:makeTemplate(brand,format,'ivory',randomUUID(),measure)})),
  ]);
  return Response.json(brand,{status:201});
}catch(e){return apiError(e);}}

export async function PATCH(request:Request){try{
  const input=brandUpdateSchema.parse(await jsonBody(request));
  const repo=await repository();
  const workspace=await repo.read();
  const current=workspace.brands.find(b=>b.id===input.id);
  if(!current)throw fail('brandNotFound');

  const {id:_id,...changes}=input;
  const brand:Brand={...current,...changes,
    tokens:changes.tokens??current.tokens,
    rules:changes.rules??current.rules,
    updatedAt:new Date().toISOString()};
  checkLogo(brand.logoSvg);
  const measure=measurer(brand,workspace.fonts);

  /**
   * Os templates guardam o SVG já resolvido — cores e nomes de fonte estão escritos
   * dentro dele. Sem regerar, mudar um token deixaria toda a geração reprovada na
   * regra de paleta. Só os templates da factory (os que têm `nameKey`) são refeitos;
   * os que o usuário escreveu à mão permanecem como estão.
   */
  const regenerated=workspace.templates.filter(t=>t.brandId===brand.id&&t.nameKey);
  await repo.saveMany([
    {kind:'brands',value:brand},
    ...regenerated.map(template=>({kind:'templates' as const,
      value:{...makeTemplate(brand,template.format,template.theme,template.id,measure),createdAt:template.createdAt}})),
  ]);

  const custom=workspace.templates.filter(t=>t.brandId===brand.id&&!t.nameKey).length;
  return Response.json({brand,regeneratedTemplates:regenerated.length,customTemplates:custom});
}catch(e){return apiError(e);}}
