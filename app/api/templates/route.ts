import { randomUUID } from 'node:crypto';
import { templateInputSchema } from '@/schemas';
import { parseTemplate } from '@/lib/renderer/parser';
import { repository } from '@/lib/brand/repository';
import { apiError,jsonBody } from '@/lib/api';
import { fail } from '@/lib/errors';
export async function POST(request:Request){try{const input=templateInputSchema.parse(await jsonBody(request));const repo=await repository();if(!(await repo.read()).brands.some(b=>b.id===input.brandId))throw fail('brandNotFound');const {width,height}=parseTemplate(input.svg);const template={...input,id:randomUUID(),width,height,alignments:['left' as const],createdAt:new Date().toISOString()};await repo.save('templates',template);return Response.json(template,{status:201});}catch(e){return apiError(e);}}
