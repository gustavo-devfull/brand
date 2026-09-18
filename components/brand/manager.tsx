'use client';
import { useRef,useState } from 'react';
import Link from 'next/link';
import { ArrowRight,Check,ChevronDown,Download,Grid3x3,Layers,Lock,Pencil,Plus,Ruler,ShieldCheck,TriangleAlert,Type,Upload,X } from 'lucide-react';
import { useWorkspace,Loading,request } from '@/components/ui/workspace';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { builtinFamilies } from '@/lib/renderer/families';
import type { Asset,Brand,BrandFont } from '@/types';

const placeholderLogo='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><circle cx="45" cy="45" r="26" fill="#243D33"/><rect x="88" y="32" width="170" height="8" fill="#243D33"/><rect x="88" y="52" width="110" height="8" fill="#C4A889"/></svg>';

/**
 * Os campos numéricos ficam como texto enquanto o formulário está aberto: apagar um
 * campo para digitar outro valor é um gesto normal, e converter na hora transformaria
 * o vazio em zero — que o schema recusa com uma mensagem obscura.
 */
type Draft=typeof blank;
const blank={name:'',primary:'#243D33',secondary:'#C4A889',background:'#F4F0E8',accent:'#C4A889',display:'Cormorant Garamond',body:'DM Sans',
  small:'8',medium:'24',large:'64',columns:'12',margin:'64',gutter:'24',minimumWidth:'140',minimumClearspace:'24',
  maxHeadlineCharacters:'60',maxHeadlineLines:'2',maxDescriptionCharacters:'120',requireImage:true,logoSvg:placeholderLogo};

const hex=/^#[0-9a-fA-F]{6}$/;
const numeric={small:{min:1},medium:{min:1},large:{min:1},columns:{min:1,max:24,int:true},margin:{min:1},gutter:{min:1},
  minimumWidth:{min:1},minimumClearspace:{min:0,max:200},maxHeadlineCharacters:{min:1,max:200,int:true},
  maxHeadlineLines:{min:1,max:5,int:true},maxDescriptionCharacters:{min:1,max:500,int:true}} as const;

/** Espelha o que o schema exige, para o erro aparecer no campo em vez de virar um 400. */
function invalidFields(draft:Draft){
  const bad=new Set<string>();
  if(draft.name.trim().length<2)bad.add('name');
  if(!draft.logoSvg.trim())bad.add('logoSvg');
  for(const key of ['primary','secondary','background','accent'] as const)if(!hex.test(draft[key]))bad.add(key);
  for(const [key,rule] of Object.entries(numeric)){
    const raw=draft[key as keyof typeof numeric];
    const value=Number(raw);
    const max=(rule as {max?:number}).max;
    if(raw.trim()===''||!Number.isFinite(value)||value<rule.min||(max!==undefined&&value>max)||('int' in rule&&!Number.isInteger(value)))bad.add(key);
  }
  return bad;
}

const toDraft=(brand:Brand):Draft=>({
  name:brand.name,primary:brand.tokens.colors.primary,secondary:brand.tokens.colors.secondary,
  background:brand.tokens.colors.background,accent:brand.tokens.colors.accent,
  display:brand.tokens.typography.display,body:brand.tokens.typography.body,
  small:String(brand.tokens.spacing.small),medium:String(brand.tokens.spacing.medium),large:String(brand.tokens.spacing.large),
  columns:String(brand.tokens.grid.columns),margin:String(brand.tokens.grid.margin),gutter:String(brand.tokens.grid.gutter),
  minimumWidth:String(brand.rules.logo.minimumWidth),minimumClearspace:String(brand.rules.logo.minimumClearspace),
  maxHeadlineCharacters:String(brand.rules.text.maxHeadlineCharacters),maxHeadlineLines:String(brand.rules.text.maxHeadlineLines),
  maxDescriptionCharacters:String(brand.rules.text.maxDescriptionCharacters),requireImage:brand.rules.requireImage,logoSvg:brand.logoSvg,
});

const toPayload=(draft:Draft)=>({
  name:draft.name,logoSvg:draft.logoSvg,
  tokens:{colors:{primary:draft.primary,secondary:draft.secondary,background:draft.background,accent:draft.accent,additional:[]},
    typography:{display:draft.display,body:draft.body,weights:[400]},
    spacing:{small:Number(draft.small),medium:Number(draft.medium),large:Number(draft.large)},
    grid:{columns:Number(draft.columns),margin:Number(draft.margin),gutter:Number(draft.gutter)}},
  rules:{logo:{minimumWidth:Number(draft.minimumWidth),minimumClearspace:Number(draft.minimumClearspace),rotationAllowed:false,recolorAllowed:false},
    text:{maxHeadlineCharacters:Number(draft.maxHeadlineCharacters),maxHeadlineLines:Number(draft.maxHeadlineLines),maxDescriptionCharacters:Number(draft.maxDescriptionCharacters)},
    requireImage:draft.requireImage},
});

