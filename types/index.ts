import type { z } from 'zod';
import type { assetSchema, brandInputSchema, CreativeSpec, Format } from '@/schemas';

export type Brand = z.infer<typeof brandInputSchema> & {id:string; createdAt:string; updatedAt:string};
export type Asset = z.infer<typeof assetSchema>;

/** Uma família tipográfica disponível para uma marca, enviada ou trazida do Google Fonts. */
export type FontSource = 'upload'|'google';
export type BrandFont = {id:string;brandId:string;family:string;source:FontSource;data:string;createdAt:string};

/** Nomes dos templates gerados pela factory. Templates criados pelo usuário não têm chave e usam `name`. */
export const templateNameKeys = ['social-square','vertical-story','web-hero'] as const;
export type TemplateNameKey = typeof templateNameKeys[number];

export type Template = {id:string;brandId:string;name:string;nameKey?:TemplateNameKey;format:Format;svg:string;theme:CreativeSpec['theme'];alignments:CreativeSpec['alignment'][];width:number;height:number;createdAt:string};

export const ruleIds = ['logo-size','logo-clearspace','colors','fonts','headline-length','description-length','headline-lines','required-image','alignment','safe-area','protected','overflow'] as const;
export type RuleId = typeof ruleIds[number];

/**
 * As regras carregam números, não frases. O texto vive nos dicionários de idioma,
 * então uma conformidade já gravada pode ser lida em qualquer idioma.
 */
export type RuleParams = Record<string, number>;
export type RuleResult = {ruleId:RuleId;status:'pass'|'warning'|'fail';params:RuleParams};
export type Compliance = {rules:RuleResult[];approved:boolean;percentage:number;protectedElementsModified:number};

/** Pelo mesmo motivo, a justificativa do agente é gravada como dados, não como prosa. */
export type Rationale = {theme:CreativeSpec['theme'];onTheme:boolean};

export type Variation = {id:string;spec:CreativeSpec;templateName:string;templateNameKey?:TemplateNameKey;format:Format;svg:string;compliance:Compliance;rationale:Rationale;imageName:string};
export type Campaign = {id:string;brandId:string;name:string;brief:string;format:Format;createdAt:string;variations:Variation[]};
export type Workspace = {brands:Brand[];assets:Asset[];fonts:BrandFont[];templates:Template[];campaigns:Campaign[]};
