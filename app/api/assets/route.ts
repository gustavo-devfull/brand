import { randomUUID } from 'node:crypto';
import { repository } from '@/lib/brand/repository';
import { apiError,checkOrigin } from '@/lib/api';
import { parseSvg } from '@/lib/renderer/parser';
import { assetSchema } from '@/schemas';
import { fail } from '@/lib/errors';
export async function POST(request:Request){try{checkOrigin(request);if(Number(request.headers.get('content-length')||0)>6000000)throw fail('uploadTooLarge');const form=await request.formData();const file=form.get('file'),brandId=form.get('brandId');if(!(file instanceof File)||file.size>5000000)throw fail('uploadTooLarge');const bytes=Buffer.from(await file.arrayBuffer());
  const signatures:Record<string,boolean>={'image/jpeg':bytes[0]===255&&bytes[1]===216&&bytes[2]===255,'image/png':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'image/webp':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP','image/svg+xml':false};
  if(file.type==='image/svg+xml'){parseSvg(bytes.toString('utf8'));signatures[file.type]=true;}if(!signatures[file.type])throw fail('uploadTypeMismatch');
  const asset=assetSchema.parse({id:randomUUID(),brandId,name:file.name,kind:file.type==='image/svg+xml'?'icon':'image',mime:file.type,data:`data:${file.type};base64,${bytes.toString('base64')}`});const repo=await repository();if(!(await repo.read()).brands.some(b=>b.id===asset.brandId))throw fail('brandNotFound');await repo.save('assets',asset);return Response.json(asset,{status:201});
}catch(e){return apiError(e);}}
