import { Resvg } from '@resvg/resvg-js';
import { z } from 'zod';
import path from 'node:path';
import { repository } from '@/lib/brand/repository';
import { evaluateRules,validateSpec } from '@/lib/validation/engine';
import { renderSvg } from '@/lib/renderer/render';
import { fontBook, materializeFonts } from '@/lib/renderer/fonts';
import { apiError } from '@/lib/api';
import { fail } from '@/lib/errors';
export const runtime='nodejs';

export async function GET(request:Request){try{
  const query=z.object({id:z.uuid(),format:z.enum(['svg','png'])}).parse(Object.fromEntries(new URL(request.url).searchParams));
  const workspace=await (await repository()).read();
  const campaign=workspace.campaigns.find(c=>c.variations.some(v=>v.id===query.id));
  const variation=campaign?.variations.find(v=>v.id===query.id);
  if(!campaign||!variation)throw fail('assetNotFound');
  const brand=workspace.brands.find(b=>b.id===campaign.brandId)!,template=workspace.templates.find(t=>t.id===variation.spec.templateId)!;
  const book=fontBook(workspace.fonts.filter(f=>f.brandId===brand.id));
  validateSpec(variation.spec,template,workspace.assets);
  if(!evaluateRules(brand,template,variation.spec,workspace.assets,book).approved)throw fail('exportBlockedPreflight');
  const svg=renderSvg(brand,template,variation.spec,workspace.assets,book);
  if(!evaluateRules(brand,template,variation.spec,workspace.assets,book,svg).approved)throw fail('exportBlockedFinal');

  // O texto protegido do template não é vetorizado, então o resvg ainda precisa das
  // fontes: as embutidas por arquivo e as da marca por buffer.
  const brandFonts=query.format==='png'?await materializeFonts(book.custom()):[];
  const body=query.format==='svg'?Buffer.from(svg):new Resvg(svg,{font:{
    fontFiles:[path.join(process.cwd(),'public/demo/fonts/body.ttf'),path.join(process.cwd(),'public/demo/fonts/display.ttf'),...brandFonts],
    loadSystemFonts:false,
  }}).render().asPng();

  return new Response(new Uint8Array(body),{headers:{
    'Content-Type':query.format==='svg'?'image/svg+xml':'image/png',
    'Content-Disposition':`attachment; filename="${brand.name.replace(/[^a-z0-9]/gi,'-')}-${variation.id.slice(0,8)}.${query.format}"`,
    'Cache-Control':'private, no-store',
  }});
}catch(e){return apiError(e);}}
