import { z } from 'zod';

export const formats = ['Instagram Post', 'Instagram Story', 'Meta Ad', 'LinkedIn', 'Web Hero'] as const;
export const formatSchema = z.enum(formats);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const positive = z.number().finite().positive().max(4096);
// Nome de família tipográfica: o que vai no atributo font-family do template.
export const familyName = z.string().trim().min(1).max(64).regex(/^[\w][\w .'-]*$/u, 'must be a plain typeface name');
export const tokensSchema = z.strictObject({
  colors: z.strictObject({primary:hex, secondary:hex, background:hex, accent:hex, additional:z.array(hex).max(12)}),
  typography: z.strictObject({display:familyName, body:familyName, weights:z.array(z.literal(400)).min(1).max(1)}),
  spacing:z.strictObject({small:positive,medium:positive,large:positive}),
  grid:z.strictObject({columns:z.number().int().min(1).max(24),margin:positive,gutter:positive}),
});
export const rulesSchema = z.strictObject({
  logo:z.strictObject({minimumWidth:positive,minimumClearspace:z.number().min(0).max(200),rotationAllowed:z.boolean(),recolorAllowed:z.boolean()}),
  text:z.strictObject({maxHeadlineCharacters:z.number().int().min(1).max(200),maxHeadlineLines:z.number().int().min(1).max(5),maxDescriptionCharacters:z.number().int().min(1).max(500)}),
  requireImage:z.boolean(),
});
export const brandInputSchema = z.strictObject({name:z.string().trim().min(2).max(60), tokens:tokensSchema, rules:rulesSchema, logoSvg:z.string().max(100000)});
export const assetSchema = z.strictObject({id:z.uuid(),brandId:z.uuid(),name:z.string().min(1).max(100),kind:z.enum(['image','logo','icon']),mime:z.enum(['image/jpeg','image/png','image/webp','image/svg+xml']),data:z.string().max(12000000)});
export const templateInputSchema = z.strictObject({name:z.string().trim().min(2).max(60),brandId:z.uuid(),format:formatSchema,svg:z.string().min(10).max(150000),theme:z.enum(['ivory','forest','sand'])});
export const creativeSpecSchema = z.strictObject({templateId:z.uuid(),headline:z.string().min(1).max(200),description:z.string().max(500),heroImageId:z.uuid(),theme:z.enum(['ivory','forest','sand']),alignment:z.enum(['left','center']),cta:z.string().min(1).max(28)});
export const fontInputSchema = z.discriminatedUnion('source',[
  z.strictObject({source:z.literal('google'),brandId:z.uuid(),family:familyName}),
  z.strictObject({source:z.literal('upload'),brandId:z.uuid(),family:familyName}),
]);
export const brandUpdateSchema = brandInputSchema.partial().extend({id:z.uuid()});
export const generationInputSchema = z.strictObject({brandId:z.uuid(),brief:z.string().trim().min(20).max(2000),format:formatSchema});
export type CreativeSpec = z.infer<typeof creativeSpecSchema>;
export type BrandTokens = z.infer<typeof tokensSchema>;
export type BrandRules = z.infer<typeof rulesSchema>;
export type Format = z.infer<typeof formatSchema>;
