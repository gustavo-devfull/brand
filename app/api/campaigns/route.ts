import { repository } from '@/lib/brand/repository';
import { generateCampaign } from '@/lib/agent/pipeline';
import { apiError,jsonBody } from '@/lib/api';
export const runtime='nodejs';
export async function POST(request:Request){try{const input=await jsonBody(request);const repo=await repository();const campaign=await generateCampaign(await repo.read(),input,undefined,repo.locale);await repo.save('campaigns',campaign);return Response.json(campaign);}catch(e){return apiError(e);}}
