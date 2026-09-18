'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import Link from 'next/link';
import { ArrowRight,Check,ChevronDown,Code2,Layers,Lock,Plus,RotateCcw,ShieldCheck,X } from 'lucide-react';
import { useWorkspace,Loading,request } from '@/components/ui/workspace';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { templateLabel } from '@/lib/i18n/format';
import { makeTemplate } from '@/lib/brand/template-factory';
import { formats,type Format } from '@/schemas';
import type { Template } from '@/types';

const themes=['ivory','forest','sand'] as const;

export function TemplateGallery(){
  const {workspace,reload}=useWorkspace();const {t}=useI18n();
  const [brandId,setBrandId]=useState('');
  const [format,setFormat]=useState<Format|'All'>('All');
  const [creating,setCreating]=useState(false);
  const [draftFormat,setDraftFormat]=useState<Format>('Instagram Post');
  const [draftTheme,setDraftTheme]=useState<Template['theme']>('ivory');
  const [name,setName]=useState('');
  const [svg,setSvg]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [inspecting,setInspecting]=useState<Template|null>(null);

  const brands=workspace?.brands??[];
  const brand=brands.find(b=>b.id===brandId)??brands[0];
  const scaffold=useMemo(()=>brand?makeTemplate(brand,draftFormat,draftTheme,'00000000-0000-4000-8000-000000000000').svg:'',[brand,draftFormat,draftTheme]);
  if(!workspace)return <Loading/>;

  const templates=workspace.templates.filter(tpl=>tpl.brandId===brand?.id&&(format==='All'||tpl.format===format));
  const markup=svg||scaffold;
  const slotLegend=[['heroImage',t.templates.legend.items.heroImage],['logo',t.templates.legend.items.logo],
    ['headline',t.templates.legend.items.headline],['description',t.templates.legend.items.description],['cta',t.templates.legend.items.cta]] as const;

  async function create(){
    if(!brand)return;
    setBusy(true);setError('');setNotice('');
    try{
      const created=await request<Template>('/api/templates',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:name.trim(),brandId:brand.id,format:draftFormat,theme:draftTheme,svg:markup})},t.common.requestFailed);
      await reload();setCreating(false);setName('');setSvg('');
      setNotice(t.templates.form.created(created.name,created.width,created.height));
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }

  return <>
    <section className="page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-line"/> {t.templates.eyebrow}</div>
        <h1>{t.templates.titleLead} <span className="serif-em">{t.templates.titleEm}</span></h1>
        <p>{t.templates.subtitle}</p>
      </div>
      <button className="button primary" disabled={!brand} onClick={()=>{setCreating(c=>!c);setError('');setNotice('');}}>
        {creating?<X size={15}/>:<Plus size={15}/>}{creating?t.common.cancel:t.templates.add}
      </button>
    </section>

    {notice&&<p className="notice-message" role="status"><Check size={14}/>{notice}</p>}
    {error&&<p className="error-message" role="alert">{error}</p>}

    {!brand?<div className="empty-state"><Layers/><h3>{t.templates.needBrandTitle}</h3><p>{t.templates.needBrandBody}</p><Link className="button" href="/brands">{t.templates.goToBrands}</Link></div>
    :<>
    <div className="brand-switch-row">
      <label className="brand-select"><span className="brand-select-icon">{brand.name.slice(0,1).toLowerCase()}.</span>
        <select aria-label={t.common.selectBrand} value={brand.id} onChange={e=>setBrandId(e.target.value)}>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <ChevronDown size={14}/></label>
      <div className="filter-chips">
        <button className={format==='All'?'chip active':'chip'} onClick={()=>setFormat('All')}>{t.templates.all}</button>
        {formats.map(f=><button key={f} className={format===f?'chip active':'chip'} onClick={()=>setFormat(f)}>{t.formats[f]}</button>)}
      </div>
    </div>

    {creating&&<section className="panel template-form">
      <div className="panel-heading"><h2>{t.templates.form.title}</h2><span className="section-number">{t.templates.form.badge}</span></div>
      <p className="field-hint">{t.templates.form.hint}</p>
      <div className="form-grid">
        <label className="field"><span>{t.templates.form.name}</span><input value={name} maxLength={60} placeholder={t.templates.form.namePlaceholder} onChange={e=>setName(e.target.value)}/></label>
        <label className="field"><span>{t.templates.form.format}</span><select value={draftFormat} onChange={e=>{setDraftFormat(e.target.value as Format);setSvg('');}}>{formats.map(f=><option key={f} value={f}>{t.formats[f]}</option>)}</select></label>
        <label className="field"><span>{t.templates.form.theme}</span><select value={draftTheme} onChange={e=>{setDraftTheme(e.target.value as Template['theme']);setSvg('');}}>{themes.map(th=><option key={th} value={th}>{t.themes[th]}</option>)}</select></label>
      </div>
      <div className="mini-label">{t.templates.form.markup} <button className="text-button" onClick={()=>setSvg('')}><RotateCcw size={12}/>{t.templates.form.reset}</button></div>
      <div className="logo-editor tall">
        <textarea value={markup} spellCheck={false} maxLength={150000} aria-label={t.templates.form.markupAria} onChange={e=>setSvg(e.target.value)}/>
        <div className="logo-preview"><SvgPreview svg={markup} alt={t.templates.form.wireframe}/><small>{t.templates.form.wireframe}</small></div>
      </div>
      <div className="generate-row">
        <span className="mock-label"><Lock size={12}/> {t.templates.form.requirements}</span>
        <button className="button primary" disabled={busy||name.trim().length<2} onClick={()=>void create()}>
          {busy?<span className="spinner small-spinner"/>:<ShieldCheck size={16}/>}{busy?t.templates.form.submitting:t.templates.form.submit}
        </button>
      </div>
    </section>}

    <section className="template-grid">
      {templates.map(template=>{
        const label=templateLabel(t,template);
        return <article key={template.id} className="template-card panel">
          <div className={`template-art ${template.format==='Instagram Story'?'tall':template.format==='Web Hero'?'wide':''}`}>
            <SvgPreview svg={template.svg} alt={t.templates.card.geometryAlt(label)}/>
            <span className="variation-index">{template.width} × {template.height}</span>
          </div>
          <div className="variation-meta">
            <div><h3>{label}</h3><p>{t.formats[template.format]} <span>·</span> {t.themes[template.theme]}</p></div>
            <span className="compliance-badge"><Lock size={11}/>{template.alignments.map(a=>t.alignments[a]).join(', ')}</span>
          </div>
          <div className="variation-actions">
            <button onClick={()=>setInspecting(template)}><Code2 size={13}/>{t.templates.card.inspect}</button>
            <span className="slot-count">{t.templates.card.slots}</span>
          </div>
        </article>;})}
      {!templates.length&&<div className="empty-state"><Layers/><h3>{t.templates.emptyTitle}</h3><p>{t.templates.emptyBody(brand.name)}</p></div>}
    </section>

    <section className="panel slot-legend">
      <div className="panel-heading"><h2>{t.templates.legend.title}</h2><ShieldCheck size={15}/></div>
      <div className="rule-list">{slotLegend.map(([slot,description])=>
        <div key={slot}><span className="rule-check"><Check size={12}/></span><div><strong>{slot}</strong><small>{description}</small></div><Lock size={11}/></div>)}</div>
      <p className="field-hint">{t.templates.legend.noteBefore}<code>{t.templates.legend.noteCode}</code>{t.templates.legend.noteAfter}</p>
      <Link href="/architecture" className="template-link"><ArrowRight size={14}/>{t.templates.legend.link}</Link>
    </section>
    </>}

    {inspecting&&<TemplateInspector template={inspecting} onClose={()=>setInspecting(null)}/>}
  </>;
}

