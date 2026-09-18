'use client';
import Link from 'next/link';
import { ArrowRight,Braces,Database,FileCheck2,Image as ImageIcon,Lock,Ruler,ShieldCheck,Sparkles,Type } from 'lucide-react';
import { useI18n } from '@/components/ui/locale';

const stageIcons=[Database,Sparkles,FileCheck2,Ruler,ShieldCheck];
const guaranteeIcons=[Lock,Type,ImageIcon,Braces];

export function ArchitectureOverview(){
  const {t}=useI18n();
  return <>
    <section className="page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-line"/> {t.architecture.eyebrow}</div>
        <h1>{t.architecture.titleLead} <span className="serif-em">{t.architecture.titleEm}</span></h1>
        <p>{t.architecture.subtitle}</p>
      </div>
      <Link href="/campaigns" className="button primary"><Sparkles size={15}/>{t.architecture.openStudio}<ArrowRight size={15}/></Link>
    </section>

    <section className="stage-list">
      {t.architecture.stages.map((stage,index)=>{
        const Icon=stageIcons[index];
        return <article key={stage.title} className="panel stage-card">
          <div className="stage-head">
            <span className="stat-icon"><Icon size={18}/></span>
            <div><span className="step-number">{`0${index+1}`}</span><h2>{stage.title}</h2></div>
          </div>
          <p>{stage.body}</p>
          <ul className="stage-points">{stage.points.map(point=><li key={point}><span className="rule-check"><ShieldCheck size={11}/></span>{point}</li>)}</ul>
        </article>;})}
    </section>

    <section className="panel flow-panel">
      <div className="panel-heading"><h2>{t.architecture.flow.title}</h2><span className="section-number">{t.architecture.flow.badge}</span></div>
      <div className="flow-chain">
        {t.architecture.flow.steps.map((step,index,all)=>
          <span key={step} className="flow-node">{step}{index<all.length-1&&<ArrowRight size={14}/>}</span>)}
      </div>
      <p className="field-hint">{t.architecture.flow.note}</p>
    </section>

    <section className="guarantee-grid">
      {t.architecture.guarantees.map((guarantee,index)=>{
        const Icon=guaranteeIcons[index];
        return <article key={guarantee.title} className="panel guarantee-card">
          <span className="stat-icon"><Icon size={18}/></span>
          <h3>{guarantee.title}</h3>
          <p>{guarantee.body}</p>
        </article>;})}
    </section>

    <div className="studio-footnote">
      <Lock size={13}/><span>{t.architecture.footnote}</span>
      <Link href="/templates">{t.architecture.inspectTemplate} <ArrowRight size={13}/></Link>
    </div>
  </>;
}
