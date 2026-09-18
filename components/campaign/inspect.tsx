'use client';
import { X,Lock,Check,AlertTriangle,Copy } from 'lucide-react';
import { useEffect,useRef,useState } from 'react';
import type { Variation } from '@/types';
import { SvgPreview } from '@/components/ui/preview';
import { useI18n } from '@/components/ui/locale';
import { ruleText,templateLabel,rationaleText } from '@/lib/i18n/format';

export function Inspect({variation,onClose}:{variation:Variation;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);const [copied,setCopied]=useState(false);const {t}=useI18n();
  useEffect(()=>{dialog.current?.showModal();const node=dialog.current;return()=>node?.close();},[]);
  const decisions:[string,string][]=[
    [t.inspect.fields.template,templateLabel(t,{name:variation.templateName,nameKey:variation.templateNameKey})],
    [t.inspect.fields.image,variation.imageName],
    [t.inspect.fields.headline,variation.spec.headline],
    [t.inspect.fields.cta,variation.spec.cta],
    [t.inspect.fields.alignment,t.alignments[variation.spec.alignment]],
    [t.inspect.fields.theme,t.themes[variation.spec.theme]],
  ];
  return <dialog ref={dialog} className="inspect-dialog" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="dialog-header">
      <div><span className="eyebrow">{t.inspect.eyebrow}</span><h2>{t.inspect.title}</h2></div>
      <button className="icon-button" onClick={onClose} aria-label={t.common.close}><X/></button>
    </div>
    <div className="inspect-body">
      <div className="inspect-art">
        {variation.svg?<SvgPreview svg={variation.svg} alt={variation.spec.headline}/>:<p>{t.inspect.blocked}</p>}
        <div className="protected-note"><Lock size={14}/>{t.inspect.protectedNote(variation.compliance.protectedElementsModified)}</div>
      </div>
      <div>
        <span className="eyebrow">{t.inspect.decisionsEyebrow}</span>
        <dl className="decisions">{decisions.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
        <div className="explanation"><span className="eyebrow">{t.inspect.whyEyebrow}</span><p>{rationaleText(t,variation)}</p></div>
        <details>
          <summary>{t.inspect.viewSpec}</summary>
          <pre>{JSON.stringify(variation.spec,null,2)}</pre>
          <button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(JSON.stringify(variation.spec,null,2));setCopied(true);}catch{setCopied(false);}}}>
            <Copy size={13}/>{copied?t.common.copied:t.common.copyJson}</button>
        </details>
        <h3 className="rules-title">{t.inspect.rulesTitle} <span>{t.inspect.compliant(variation.compliance.percentage)}</span></h3>
        <div className="inspect-rules">{variation.compliance.rules.map(rule=>{
          const text=ruleText(t,rule);
          return <div key={rule.ruleId} className={`rule-detail ${rule.status}`}>
            <span>{rule.status==='pass'?<Check size={14}/>:<AlertTriangle size={14}/>}</span>
            <div><strong>{text.name}</strong><p>{text.message}</p></div>
          </div>;})}</div>
      </div>
    </div>
  </dialog>;
}
