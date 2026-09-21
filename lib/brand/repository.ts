import 'server-only';
import { mkdir,readFile,writeFile,rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import type { Brand, BrandFont, Campaign, Template, Asset, Workspace } from '@/types';
import { demoWorkspace } from './demo';
import { cloudConfigured,supabase } from '@/lib/supabase/server';
import { parseLocale, localeCookie, type Locale } from '@/lib/i18n/config';
import { fail } from '@/lib/errors';

type Delta={brands:Brand[];templates:Template[];assets:Asset[];fonts:BrandFont[];campaigns:Campaign[]};
const empty=():Delta=>({brands:[],templates:[],assets:[],fonts:[],campaigns:[]});
const check=(error:{message:string}|null)=>{if(error)throw fail('supabase',{message:error.message});};

async function identity(){
  if(cloudConfigured()){
    const db=await supabase();let {data:{user}}=await db.auth.getUser();
    if(!user){const result=await db.auth.signInAnonymously();check(result.error);user=result.data.user;}
    if(!user)throw fail('identityFailed');return {id:user.id,db};
  }
  if(process.env.VERCEL)throw fail('supabaseRequired');
  const jar=await cookies();let id=jar.get('brand-workspace')?.value;
  if(!id||!/^[a-f0-9-]{36}$/.test(id)){id=randomUUID();jar.set('brand-workspace',id,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:60*60*24*30,path:'/'});}
  return {id,db:null};
}

