'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine,ArrowRight,Check,ChevronDown,Layers,Lock,Maximize2,ShieldCheck,Sparkles,Square,Workflow } from 'lucide-react';
import { useWorkspace,Loading,request } from '@/components/ui/workspace';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { templateLabel } from '@/lib/i18n/format';
import { Inspect } from './inspect';
import { formats,type Format } from '@/schemas';
import type { Campaign,Variation } from '@/types';

export function Studio(){
  const {workspace,setWorkspace}=useWorkspace();const {t}=useI18n();
  const [brandId,setBrandId]=useState(''),[brief,setBrief]=useState(''),[format,setFormat]=useState<Format>('Instagram Post'),
    [busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState<Variation|null>(null),
    [activeCampaign,setActiveCampaign]=useState<Campaign|null>(null),[generated,setGenerated]=useState(false),[exporting,setExporting]=useState('');
  if(!workspace)return <Loading/>;
  const brand=workspace.brands.find(b=>b.id===brandId)||workspace.brands[0];
  const assets=workspace.assets.filter(a=>a.brandId===brand.id&&a.kind==='image');
  const templates=workspace.templates.filter(t=>t.brandId===brand.id);
  const campaign=activeCampaign?.brandId===brand.id?activeCampaign:workspace.campaigns.find(c=>c.brandId===brand.id);
  const variations=campaign?.variations||[];
  // O briefing padrão é conteúdo demo, então acompanha o idioma até o usuário digitar o seu.
  const briefValue=brief||t.demo.brief;

  async function generate(){
    setBusy(true);setError('');
    try{
      const result=await request<Campaign>('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({brandId:brand.id,brief:briefValue,format})},t.common.requestFailed);
      setActiveCampaign(result);setWorkspace(w=>w?{...w,campaigns:[result,...w.campaigns]}:w);setGenerated(true);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function download(id:string,kind:'svg'|'png'){
    setExporting(id+kind);setError('');
    try{
      const response=await fetch(`/api/export?id=${id}&format=${kind}`);
      if(!response.ok)throw new Error((await response.json()).error);
      const url=URL.createObjectURL(await response.blob());
      const a=document.createElement('a');a.href=url;a.download=`${brand.name}-${id.slice(0,8)}.${kind}`;a.click();URL.revokeObjectURL(url);
    }catch(e){setError((e as Error).message);}finally{setExporting('');}
  }

  const complianceItems=[t.studioPage.compliance.items.logo,t.studioPage.compliance.items.palette,t.studioPage.compliance.items.typography,
    t.studioPage.compliance.items.layout,t.studioPage.compliance.items.copy(brand.rules.text.maxHeadlineCharacters),t.studioPage.compliance.items.assets];

  return <>
    <section className="page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-line"/> {t.studioPage.eyebrow}</div>
        <h1>{t.studioPage.titleLead} <span className="serif-em">{t.studioPage.titleEm}</span></h1>
        <p>{t.studioPage.subtitle}</p>
      </div>
      <Link href="/architecture" className="button secondary"><Workflow size={15}/>{t.studioPage.howItWorks}<ArrowRight size={13} className="diagonal-arrow"/></Link>
    </section>

    <div className="pipeline-strip">
      <span><span className="step-number">01</span>{t.studioPage.pipeline.one}</span><ArrowRight/>
      <span><span className="step-number">02</span>{t.studioPage.pipeline.two}</span><ArrowRight/>
      <span><span className="step-number">03</span>{t.studioPage.pipeline.three}</span>
      <span className="pipeline-end"><Lock size={12}/> {t.studioPage.pipeline.end}</span>
    </div>

    <section className="studio-grid">
      <aside className="context-panel panel">
        <div className="panel-heading"><h2>{t.studioPage.context.title}</h2><span className="section-number">01</span></div>
        <label className="brand-select"><span className="brand-select-icon">{brand.name.slice(0,1).toLowerCase()}.</span>
          <select aria-label={t.common.selectBrand} value={brand.id} onChange={e=>{setBrandId(e.target.value);setGenerated(false);setActiveCampaign(null);}}>
            {workspace.brands.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select>
          <ChevronDown size={14}/></label>
        <div className="context-logo"><SvgPreview svg={brand.logoSvg} alt={brand.name}/><span>{t.studioPage.context.officialLogo}</span></div>
        <div className="context-section"><div className="mini-label">{t.studioPage.context.palette} <Lock size={11}/></div>
          <div className="swatches">{[...new Set(Object.values(brand.tokens.colors).flat())].map(color=><div key={color}><span style={{background:color}}/><small>{color}</small></div>)}</div></div>
        <div className="context-section"><div className="mini-label">{t.studioPage.context.typography} <Lock size={11}/></div>
          <div className="font-preview"><span className="display-aa">Aa</span><div>{brand.tokens.typography.display}<small>{t.studioPage.context.display}</small></div></div>
          <div className="font-preview"><span>Aa</span><div>{brand.tokens.typography.body}<small>{t.studioPage.context.body}</small></div></div></div>
        <div className="context-section"><div className="mini-label">{t.studioPage.context.assets} <span>{t.studioPage.context.assetsAvailable(assets.length)}</span></div>
          <div className="asset-thumbs">{assets.slice(0,3).map(a=><img key={a.id} src={a.data} alt={a.name}/>)}
            {!assets.length&&<Link href="/brands">{t.studioPage.context.uploadFirst}</Link>}</div></div>
        <Link href="/templates" className="template-link"><Layers size={14}/>{t.studioPage.context.approvedTemplates(templates.length)}<ArrowRight size={13}/></Link>
        <Link href="/brands" className="view-brand">{t.studioPage.context.viewBrand} <ArrowRight size={13}/></Link>
      </aside>

      <div className="brief-panel panel">
        <div className="panel-heading"><h2>{t.studioPage.brief.title}</h2><span className="section-number">02</span></div>
        <label className="field-label" htmlFor="brief">{t.studioPage.brief.label}</label>
        <p className="field-hint">{t.studioPage.brief.hint}</p>
        <div className="brief-input">
          <textarea id="brief" maxLength={2000} value={briefValue} onChange={e=>setBrief(e.target.value)} placeholder={t.studioPage.brief.placeholder}/>
          <div><span><Sparkles size={12}/> {t.studioPage.brief.nudge}</span><span>{t.studioPage.brief.counter(briefValue.length)}</span></div>
        </div>
        <div className="format-header"><label className="field-label" htmlFor="format">{t.studioPage.brief.formatLabel}</label><span>{t.studioPage.brief.formatNote}</span></div>
        <div className="format-select"><Square size={16}/>
          <select id="format" value={format} onChange={e=>setFormat(e.target.value as Format)}>{formats.map(f=><option key={f} value={f}>{t.formats[f]}</option>)}</select>
          <span>{format==='Instagram Story'?'9:16':format==='Web Hero'?'2:1':'1:1'}</span><ChevronDown size={14}/></div>
        <div className="agent-note"><span className="agent-icon"><Sparkles size={17}/></span>
          <div><strong>{t.studioPage.brief.agentTitle}</strong><p>{t.studioPage.brief.agentBody}</p></div></div>
        {error&&<p className="error-message" role="alert">{error}</p>}
        <div className="generate-row">
          <span className="mock-label"><span className="live-dot"/> {t.studioPage.brief.mockLabel}</span>
          <button className="button primary" disabled={busy||briefValue.trim().length<20||!assets.length} onClick={()=>void generate()}>
            {busy?<span className="spinner small-spinner"/>:<Sparkles size={16}/>} {busy?t.studioPage.brief.generating:t.studioPage.brief.generate} {!busy&&<ArrowRight size={16}/>}
          </button>
        </div>
      </div>

      <aside className="compliance-panel panel">
        <div className="panel-heading"><h2>{t.studioPage.compliance.title}</h2><ShieldCheck size={16}/></div>
        <div className="guard-icon"><ShieldCheck size={26}/></div>
        <h3>{generated?t.studioPage.compliance.headingDone:t.studioPage.compliance.headingIdle}</h3>
        <p className="compliance-intro">{generated?t.studioPage.compliance.introDone:t.studioPage.compliance.introIdle}</p>
        <div className="rule-list">{complianceItems.map(([name,description])=>
          <div key={name}><span className="rule-check"><Check size={12}/></span><div><strong>{name}</strong><small>{description}</small></div><Lock size={11}/></div>)}</div>
        <div className="compliance-bottom"><span className="live-dot"/>
          {generated?t.studioPage.compliance.doneFooter(variations.filter(v=>v.compliance.approved).length,variations.length):t.studioPage.compliance.idleFooter}</div>
      </aside>
    </section>

    <section className="results-section">
      <div className="results-heading">
        <div><h2>{t.studioPage.results.title} <span>{variations.length.toString().padStart(2,'0')}</span></h2>
          <p>{generated?t.studioPage.results.subtitleDone:t.studioPage.results.subtitleIdle}</p></div>
        <span className="result-status"><span className="live-dot"/>
          {variations.length?t.studioPage.results.statusDone(variations.filter(v=>v.compliance.approved).length):t.studioPage.results.statusIdle}</span>
      </div>
      <div className={`variation-grid ${busy?'generating':''}`}>{variations.map((variation,index)=>
        <article className="variation-card" key={variation.id}>
          <div className="artboard">
            <span className="variation-index">{t.studioPage.results.direction(index+1)}</span>
            {variation.svg
              ?<SvgPreview svg={variation.svg} alt={variation.spec.headline}/>
              :<div className="blocked-preview"><ShieldCheck size={28}/><h3>{t.studioPage.results.blockedTitle}</h3><p>{t.studioPage.results.blockedBody}</p></div>}
            <button className="expand-button" onClick={()=>setSelected(variation)} aria-label={t.studioPage.results.inspectAria(index+1)}><Maximize2 size={14}/></button>
          </div>
          <div className="variation-meta">
            <div><h3>{t.studioPage.results.names[index]??variation.spec.headline}</h3>
              <p>{templateLabel(t,{name:variation.templateName,nameKey:variation.templateNameKey})} <span>·</span> {t.formats[variation.format]}</p></div>
            <span className={`compliance-badge ${variation.compliance.approved?'':'failed'}`}><ShieldCheck size={12}/>{variation.compliance.percentage}%</span>
          </div>
          <div className="variation-actions">
            <button onClick={()=>setSelected(variation)}><Workflow size={13}/>{t.studioPage.results.inspect}</button>
            <div>
              <button disabled={!variation.compliance.approved||Boolean(exporting)} onClick={()=>void download(variation.id,'svg')}><ArrowDownToLine size={12}/>{exporting===variation.id+'svg'?'…':'SVG'}</button>
              <button disabled={!variation.compliance.approved||Boolean(exporting)} onClick={()=>void download(variation.id,'png')}><ArrowDownToLine size={12}/>{exporting===variation.id+'png'?'…':'PNG'}</button>
            </div>
          </div>
        </article>)}</div>
      {!variations.length&&<div className="empty-state"><Layers/><h3>{t.studioPage.results.emptyTitle}</h3><p>{t.studioPage.results.emptyBody}</p></div>}
    </section>

    <div className="studio-footnote"><Lock size={13}/><span>{t.studioPage.footnote}</span>
      <Link href="/architecture">{t.studioPage.exploreEngine} <ArrowRight size={13}/></Link></div>
    {selected&&<Inspect variation={selected} onClose={()=>setSelected(null)}/>}
  </>;
}
