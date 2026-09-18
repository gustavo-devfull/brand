import { creativeSpecSchema, type CreativeSpec } from '@/schemas';
import type { Asset, Brand, Compliance, RuleId, RuleParams, RuleResult, Template } from '@/types';
import { parseTemplate, serialize } from '@/lib/renderer/parser';
import { layoutText, type FontBook } from '@/lib/renderer/fonts';
import { fail } from '@/lib/errors';

export function validateSpec(input:unknown,template:Template,assets:Asset[]){
  const spec=creativeSpecSchema.parse(input);
  if(spec.templateId!==template.id||spec.theme!==template.theme||!template.alignments.includes(spec.alignment))throw fail('specNotPermitted');
  if(!assets.some(a=>a.id===spec.heroImageId&&a.brandId===template.brandId&&a.kind==='image'))throw fail('imageNotInBrand');
  return spec;
}
export function evaluateRules(brand:Brand,template:Template,spec:CreativeSpec,assets:Asset[],book:FontBook,renderedSvg?:string):Compliance{
  const {doc,slots,width,height}=parseTemplate(template.svg);const rules:RuleResult[]=[];
  const add=(ruleId:RuleId,pass:boolean,params:RuleParams={})=>rules.push({ruleId,status:pass?'pass':'fail',params});
  const logo=slots.get('logo')!;const minSpace=Number(logo.getAttribute('data-clearspace')??0);
  add('logo-size',Number(logo.getAttribute('width'))>=brand.rules.logo.minimumWidth,{minimum:brand.rules.logo.minimumWidth,actual:Number(logo.getAttribute('width'))});
  const logoX=Number(logo.getAttribute('x')),logoY=Number(logo.getAttribute('y')),logoW=Number(logo.getAttribute('width')),logoH=Number(logo.getAttribute('height'));
  const clear=brand.rules.logo.minimumClearspace;
  let clearspace=minSpace>=clear&&logoX>=clear&&logoY>=clear&&logoX+logoW+clear<=width&&logoY+logoH+clear<=height;
  for(const [name,el] of slots){if(name==='logo')continue;const x=Number(el.getAttribute('x')), y=Number(el.getAttribute('y'))-(el.tagName==='text'?Number(el.getAttribute('font-size')):0); const w=Number(el.getAttribute('width')||el.getAttribute('data-width')),h=Number(el.getAttribute('height')||el.getAttribute('data-height'));if(x<logoX+logoW+clear&&x+w>logoX-clear&&y<logoY+logoH+clear&&y+h>logoY-clear)clearspace=false;}
  add('logo-clearspace',clearspace,{clearspace:clear});
  const colors=Object.values(brand.tokens.colors).flat().map(v=>v.toLowerCase());
  const elements=Array.from(doc.getElementsByTagName('*'));
  add('colors',elements.every(el=>['fill','stroke'].every(attr=>!el.hasAttribute(attr)||el.getAttribute(attr)==='none'||colors.includes(el.getAttribute(attr)!.toLowerCase()))));
  add('fonts',elements.every(el=>!el.hasAttribute('font-family')||[brand.tokens.typography.display,brand.tokens.typography.body].includes(el.getAttribute('font-family')!)&&book.has(el.getAttribute('font-family')!)));
  add('headline-length',spec.headline.length<=brand.rules.text.maxHeadlineCharacters,{length:spec.headline.length,maximum:brand.rules.text.maxHeadlineCharacters});
  add('description-length',spec.description.length<=brand.rules.text.maxDescriptionCharacters,{length:spec.description.length,maximum:brand.rules.text.maxDescriptionCharacters});
  let fits=true,headlineLines=0,safe=true;
  for(const [name,el] of slots){
    const x=Number(el.getAttribute('x')),y=Number(el.getAttribute('y'));const w=Number(el.getAttribute('width')||el.getAttribute('data-width')),h=Number(el.getAttribute('height')||el.getAttribute('data-height'));
    if(name==='headline'||name==='description'||name==='cta'){
      const size=Number(el.getAttribute('font-size')), layout=layoutText(book,spec[name],el.getAttribute('font-family')!,size,w,Number(el.getAttribute('letter-spacing')||0));
      if(name==='headline')headlineLines=layout.lines.length;
      if(layout.lines.length>Number(el.getAttribute('data-lines')||1)||layout.widths.some(v=>v>w)||layout.lines.length*layout.lineHeight>h)fits=false;
      if(x<brand.tokens.grid.margin||y-size<brand.tokens.grid.margin||x+w>width-brand.tokens.grid.margin||y+Math.max(0,layout.lines.length-1)*layout.lineHeight+size*.25>height-brand.tokens.grid.margin)safe=false;
    }else if(x<0||y<0||x+w>width||y+h>height)safe=false;
  }
  add('headline-lines',headlineLines<=brand.rules.text.maxHeadlineLines,{length:headlineLines,maximum:brand.rules.text.maxHeadlineLines});
  add('required-image',!brand.rules.requireImage||assets.some(a=>a.id===spec.heroImageId&&a.brandId===brand.id&&a.kind==='image'));
  add('alignment',template.alignments.includes(spec.alignment)&&spec.theme===template.theme);
  add('safe-area',safe);
  let modified=0;
  if(renderedSvg){
    // Rendered markup contains embedded raster data and outlined text; inspect without reapplying the input sanitizer.
    const {DOMParser}=require('@xmldom/xmldom') as typeof import('@xmldom/xmldom');
    const out=new DOMParser().parseFromString(renderedSvg,'image/svg+xml');
    const protectedOriginal=elements.filter(e=>e.hasAttribute('data-protected'));
    const protectedRendered=Array.from(out.getElementsByTagName('*')).filter(e=>e.hasAttribute('data-protected'));
    modified=Math.abs(protectedOriginal.length-protectedRendered.length);
    protectedOriginal.forEach((el,i)=>{if(!protectedRendered[i]||serialize(el as unknown as Node)!==serialize(protectedRendered[i] as unknown as Node))modified++;});
    if(out.documentElement.getAttribute('viewBox')!==doc.documentElement.getAttribute('viewBox'))modified++;
    const outLogo=Array.from(out.getElementsByTagName('svg')).find(e=>e.getAttribute('data-slot')==='logo');
    if(!outLogo||!serialize(outLogo as unknown as Node).includes(brand.logoSvg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')))modified++;
  }
  add('protected',modified===0,{modified});
  add('overflow',fits);
  return {rules,approved:rules.every(r=>r.status!=='fail'),percentage:Math.round(rules.filter(r=>r.status==='pass').length/rules.length*100),protectedElementsModified:modified};
}
