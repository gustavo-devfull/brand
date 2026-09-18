import type { Brand, Asset, Template } from '@/types';
import type { CreativeSpec, Format } from '@/schemas';
import type { Locale } from '@/lib/i18n/config';

export type AgentContext={brief:string;brand:Brand;templates:Template[];assets:Asset[];format:Format;locale:Locale};
export interface CreativeAgentProvider {generateCreativeSpecs(context:AgentContext):Promise<unknown>}

/** Reconhece o tema "ritual de café" do briefing nos dois idiomas. */
export const onThemeBrief=(brief:string)=>/coffee|morning|ritual|craft|caf[ée]|manh[ãa]|artesan|torra/i.test(brief);

const copy={
  pt:{
    headlines:['Coisas boas levam tempo.','Uma manhã sem pressa.','Abra espaço para o ritual.'],
    descriptions:['Café excepcional. Um ritual de todo dia.','Origem cuidadosa. Sabor sem pressa.','Feito com cuidado. Para as suas manhãs.'],
    ctas:['DESCUBRA A COLEÇÃO','ENCONTRE SUA MANHÃ','EXPLORE O RITUAL'],
    generic:['Descubra um dia a dia mais pensado.','Feito para significar mais.','Um instante, com cuidado.'],
    fallbackHeadlines:['Feito para significar mais.','Um instante, com cuidado.'],
    missing:'Adicione um template para este formato e ao menos uma imagem de campanha primeiro.',
  },
  en:{
    headlines:['Good things take time.','A slower kind of morning.','Make room for ritual.'],
    descriptions:['Exceptional coffee. An everyday ritual.','Thoughtfully sourced. Slowly savored.','Crafted with care. Made for your mornings.'],
    ctas:['DISCOVER THE COLLECTION','FIND YOUR MORNING','EXPLORE THE RITUAL'],
    generic:['Discover a more considered everyday.','Made to mean more.','Thoughtfully made. Distinctly yours.'],
    fallbackHeadlines:['Made to mean more.','A moment, considered.'],
    missing:'Add a template for this format and at least one campaign image first.',
  },
} as const;

export class MockCreativeAgent implements CreativeAgentProvider {
  async generateCreativeSpecs(context:AgentContext):Promise<CreativeSpec[]>{
    const words=copy[context.locale];
    const templates=context.templates.filter(t=>t.brandId===context.brand.id&&t.format===context.format);
    const images=context.assets.filter(a=>a.brandId===context.brand.id&&a.kind==='image');
    if(!templates.length||!images.length)throw new Error(words.missing);
    const onTheme=onThemeBrief(context.brief);
    const subject=context.brief.split(/[.!?]/)[0].replace(/^(launch|create|introduce|promote|lance|crie|apresente|divulgue)\s+(our\s+|nossa?\s+|o\s+|a\s+)?(new\s+|nova?\s+)?/i,'').trim().split(/\s+/).slice(0,4).join(' ');
    const headlines=onTheme?words.headlines:[subject.slice(0,44),...words.fallbackHeadlines];
    return headlines.map((headline,i)=>{
      const t=templates[i%templates.length];
      return {templateId:t.id,headline,
        description:onTheme?words.descriptions[i]:[words.generic[0],context.brief.slice(0,70),words.generic[2]][i],
        heroImageId:images[i%images.length].id,theme:t.theme,alignment:t.alignments[0],cta:words.ctas[i]};
    });
  }
}
