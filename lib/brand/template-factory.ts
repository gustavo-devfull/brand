import type { Brand, Template, TemplateNameKey } from '@/types';
import type { Format } from '@/schemas';
const escapeXml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));

/**
 * Medidor de texto, injetado por quem tem as métricas das fontes. Fica como parâmetro
 * para a factory continuar pura — ela também roda no cliente, onde o parser de fontes
 * não pode ser carregado.
 */
export type Measurer=(text:string,family:string,size:number,width:number)=>{lines:string[];widths:number[];lineHeight:number};

// Amostra representativa: o pior caso é uma manchete no limite de caracteres da marca.
const sample=(length:number)=>'Coisas boas levam tempo e atenção constante quando bem feitas'.slice(0,length).padEnd(length,'n');

function fit(measure:Measurer|undefined,family:string,preferred:number,characters:number,width:number,height:number,lines:number){
  if(!measure)return preferred;
  const text=sample(characters);
  for(let size=preferred;size>=9;size-=1){
    const layout=measure(text,family,size,width);
    if(layout.lines.length<=lines&&layout.widths.every(w=>w<=width)&&layout.lines.length*layout.lineHeight<=height)return size;
  }
  return 9;
}
export function makeTemplate(brand:Brand,format:Format,theme:Template['theme'],id:string,measure?:Measurer):Template{
  const story=format==='Instagram Story',wide=format==='Web Hero';
  const w=wide?1600:1080,h=story?1920:wide?800:1080;
  const {colors,typography,grid}=brand.tokens; const m=Math.max(64,grid.margin);
  const bg=theme==='forest'?colors.primary:theme==='sand'?colors.secondary:colors.background;
  const fg=theme==='forest'?colors.background:colors.primary;
  const imageX=wide?800:0,imageY=wide?0:story?780:535,imageW=wide?800:w,imageH=h-imageY;
  const textW=wide?660:w-m*2;
  // Protected, so the agent can never rewrite it: the eyebrow is derived from the registered brand, not the brief.
  const eyebrow=escapeXml(`${brand.name.toUpperCase()} / Nº 01`);
  // Uma família mais larga que a anterior não pode reprovar o template que ela mesma
  // gerou: o corpo do texto encolhe até caber na geometria.
  const {text:limits}=brand.rules;
  const headlineSize=fit(measure,typography.display,wide?78:88,limits.maxHeadlineCharacters,textW,190,Math.min(2,limits.maxHeadlineLines));
  const descriptionSize=fit(measure,typography.body,20,limits.maxDescriptionCharacters,textW,58,2);
  const ctaSize=fit(measure,typography.body,17,28,textW,28,1);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}" data-protected="background"/><image data-slot="heroImage" x="${imageX}" y="${imageY}" width="${imageW}" height="${imageH}" preserveAspectRatio="xMidYMid slice"/><svg data-slot="logo" x="${m}" y="${m}" width="180" height="56" data-clearspace="32" viewBox="0 0 300 90"/><text x="${m}" y="${story?255:220}" font-family="${typography.body}" font-size="16" letter-spacing="4" fill="${fg}" data-protected="eyebrow">${eyebrow}</text><text data-slot="headline" x="${m}" y="${story?355:306}" data-width="${textW}" data-height="190" data-lines="2" font-family="${typography.display}" font-size="${headlineSize}" fill="${fg}"/><text data-slot="description" x="${m}" y="${story?585:wide?535:439}" data-width="${textW}" data-height="58" data-lines="2" font-family="${typography.body}" font-size="${descriptionSize}" fill="${fg}"/><text data-slot="cta" x="${m}" y="${story?705:wide?685:500}" data-width="${textW}" data-height="28" data-lines="1" font-family="${typography.body}" font-size="${ctaSize}" letter-spacing="2" fill="${fg}"/><line x1="${m}" y1="${story?735:wide?715:516}" x2="${m+150}" y2="${story?735:wide?715:516}" stroke="${fg}" data-protected="accent"/></svg>`;
  // `nameKey` deixa o nome traduzível na interface; `name` fica como texto de reserva.
  const nameKey:TemplateNameKey=wide?'web-hero':story?'vertical-story':'social-square';
  const name=wide?'Web Hero':story?'Vertical Story':'Social Square';
  return {id,brandId:brand.id,name,nameKey,format,theme,alignments:['left'],width:w,height:h,svg,createdAt:new Date().toISOString()};
}