function TemplateInspector({template,onClose}:{template:Template;onClose:()=>void}){
  const [copied,setCopied]=useState(false);const {t}=useI18n();
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();const node=dialog.current;return()=>node?.close();},[]);
  const label=templateLabel(t,template);
  const slots=[...template.svg.matchAll(/data-slot="([a-zA-Z]+)"/g)].map(m=>m[1]);
  const protectedElements=[...template.svg.matchAll(/data-protected="([a-zA-Z]+)"/g)].map(m=>m[1]);
  return <dialog ref={dialog} className="inspect-dialog" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="dialog-header">
      <div><span className="eyebrow">{t.templates.inspector.eyebrow}</span><h2>{label}</h2></div>
      <button className="icon-button" onClick={onClose} aria-label={t.common.close}><X/></button>
    </div>
    <div className="inspect-body">
      <div className="inspect-art"><SvgPreview svg={template.svg} alt={t.templates.card.geometryAlt(label)}/>
        <div className="protected-note"><Lock size={14}/>{t.templates.inspector.protectedNote(protectedElements.length)}</div></div>
      <div>
        <span className="eyebrow">{t.templates.inspector.fixed}</span>
        <dl className="decisions">
          <div><dt>{t.templates.inspector.format}</dt><dd>{t.formats[template.format]}</dd></div>
          <div><dt>{t.templates.inspector.canvas}</dt><dd>{template.width} × {template.height}</dd></div>
          <div><dt>{t.templates.inspector.theme}</dt><dd>{t.themes[template.theme]}</dd></div>
          <div><dt>{t.templates.inspector.alignments}</dt><dd>{template.alignments.map(a=>t.alignments[a]).join(', ')}</dd></div>
          <div><dt>{t.templates.inspector.slots}</dt><dd>{slots.join(', ')}</dd></div>
          <div><dt>{t.templates.inspector.protected}</dt><dd>{protectedElements.join(', ')||t.common.none}</dd></div>
        </dl>
        <details><summary>{t.templates.inspector.viewMarkup}</summary><pre>{template.svg}</pre>
          <button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(template.svg);setCopied(true);}catch{setCopied(false);}}}>
            <Code2 size={13}/>{copied?t.common.copied:t.common.copySvg}</button></details>
      </div>
    </div>
  </dialog>;
}
