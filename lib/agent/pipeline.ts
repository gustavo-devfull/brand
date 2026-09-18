import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Campaign, Workspace } from '@/types';
import { creativeSpecSchema, generationInputSchema } from '@/schemas';
import { MockCreativeAgent, onThemeBrief, type CreativeAgentProvider } from './provider';
import { evaluateRules, validateSpec } from '@/lib/validation/engine';
import { renderSvg } from '@/lib/renderer/render';
import { fontBook } from '@/lib/renderer/fonts';
import { defaultLocale, type Locale } from '@/lib/i18n/config';
import { fail } from '@/lib/errors';

export async function generateCampaign(workspace:Workspace,input:unknown,provider:CreativeAgentProvider=new MockCreativeAgent(),locale:Locale=defaultLocale):Promise<Campaign>{
  const request=generationInputSchema.parse(input);const brand=workspace.brands.find(b=>b.id===request.brandId);if(!brand)throw fail('brandNotFound');
  const templates=workspace.templates.filter(t=>t.brandId===brand.id&&t.format===request.format);const assets=workspace.assets.filter(a=>a.brandId===brand.id);
  const book=fontBook(workspace.fonts.filter(f=>f.brandId===brand.id));
  const output=await provider.generateCreativeSpecs({brief:request.brief,brand,templates,assets,format:request.format,locale});
  const specs=z.array(creativeSpecSchema).length(3).parse(output);
  const onTheme=onThemeBrief(request.brief);
  const variations=specs.map(spec=>{const template=templates.find(t=>t.id===spec.templateId);if(!template)throw fail('templateUnavailable');validateSpec(spec,template,assets);
    const preflight=evaluateRules(brand,template,spec,assets,book);const svg=preflight.approved?renderSvg(brand,template,spec,assets,book):'';
    const compliance=svg?evaluateRules(brand,template,spec,assets,book,svg):preflight;
    return {id:randomUUID(),spec,templateName:template.name,templateNameKey:template.nameKey,format:request.format,svg,compliance,
      imageName:assets.find(a=>a.id===spec.heroImageId)!.name,
      rationale:{theme:template.theme,onTheme}};});
  return {id:randomUUID(),brandId:brand.id,name:request.brief.slice(0,52),brief:request.brief,format:request.format,createdAt:new Date().toISOString(),variations};
}