export function BrandManager(){
  const {workspace,reload}=useWorkspace();const {t}=useI18n();
  const [brandId,setBrandId]=useState('');
  const [mode,setMode]=useState<'idle'|'create'|'edit'>('idle');
  const [draft,setDraft]=useState<Draft>(blank);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [googleFamily,setGoogleFamily]=useState('');
  const imageInput=useRef<HTMLInputElement>(null);
  const fontInput=useRef<HTMLInputElement>(null);
  if(!workspace)return <Loading/>;

  const brand=workspace.brands.find(b=>b.id===brandId)??workspace.brands[0];
  const assets=workspace.assets.filter(a=>a.brandId===brand?.id);
  const templates=workspace.templates.filter(tpl=>tpl.brandId===brand?.id);
  const brandFonts=workspace.fonts.filter(f=>f.brandId===brand?.id);
  const families=[...builtinFamilies,...brandFonts.map(f=>f.family)];
  const set=<K extends keyof Draft>(key:K,value:Draft[K])=>setDraft(d=>({...d,[key]:value}));
  const reset=()=>{setMode('idle');setDraft(blank);};
  const start=(next:'create'|'edit')=>{setError('');setNotice('');setDraft(next==='edit'&&brand?toDraft(brand):blank);setMode(m=>m===next?'idle':next);};

  async function upload(files:FileList|null){
    if(!files?.length||!brand)return;
    const count=files.length;
    setBusy('upload');setError('');setNotice('');
    try{
      for(const file of Array.from(files)){
        const form=new FormData();form.append('file',file);form.append('brandId',brand.id);
        const response=await fetch('/api/assets',{method:'POST',body:form});
        if(!response.ok)throw new Error((await response.json()).error);
      }
      await reload();setNotice(t.brands.library.uploaded(count,brand.name));
    }catch(e){setError((e as Error).message);}
    finally{setBusy('');if(imageInput.current)imageInput.current.value='';}
  }

  async function submit(){
    setBusy('brand');setError('');setNotice('');
    try{
      if(mode==='edit'&&brand){
        const result=await request<{brand:Brand;regeneratedTemplates:number;customTemplates:number}>('/api/brands',
          {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:brand.id,...toPayload(draft)})},t.common.requestFailed);
        await reload();reset();
        setNotice(`${t.brands.edit.saved(result.brand.name,result.regeneratedTemplates)}${result.customTemplates?` ${t.brands.edit.customWarning(result.customTemplates)}`:''}`);
      }else{
        const created=await request<Brand>('/api/brands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(toPayload(draft))},t.common.requestFailed);
        await reload();setBrandId(created.id);reset();
        setNotice(t.brands.form.created(created.name));
      }
    }catch(e){setError((e as Error).message);}
    finally{setBusy('');}
  }

  async function addGoogleFont(){
    if(!brand||!googleFamily.trim())return;
    setBusy('google');setError('');setNotice('');
    try{
      const font=await request<BrandFont>('/api/fonts',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({brandId:brand.id,family:googleFamily.trim()})},t.common.requestFailed);
      await reload();setGoogleFamily('');setNotice(t.brands.fonts.added(font.family));
    }catch(e){setError((e as Error).message);}
    finally{setBusy('');}
  }

  async function uploadFont(files:FileList|null){
    if(!files?.length||!brand)return;
    setBusy('font');setError('');setNotice('');
    try{
      const form=new FormData();form.append('file',files[0]);form.append('brandId',brand.id);
      const response=await fetch('/api/fonts',{method:'PUT',body:form});
      if(!response.ok)throw new Error((await response.json()).error);
      const font=await response.json() as BrandFont;
      await reload();setNotice(t.brands.fonts.added(font.family));
    }catch(e){setError((e as Error).message);}
    finally{setBusy('');if(fontInput.current)fontInput.current.value='';}
  }

  const colorFields=[['primary',t.brands.form.primary],['secondary',t.brands.form.secondary],['background',t.brands.form.background],['accent',t.brands.form.accent]] as const;
  const numberFields=[['small',t.brands.form.small],['medium',t.brands.form.medium],['large',t.brands.form.large],['columns',t.brands.form.columns],['margin',t.brands.form.margin],['gutter',t.brands.form.gutter]] as const;
  const ruleFields=[['minimumWidth',t.brands.form.minimumWidth],['minimumClearspace',t.brands.form.minimumClearspace],['maxHeadlineCharacters',t.brands.form.maxHeadlineCharacters],['maxHeadlineLines',t.brands.form.maxHeadlineLines],['maxDescriptionCharacters',t.brands.form.maxDescriptionCharacters]] as const;
  const editing=mode==='edit';
  const invalid=invalidFields(draft);

  return <>
    <section className="page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-line"/> {t.brands.eyebrow}</div>
        <h1>{t.brands.titleLead} <span className="serif-em">{t.brands.titleEm}</span></h1>
        <p>{t.brands.subtitle}</p>
      </div>
      <div className="heading-actions">
        {brand&&<button className="button secondary" onClick={()=>start('edit')}>
          {editing?<X size={15}/>:<Pencil size={15}/>}{editing?t.common.cancel:t.brands.edit.action}</button>}
        <button className="button primary" onClick={()=>start('create')}>
          {mode==='create'?<X size={15}/>:<Plus size={15}/>}{mode==='create'?t.common.cancel:t.brands.register}
        </button>
      </div>
    </section>

    {notice&&<p className="notice-message" role="status"><Check size={14}/>{notice}</p>}
    {error&&mode==='idle'&&<p className="error-message" role="alert">{error}</p>}

    {mode!=='idle'&&<section className="panel brand-form">
      <div className="panel-heading">
        <h2>{editing&&brand?t.brands.edit.title(brand.name):t.brands.form.title}</h2>
        <span className="section-number">{editing?t.brands.edit.badge:t.brands.form.badge}</span>
      </div>
      <p className="field-hint">{editing?t.brands.edit.hint:t.brands.form.hint}</p>
      <div className="form-grid">
        <label className="field"><span>{t.brands.form.name}</span><input value={draft.name} maxLength={60} placeholder="Serein" onChange={e=>set('name',e.target.value)}/></label>
        <label className="field"><span>{t.brands.form.display}</span>
          <select value={draft.display} onChange={e=>set('display',e.target.value)}>{families.map(f=><option key={f} value={f}>{f}</option>)}</select></label>
        <label className="field"><span>{t.brands.form.body}</span>
          <select value={draft.body} onChange={e=>set('body',e.target.value)}>{families.map(f=><option key={f} value={f}>{f}</option>)}</select></label>
      </div>
      <div className="mini-label">{t.brands.form.colorTokens}</div>
      <div className="form-grid">
        {colorFields.map(([key,label])=>
          <label className={invalid.has(key)?'field color-field invalid':'field color-field'} key={key}><span>{label}</span>
            <div><input type="color" value={hex.test(draft[key])?draft[key]:'#000000'} onChange={e=>set(key,e.target.value.toUpperCase())} aria-label={t.brands.form.colorAria(label)}/>
            <input value={draft[key]} aria-invalid={invalid.has(key)} onChange={e=>set(key,e.target.value.toUpperCase())} maxLength={7}/></div></label>)}
      </div>
      <div className="mini-label">{t.brands.form.spacingGrid}</div>
      <div className="form-grid">
        {numberFields.map(([key,label])=>
          <label className={invalid.has(key)?'field invalid':'field'} key={key}><span>{label}</span>
            <input type="number" inputMode="numeric" value={draft[key]} aria-invalid={invalid.has(key)} onChange={e=>set(key,e.target.value)}/></label>)}
      </div>
      <div className="mini-label">{t.brands.form.enforcedRules}</div>
      <div className="form-grid">
        {ruleFields.map(([key,label])=>
          <label className={invalid.has(key)?'field invalid':'field'} key={key}><span>{label}</span>
            <input type="number" inputMode="numeric" value={draft[key]} aria-invalid={invalid.has(key)} onChange={e=>set(key,e.target.value)}/></label>)}
        <label className="field checkbox-field"><input type="checkbox" checked={draft.requireImage} onChange={e=>set('requireImage',e.target.checked)}/><span>{t.brands.form.requireImage}</span></label>
      </div>
      <p className="field-hint">{t.brands.form.logoHint}</p>
      <div className="mini-label">{t.brands.form.logoLabel}</div>
      <div className="logo-editor">
        <textarea value={draft.logoSvg} onChange={e=>set('logoSvg',e.target.value)} spellCheck={false} maxLength={100000} aria-label={t.brands.form.logoAria}/>
        <div className="logo-preview"><SvgPreview svg={draft.logoSvg} alt={t.brands.form.livePreview}/><small>{t.brands.form.livePreview}</small></div>
      </div>
      {error&&<p className="error-message" role="alert">{error}</p>}
      <div className="generate-row">
        <span className="mock-label">{invalid.size
          ?<><TriangleAlert size={12}/> {t.brands.form.fixFields(invalid.size)}</>
          :<><Lock size={12}/> {t.brands.form.sanitized}</>}</span>
        <button className="button primary" disabled={busy==='brand'||invalid.size>0} onClick={()=>void submit()}>
          {busy==='brand'?<span className="spinner small-spinner"/>:<ShieldCheck size={16}/>}
          {busy==='brand'?(editing?t.brands.edit.submitting:t.brands.form.submitting):(editing?t.brands.edit.submit:t.brands.form.submit)}
        </button>
      </div>
    </section>}

    {!brand?<div className="empty-state"><Layers/><h3>{t.brands.emptyTitle}</h3><p>{t.brands.emptyBody}</p></div>
    :<><div className="brand-switch-row">
      <label className="brand-select"><span className="brand-select-icon">{brand.name.slice(0,1).toLowerCase()}.</span>
        <select aria-label={t.common.selectBrand} value={brand.id} onChange={e=>{setBrandId(e.target.value);reset();}}>{workspace.brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <ChevronDown size={14}/></label>
      <span className="result-status"><span className="live-dot"/>{t.brands.counts(templates.length,assets.length)}</span>
    </div>

    <section className="brand-grid">
      <div className="panel">
        <div className="panel-heading"><h2>{t.brands.identity.title}</h2><Lock size={14}/></div>
        <div className="context-logo"><SvgPreview svg={brand.logoSvg} alt={brand.name}/><span>{t.studioPage.context.officialLogo}</span></div>
        <dl className="decisions">
          <div><dt>{t.brands.identity.registered}</dt><dd>{new Date(brand.createdAt).toLocaleDateString(t.htmlLang)}</dd></div>
          <div><dt>{t.brands.identity.rotation}</dt><dd>{brand.rules.logo.rotationAllowed?t.common.allowed:t.common.forbidden}</dd></div>
          <div><dt>{t.brands.identity.recolor}</dt><dd>{brand.rules.logo.recolorAllowed?t.common.allowed:t.common.forbidden}</dd></div>
          <div><dt>{t.brands.identity.minimumWidth}</dt><dd>{brand.rules.logo.minimumWidth}px</dd></div>
          <div><dt>{t.brands.identity.clearspace}</dt><dd>{brand.rules.logo.minimumClearspace}px</dd></div>
        </dl>
      </div>

      <div className="panel">
        <div className="panel-heading"><h2>{t.brands.tokens.title}</h2><Type size={15}/></div>
        <div className="mini-label">{t.brands.tokens.color} <Lock size={11}/></div>
        <div className="swatches">{Object.entries(brand.tokens.colors).flatMap(([key,value])=>Array.isArray(value)?value.map((v,i)=>[`${key}-${i}`,v] as const):[[key,value] as const]).map(([key,color])=>
          <div key={key}><span style={{background:color}}/><small>{color}</small></div>)}</div>
        <div className="mini-label">{t.brands.tokens.typography} <Lock size={11}/></div>
        <div className="font-preview"><span className="display-aa">Aa</span><div>{brand.tokens.typography.display}<small>{t.brands.tokens.display}</small></div></div>
        <div className="font-preview"><span>Aa</span><div>{brand.tokens.typography.body}<small>{t.brands.tokens.body}</small></div></div>
        <div className="mini-label">{t.brands.tokens.spacingGrid} <Ruler size={11}/></div>
        <div className="token-chips">
          <span>S {brand.tokens.spacing.small}</span><span>M {brand.tokens.spacing.medium}</span><span>L {brand.tokens.spacing.large}</span>
          <span><Grid3x3 size={11}/>{t.brands.tokens.columns(brand.tokens.grid.columns)}</span>
          <span>{t.brands.tokens.margin(brand.tokens.grid.margin)}</span><span>{t.brands.tokens.gutter(brand.tokens.grid.gutter)}</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading"><h2>{t.brands.constraints.title}</h2><ShieldCheck size={15}/></div>
        <div className="rule-list">
          {[[t.brands.constraints.headlineCharacters,t.brands.constraints.maximum(brand.rules.text.maxHeadlineCharacters)],
            [t.brands.constraints.headlineLines,t.brands.constraints.maximum(brand.rules.text.maxHeadlineLines)],
            [t.brands.constraints.descriptionCharacters,t.brands.constraints.maximum(brand.rules.text.maxDescriptionCharacters)],
            [t.brands.constraints.imagery,brand.rules.requireImage?t.common.required:t.common.optional],
            [t.brands.constraints.palette,t.brands.constraints.approvedTokens],
            [t.brands.constraints.typography,t.brands.constraints.registeredTypefaces]].map(([name,description])=>
            <div key={name}><span className="rule-check"><Check size={12}/></span><div><strong>{name}</strong><small>{description}</small></div><Lock size={11}/></div>)}
        </div>
        <Link href="/templates" className="template-link"><Layers size={14}/>{t.brands.constraints.approvedTemplates(templates.length)}<ArrowRight size={13}/></Link>
      </div>
    </section>

    <section className="panel font-library">
      <div className="panel-heading"><h2>{t.brands.fonts.title}</h2><Type size={15}/></div>
      <p className="field-hint">{t.brands.fonts.hint}</p>

      <div className="font-sources">
        <div className="font-source">
          <label className="field"><span>{t.brands.fonts.googleLabel}</span>
            <div className="inline-field">
              <input value={googleFamily} maxLength={64} placeholder={t.brands.fonts.googlePlaceholder}
                onChange={e=>setGoogleFamily(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void addGoogleFont();}}}/>
              <button className="button" disabled={busy==='google'||googleFamily.trim().length<1} onClick={()=>void addGoogleFont()}>
                {busy==='google'?<span className="spinner small-spinner"/>:<Download size={14}/>}
                {busy==='google'?t.brands.fonts.googleBusy:t.brands.fonts.googleAction}</button>
            </div></label>
          <small>{t.brands.fonts.googleHint}</small>
        </div>
        <div className="font-source">
          <label className="field"><span>{t.brands.fonts.uploadLabel}</span>
            <label className="upload-drop compact" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void uploadFont(e.dataTransfer.files);}}>
              <input ref={fontInput} type="file" accept=".ttf,.otf,font/ttf,font/otf" onChange={e=>void uploadFont(e.target.files)}/>
              {busy==='font'?<><span className="spinner"/><strong>{t.brands.fonts.uploadBusy}</strong></>
                :<><span className="stat-icon"><Upload size={16}/></span><strong>{t.brands.fonts.uploadAction}</strong></>}
            </label></label>
          <small>{t.brands.fonts.uploadHint}</small>
        </div>
      </div>

      <div className="font-list">
        {builtinFamilies.map(family=>
          <div key={family} className="font-row">
            <span className="font-sample" style={{fontFamily:`"${family}", serif`}}>Aa</span>
            <div><strong>{family}</strong><small>{t.brands.fonts.builtin}</small></div>
            {[brand.tokens.typography.display,brand.tokens.typography.body].includes(family)&&<span className="compliance-badge"><Lock size={11}/>{t.brands.fonts.inUse}</span>}
          </div>)}
        {brandFonts.map((font:BrandFont)=>
          <div key={font.id} className="font-row">
            <span className="font-sample">Aa</span>
            <div><strong>{font.family}</strong><small>{font.source==='google'?t.brands.fonts.google:t.brands.fonts.upload}</small></div>
            {[brand.tokens.typography.display,brand.tokens.typography.body].includes(font.family)&&<span className="compliance-badge"><Lock size={11}/>{t.brands.fonts.inUse}</span>}
          </div>)}
        {!brandFonts.length&&<p className="field-hint">{t.brands.fonts.empty}</p>}
      </div>
    </section>

    <section className="panel asset-library">
      <div className="panel-heading"><h2>{t.brands.library.title}</h2><span className="section-number">{assets.length.toString().padStart(2,'0')}</span></div>
      <p className="field-hint">{t.brands.library.hint}</p>
      <label className="upload-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files);}}>
        <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" multiple onChange={e=>void upload(e.target.files)}/>
        {busy==='upload'?<><span className="spinner"/><strong>{t.brands.library.uploading}</strong></>
          :<><span className="stat-icon"><Upload size={18}/></span><strong>{t.brands.library.drop}</strong><small>{t.brands.library.dropHint}</small></>}
      </label>
      <div className="asset-grid">{assets.map((asset:Asset)=>
        <figure key={asset.id} className="asset-card">
          <img src={asset.data} alt={asset.name}/>
          <figcaption><strong>{asset.name}</strong><small>{t.assetKinds[asset.kind]} · {asset.mime.replace('image/','').toUpperCase()}</small></figcaption>
        </figure>)}
        {!assets.length&&<p className="field-hint">{t.brands.library.empty}</p>}
      </div>
    </section></>}
  </>;
}
