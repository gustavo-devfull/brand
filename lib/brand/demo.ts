import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fontBook } from '@/lib/renderer/fonts';
import { makeTemplate } from './template-factory';
import { generateCampaign } from '@/lib/agent/pipeline';
import { dictionary } from '@/lib/i18n';
import { defaultLocale, type Locale } from '@/lib/i18n/config';
import type { Brand, Workspace, Template } from '@/types';

export const DEMO_BRAND_ID='10000000-0000-4000-8000-000000000001';
export const demoBrief=(locale:Locale=defaultLocale)=>dictionary(locale).demo.brief;

/** Uma cópia do workspace semeado por idioma: a copy da campanha demo é renderizada no SVG. */
const cached=new Map<Locale,Promise<Workspace>>();

export function demoWorkspace(locale:Locale=defaultLocale){
  const existing=cached.get(locale);
  if(existing)return existing;
  const built=(async():Promise<Workspace>=>{
    const words=dictionary(locale).demo;
    const logoPath=fontBook().get('Cormorant Garamond').getPath('serein',10,70,90).toPathData(3);
    const brand:Brand={id:DEMO_BRAND_ID,name:'Serein',createdAt:'2026-09-01T09:00:00.000Z',updatedAt:'2026-09-01T09:00:00.000Z',logoSvg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><path d="${logoPath}" fill="#243D33"/></svg>`,tokens:{colors:{primary:'#243D33',secondary:'#C4A889',background:'#F4F0E8',accent:'#C4A889',additional:[]},typography:{display:'Cormorant Garamond',body:'DM Sans',weights:[400]},spacing:{small:8,medium:24,large:64},grid:{columns:12,margin:64,gutter:24}},rules:{logo:{minimumWidth:140,minimumClearspace:24,rotationAllowed:false,recolorAllowed:false},text:{maxHeadlineCharacters:60,maxHeadlineLines:2,maxDescriptionCharacters:120},requireImage:true}};
    const assets=await Promise.all(['ritual','morning','craft'].map(async(name,i)=>({id:`20000000-0000-4000-8000-00000000000${i+1}`,brandId:brand.id,name:words.assets[i],kind:'image' as const,mime:'image/jpeg' as const,data:`data:image/jpeg;base64,${(await readFile(path.join(process.cwd(),'public/demo/images',`${name}.jpg`))).toString('base64')}`})));
    const configs:[Template['format'],Template['theme']][]=[['Instagram Post','ivory'],['Instagram Story','sand'],['Web Hero','ivory'],['Meta Ad','ivory'],['LinkedIn','sand']];
    const templates=configs.map(([format,theme],i)=>makeTemplate(brand,format,theme,`30000000-0000-4000-8000-00000000000${i+1}`));
    const workspace:Workspace={brands:[brand],assets,fonts:[],templates,campaigns:[]};
    workspace.campaigns=[await generateCampaign(workspace,{brandId:brand.id,brief:words.brief,format:'Instagram Post'},undefined,locale)];
    workspace.campaigns[0].name=words.campaignName;
    return workspace;
  })();
  cached.set(locale,built);
  return built;
}
