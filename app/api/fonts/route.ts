import { randomUUID } from 'node:crypto';
import { familyName } from '@/schemas';
import { repository } from '@/lib/brand/repository';
import { parseFont } from '@/lib/renderer/fonts';
import { fetchGoogleFont } from '@/lib/renderer/google-fonts';
import { apiError, checkOrigin, jsonBody } from '@/lib/api';
import { fail } from '@/lib/errors';
import { z } from 'zod';
import type { BrandFont } from '@/types';

export const runtime='nodejs';
const maxBytes=2_000_000;

async function register(brandId:string,family:string,source:BrandFont['source'],bytes:Buffer){
  const repo=await repository();
  const workspace=await repo.read();
  if(!workspace.brands.some(b=>b.id===brandId))throw fail('brandNotFound');
  if(workspace.fonts.some(f=>f.brandId===brandId&&f.family.toLowerCase()===family.toLowerCase()))throw fail('fontDuplicate',{family});
  const font:BrandFont={id:randomUUID(),brandId,family,source,
    data:`data:font/ttf;base64,${bytes.toString('base64')}`,createdAt:new Date().toISOString()};
  await repo.save('fonts',font);
  return font;
}

/** Busca no Google Fonts: o corpo só traz o nome da família, nunca uma URL. */
export async function POST(request:Request){try{
  const body=z.strictObject({brandId:z.uuid(),family:familyName}).parse(await jsonBody(request));
  const bytes=await fetchGoogleFont(body.family);
  return Response.json(await register(body.brandId,body.family,'google',bytes),{status:201});
}catch(e){return apiError(e);}}

/** Envio de arquivo: aceita TTF e OTF, conferidos pelo parser antes de guardar. */
export async function PUT(request:Request){try{
  checkOrigin(request);
  if(Number(request.headers.get('content-length')||0)>maxBytes+200000)throw fail('fontTooLarge');
  const form=await request.formData();
  const file=form.get('file'),brandId=z.uuid().parse(form.get('brandId'));
  if(!(file instanceof File)||file.size>maxBytes)throw fail('fontTooLarge');
  const family=familyName.parse(form.get('family')||file.name.replace(/\.(ttf|otf)$/i,'').replace(/[_-]+/g,' ').trim());
  const bytes=Buffer.from(await file.arrayBuffer());
  parseFont(bytes,family);
  return Response.json(await register(brandId,family,'upload',bytes),{status:201});
}catch(e){return apiError(e);}}
