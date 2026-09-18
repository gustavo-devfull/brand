'use client';
import Link from 'next/link';
import { ArrowRight,Boxes,Check,Layers,PanelTop,ShieldCheck,Sparkles,TriangleAlert } from 'lucide-react';
import { useWorkspace,Loading } from '@/components/ui/workspace';
import { useI18n } from '@/components/ui/locale';
import { SvgPreview } from '@/components/ui/preview';
import { ruleText } from '@/lib/i18n/format';
import type { RuleId } from '@/types';

export function Overview(){
  const {workspace,cloud}=useWorkspace();const {t}=useI18n();
  if(!workspace)return <Loading/>;
  const variations=workspace.campaigns.flatMap(c=>c.variations);
  const approved=variations.filter(v=>v.compliance.approved);
  const rate=variations.length?Math.round(approved.length/variations.length*100):0;
  const byRule=new Map<RuleId,{name:string;pass:number;total:number}>();
  for(const rule of variations.flatMap(v=>v.compliance.rules)){
    const entry=byRule.get(rule.ruleId)??{name:ruleText(t,rule).name,pass:0,total:0};
    entry.total++;if(rule.status==='pass')entry.pass++;byRule.set(rule.ruleId,entry);
  }
  const ruleRows=[...byRule.entries()].sort((a,b)=>a[1].pass/a[1].total-b[1].pass/b[1].total);
  const stats=[
    {label:t.overview.stats.brands,value:workspace.brands.length,hint:t.overview.stats.brandsHint,icon:Boxes,href:'/brands'},
    {label:t.overview.stats.templates,value:workspace.templates.length,hint:t.overview.stats.templatesHint,icon:PanelTop,href:'/templates'},
    {label:t.overview.stats.campaigns,value:workspace.campaigns.length,hint:t.overview.stats.campaignsHint,icon:Layers,href:'/campaigns'},
    {label:t.overview.stats.approved,value:approved.length,hint:t.overview.stats.approvedHint(variations.length),icon:ShieldCheck,href:'/campaigns'},
  ];
  const recent=[...workspace.campaigns].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4);
  return <>
    <section className="page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-line"/> {t.overview.eyebrow}</div>
        <h1>{t.overview.titleLead} <span className="serif-em">{t.overview.titleEm}</span></h1>
        <p>{t.overview.subtitle}</p>
      </div>
      <Link href="/campaigns" className="button primary"><Sparkles size={15}/>{t.overview.newCampaign}<ArrowRight size={15}/></Link>
    </section>

    <section className="stat-grid">
      {stats.map(({label,value,hint,icon:Icon,href})=>
        <Link key={label} href={href} className="stat-card panel">
          <span className="stat-icon"><Icon size={18}/></span>
          <strong>{value.toString().padStart(2,'0')}</strong>
          <span className="stat-label">{label}</span>
          <small>{hint}</small>
        </Link>)}
    </section>

    <section className="overview-grid">
      <div className="panel compliance-summary">
        <div className="panel-heading"><h2>{t.overview.health.title}</h2><ShieldCheck size={16}/></div>
        <div className="gauge" role="img" aria-label={t.overview.health.gaugeAria(rate)}>
          <div className="gauge-bar"><span style={{width:`${rate}%`}}/></div>
          <div className="gauge-value"><strong>{rate}%</strong><small>{t.overview.health.gaugeCaption(approved.length,variations.length)}</small></div>
        </div>
        <div className="mini-label">{t.overview.health.rulePerformance} <span>{t.overview.health.ruleCount(ruleRows.length)}</span></div>
        {ruleRows.length
          ?<ul className="rule-bars">{ruleRows.map(([id,rule])=>{
            const percent=Math.round(rule.pass/rule.total*100);
            return <li key={id}>
              <span className={percent===100?'rule-check':'rule-check warn'}>{percent===100?<Check size={12}/>:<TriangleAlert size={12}/>}</span>
              <div><strong>{rule.name}</strong><div className="rule-bar"><span style={{width:`${percent}%`}} className={percent===100?'':'warn'}/></div></div>
              <small>{rule.pass}/{rule.total}</small>
            </li>;})}</ul>
          :<p className="field-hint">{t.overview.health.empty}</p>}
      </div>

      <div className="panel">
        <div className="panel-heading"><h2>{t.overview.recent.title}</h2><span className="section-number">{recent.length.toString().padStart(2,'0')}</span></div>
        {recent.length?<ul className="campaign-list">{recent.map(campaign=>{
          const brand=workspace.brands.find(b=>b.id===campaign.brandId);
          const ok=campaign.variations.filter(v=>v.compliance.approved).length;
          return <li key={campaign.id}>
            <div className="campaign-thumbs">{campaign.variations.slice(0,3).map(v=>v.svg
              ?<SvgPreview key={v.id} svg={v.svg} alt={v.spec.headline}/>
              :<span key={v.id} className="thumb-blocked"><ShieldCheck size={14}/></span>)}</div>
            <div><strong>{campaign.name}</strong><small>{brand?.name??t.overview.recent.unknownBrand} · {t.formats[campaign.format]} · {new Date(campaign.createdAt).toLocaleDateString(t.htmlLang)}</small></div>
            <span className={ok===campaign.variations.length?'compliance-badge':'compliance-badge failed'}><ShieldCheck size={12}/>{ok}/{campaign.variations.length}</span>
          </li>;})}</ul>
          :<div className="empty-state small"><Layers/><h3>{t.overview.recent.emptyTitle}</h3><p>{t.overview.recent.emptyBody}</p><Link className="button" href="/campaigns">{t.overview.recent.openStudio}</Link></div>}
        <div className="overview-foot"><span className="live-dot"/>{cloud?t.workspace.modeCloud:t.workspace.modeLocal}</div>
      </div>
    </section>

    <section className="panel brand-roster">
      <div className="panel-heading"><h2>{t.overview.roster.title}</h2><Link className="text-button" href="/brands">{t.overview.roster.manage} <ArrowRight size={13}/></Link></div>
      <div className="roster-grid">{workspace.brands.map(brand=>{
        const assets=workspace.assets.filter(a=>a.brandId===brand.id).length;
        const templates=workspace.templates.filter(tpl=>tpl.brandId===brand.id).length;
        return <Link key={brand.id} href="/brands" className="roster-card">
          <div className="roster-logo"><SvgPreview svg={brand.logoSvg} alt={brand.name}/></div>
          <strong>{brand.name}</strong>
          <div className="roster-swatches">{[...new Set(Object.values(brand.tokens.colors).flat())].slice(0,6).map(color=><span key={color} style={{background:color}}/>)}</div>
          <small>{t.overview.roster.counts(templates,assets)}</small>
        </Link>;})}</div>
    </section>
  </>;
}
