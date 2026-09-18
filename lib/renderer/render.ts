import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Asset, Brand, Template } from '@/types';
import type { CreativeSpec } from '@/schemas';
import { parseTemplate, parseSvg } from './parser';
import { layoutText, type FontBook } from './fonts';
import { fail } from '@/lib/errors';

export function renderSvg(brand:Brand,template:Template,spec:CreativeSpec,assets:Asset[],book:FontBook){
  const {doc,slots}=parseTemplate(template.svg);const asset=assets.find(a=>a.id===spec.heroImageId&&a.brandId===brand.id&&a.kind==='image');
  if(!asset||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(asset.data))throw fail('rendererNeedsImage');
  const image=slots.get('heroImage')!;image.setAttribute('href',asset.data);
  const logo=slots.get('logo')!;const official=parseSvg(brand.logoSvg);
  logo.setAttribute('viewBox',official.documentElement.getAttribute('viewBox')!);
  for(const child of Array.from(official.documentElement.childNodes))logo.appendChild(doc.importNode(child,true) as unknown as Node);
  for(const name of ['headline','description','cta'] as const){
    const el=slots.get(name)!; const size=Number(el.getAttribute('font-size')),x=Number(el.getAttribute('x')),y=Number(el.getAttribute('y')),spacing=Number(el.getAttribute('letter-spacing')||0);const fontName=el.getAttribute('font-family')!;
    const {lines,lineHeight}=layoutText(book,spec[name],fontName,size,Number(el.getAttribute('data-width')),spacing);
    const group=doc.createElement('g');group.setAttribute('data-slot',name);group.setAttribute('aria-label',spec[name]);
    lines.forEach((line,i)=>{const path=book.get(fontName).getPath(line,x,y+i*lineHeight,size,{kerning:true,letterSpacing:spacing/size});const node=doc.createElement('path');node.setAttribute('d',path.toPathData(3));node.setAttribute('fill',el.getAttribute('fill')!);group.appendChild(node);});
    el.parentNode!.replaceChild(group as unknown as Node,el);
  }
  // Protected text remains byte-stable. Bundle its typeface into the SVG for independent portability.
  return new XMLSerializer().serializeToString(doc);
}
