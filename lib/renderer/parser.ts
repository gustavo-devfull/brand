import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { fail } from '@/lib/errors';

export const slotNames = ['headline','description','heroImage','cta','logo'] as const;
export type SlotName = typeof slotNames[number];
// Elementos de desenho e pintura. Ficam de fora os que trazem execução ou busca de
// recursos: <style> (CSS arbitrário, incluindo @import), <use>, <script>, <filter>.
const tags = new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','image','defs','clipPath','mask','linearGradient','radialGradient','stop','title','desc']);
// Atributos de apresentação e geometria. Ferramentas de design emitem boa parte
// destes; recusá-los inviabilizava colar um logo real exportado do Figma ou Illustrator.
const attributes = new Set(['xmlns','xmlns:xlink','version','xml:space','viewBox','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points',
  'fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-dasharray','stroke-dashoffset','stroke-opacity',
  'clip-rule','clip-path','clipPathUnits','mask','maskUnits','maskContentUnits',
  'gradientUnits','gradientTransform','spreadMethod','offset','stop-color','stop-opacity',
  'opacity','vector-effect','paint-order','font-family','font-size','font-weight','letter-spacing','text-anchor','dominant-baseline',
  'transform','id','preserveAspectRatio','data-slot','data-width','data-height','data-lines','data-clearspace','data-protected']);
export function parseSvg(svg:string) {
  if (/<!DOCTYPE|<!ENTITY|<\?/i.test(svg)) throw fail('svgDeclarations');
  const errors:string[]=[];
  const doc = new DOMParser({errorHandler:{warning:m=>errors.push(m),error:m=>errors.push(m),fatalError:m=>errors.push(m)}}).parseFromString(svg,'image/svg+xml');
  if (errors.length || doc.documentElement?.tagName !== 'svg') throw fail('svgMalformed');
  const elements=Array.from(doc.getElementsByTagName('*'));
  if(elements.length>2000) throw fail('svgTooComplex');
  for(const el of elements){
    if(!tags.has(el.tagName)) throw fail('svgElement',{element:el.tagName});
    for(const attr of Array.from(el.attributes)){
      if(!attributes.has(attr.name)) throw fail('svgAttribute',{attribute:attr.name});
      if(/url\s*\(/i.test(attr.value) && !/^url\(#[a-zA-Z][\w-]*\)$/.test(attr.value)) throw fail('svgExternalRef');
      if(/javascript:|data:|https?:/i.test(attr.value) && !attr.name.startsWith('xmlns')) throw fail('svgExternalResource');
    }
  }
  return doc;
}
export function serialize(node:Node | ReturnType<typeof parseSvg>) {return new XMLSerializer().serializeToString(node as Parameters<XMLSerializer['serializeToString']>[0]);}
export function parseTemplate(svg:string){
  const doc=parseSvg(svg);const root=doc.documentElement;
  const width=Number(root.getAttribute('width')),height=Number(root.getAttribute('height'));
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<320||height<320||width>2400||height>2400)throw fail('templateDimensions');
  if(root.getAttribute('viewBox')!==`0 0 ${width} ${height}`) throw fail('templateViewBox');
  const slots=new Map<SlotName,Element>();
  for(const el of Array.from(doc.getElementsByTagName('*'))){
    const name=el.getAttribute('data-slot');if(!name)continue;
    if(!slotNames.includes(name as SlotName)||slots.has(name as SlotName))throw fail('slotUnknown');
    if(el.parentNode!==root)throw fail('slotNotDirectChild');
    if(el.hasAttribute('transform'))throw fail('slotTransformed');
    const expected=name==='heroImage'?'image':name==='logo'?'svg':'text';
    if(el.tagName!==expected)throw fail('slotWrongElement',{slot:name,expected});
    for(const attr of ['x','y',...(expected==='text'?['data-width','data-height','font-size']:['width','height'])]){
      const value=Number(el.getAttribute(attr));if(!el.hasAttribute(attr)||!Number.isFinite(value)||value<0)throw fail('slotInvalidAttribute',{slot:name,attribute:attr});
    }
    slots.set(name as SlotName,el as unknown as Element);
  }
  for(const name of slotNames)if(!slots.has(name))throw fail('slotMissing',{slot:name});
  return {doc,width,height,slots};
}
