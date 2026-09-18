import { repository } from '@/lib/brand/repository';
import { apiError } from '@/lib/api';
export const runtime='nodejs';
export async function GET(){try{const repo=await repository();return Response.json({workspace:await repo.read(),cloud:repo.cloud,locale:repo.locale},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return apiError(e);}}