export async function repository(locale?:Locale){
  const {id,db}=await identity();
  // O workspace demo é semeado no idioma escolhido: a copy da campanha vai para dentro do SVG.
  const resolved=locale??parseLocale((await cookies()).get(localeCookie)?.value);
  const seed=await demoWorkspace(resolved);
  const filename=path.join(process.cwd(),'.data',`${id}.json`);

  async function local(){try{return JSON.parse(await readFile(filename,'utf8')) as Delta;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return empty();throw e;}}

  async function remote(attempt=0):Promise<Delta>{
    const results=await Promise.all(['brands','templates','brand_assets','brand_fonts','campaigns'].map(table=>db!.from(table).select('payload').eq('owner_id',id)));
    // Logo após o sign-in anônimo, o JWT pode chegar ao PostgREST com `iat` alguns
    // milissegundos à frente do relógio dele ("JWT issued at future"). É um desvio
    // entre serviços do próprio Supabase, some sozinho, e sem esta reentrega a
    // primeira carga de um visitante novo falharia de vez em quando.
    const skew=results.find(r=>/issued at future/i.test(r.error?.message??''));
    if(skew&&attempt<2){await new Promise(resolve=>setTimeout(resolve,1200));return remote(attempt+1);}
    for(const result of results)check(result.error);
    return {
      brands:results[0].data!.map(r=>r.payload as Brand),
      templates:results[1].data!.map(r=>r.payload as Template),
      assets:results[2].data!.map(r=>r.payload as Asset),
      fonts:results[3].data!.map(r=>r.payload as BrandFont),
      campaigns:results[4].data!.map(r=>r.payload as Campaign),
    };
  }

  /**
   * O seed sempre entra, mas nunca duas vezes: gerar uma campanha promove os templates
   * do seed para o banco, e sem esta deduplicação eles apareceriam em dobro.
   */
  function merge(delta:Delta):Workspace{
    const keep=<T extends {id:string}>(seeded:T[],saved:T[])=>[...seeded.filter(s=>!saved.some(d=>d.id===s.id)),...saved];
    return {
      brands:keep(seed.brands,delta.brands),
      templates:keep(seed.templates,delta.templates),
      assets:keep(seed.assets,delta.assets),
      fonts:keep(seed.fonts,delta.fonts),
      campaigns:[...delta.campaigns,...seed.campaigns.filter(s=>!delta.campaigns.some(d=>d.id===s.id))],
    };
  }

  /** Metadados apenas. Usado internamente pelas escritas, que não precisam dos bytes. */
  async function readMeta():Promise<Workspace>{return merge(db?await remote():await local());}

  async function read():Promise<Workspace>{
    const delta=db?await remote():await local();
    if(db){
      // Imagens e fontes salvas guardam um caminho de storage; quem consome precisa dos bytes.
      const hydrate=async(file:{data:string},mime:string)=>{
        if(file.data.startsWith('data:'))return;
        const result=await db.storage.from('brand-assets').download(file.data);check(result.error);
        file.data=`data:${mime};base64,${Buffer.from(await result.data!.arrayBuffer()).toString('base64')}`;
      };
      await Promise.all([
        ...delta.assets.map(asset=>hydrate(asset,asset.mime)),
        ...delta.fonts.map(font=>hydrate(font,'font/ttf')),
      ]);
    }
    return merge(delta);
  }

  /**
   * O rename é atômico, mas no Windows ele pode voltar EPERM enquanto um antivírus ou
   * indexador ainda segura o arquivo recém-criado. Uma reentrega curta resolve; sem
   * ela, uma escrita legítima falha de vez em quando.
   */
  async function writeLocal(state:Delta){
    const tmp=`${filename}.${randomUUID()}.tmp`;
    await writeFile(tmp,JSON.stringify(state));
    for(let attempt=0;;attempt++){
      try{return await rename(tmp,filename);}
      catch(e){
        if(attempt>=4||(e as NodeJS.ErrnoException).code!=='EPERM')throw e;
        await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));
      }
    }
  }

  type Entry={kind:keyof Delta;value:Brand|Template|Asset|BrandFont|Campaign};

  /** Grava um lote de uma vez: no modo local, uma leitura e uma escrita para o conjunto. */
  async function saveMany(entries:Entry[]){
    if(!entries.length)return;
    if(db){for(const entry of entries)await save(entry.kind,entry.value);return;}
    await mkdir(path.dirname(filename),{recursive:true});
    const state=await local();
    for(const {kind,value} of entries){
      (state[kind] as {id:string}[])=(state[kind] as {id:string}[]).filter(v=>v.id!==value.id);
      (state[kind] as (typeof value)[]).unshift(value);
    }
    await writeLocal(state);
  }

  async function save(kind:keyof Delta,value:Brand|Template|Asset|BrandFont|Campaign){
    if(db){
      // Semeia as chaves estrangeiras uma vez por inquilino. O RLS confere cada escrita
      // com o JWT do usuário anônimo.
      const brand=kind==='brands'?value as Brand:(await readMeta()).brands.find(b=>b.id===(value as Template).brandId);
      if(!brand)throw fail('brandNotFound');
      check((await db.from('brands').upsert({id:brand.id,owner_id:id,name:brand.name,payload:brand},{onConflict:'owner_id,id'})).error);
      if(kind==='brands'){
        for(const [table,payload] of [['brand_tokens',brand.tokens],['brand_rules',brand.rules]] as const){
          check((await db.from(table).upsert({owner_id:id,brand_id:brand.id,payload},{onConflict:'owner_id,brand_id'})).error);
        }
        return;
      }

      let payload=value;
      // Imagens e fontes vão para o storage; o banco guarda só o caminho.
      if(kind==='assets'||kind==='fonts'){
        const file=value as Asset|BrandFont;
        const storagePath=`${id}/${file.brandId}/${kind==='fonts'?'fonts/':''}${file.id}`;
        const contentType=kind==='assets'?(file as Asset).mime:'font/ttf';
        const upload=await db.storage.from('brand-assets').upload(storagePath,Buffer.from(file.data.split(',')[1],'base64'),{contentType,upsert:true});
        check(upload.error);
        payload={...file,data:storagePath};
      }

      const table=kind==='assets'?'brand_assets':kind==='fonts'?'brand_fonts':kind;
      check((await db.from(table).upsert({id:value.id,owner_id:id,brand_id:(value as Template).brandId,payload},{onConflict:'owner_id,id'})).error);

      if(kind==='campaigns'){
        const campaign=value as Campaign;
        const workspace=await readMeta();
        for(const variation of campaign.variations){
          const template=workspace.templates.find(t=>t.id===variation.spec.templateId);
          if(!template)throw fail('templateUnavailable');
          check((await db.from('templates').upsert({id:template.id,owner_id:id,brand_id:template.brandId,payload:template},{onConflict:'owner_id,id'})).error);
          check((await db.from('creative_specs').upsert({id:variation.id,owner_id:id,brand_id:brand.id,campaign_id:campaign.id,template_id:template.id,payload:variation.spec},{onConflict:'owner_id,id'})).error);
          check((await db.from('generated_assets').insert({owner_id:id,brand_id:brand.id,creative_spec_id:variation.id,payload:{svg:variation.svg,compliance:variation.compliance}})).error);
        }
      }
    }else await saveMany([{kind,value}]);
  }

  return {read,save,saveMany,cloud:Boolean(db),locale:resolved};
}
