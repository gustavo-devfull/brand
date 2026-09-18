'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight,Boxes,ChevronDown,Command,LayoutDashboard,Layers,PanelTop,ShieldCheck,Workflow } from 'lucide-react';
import { useWorkspace } from './workspace';
import { useI18n,LocaleToggle } from './locale';

export function Shell({children}:{children:React.ReactNode}){
  const pathname=usePathname();const {cloud}=useWorkspace();const {t}=useI18n();
  const links=[{href:'/dashboard',label:t.nav.overview,icon:LayoutDashboard},{href:'/brands',label:t.nav.brands,icon:Boxes},{href:'/campaigns',label:t.nav.campaigns,icon:Layers},{href:'/templates',label:t.nav.templates,icon:PanelTop}];
  const crumb=pathname==='/brands'?t.nav.brands:pathname==='/templates'?t.nav.templates:pathname==='/architecture'?t.nav.architecture:pathname==='/dashboard'?t.nav.overview:t.topbar.campaignStudio;
  return <div className="app-shell"><aside className="sidebar"><Link href="/" className="wordmark"><span className="brand-symbol"><Command size={22}/></span><span>brand<span className="wordmark-light">engine</span><small>{t.nav.wordmarkTag}</small></span></Link>
    <div className="workspace-switch"><span className="workspace-avatar">S</span><div>{t.nav.workspaceName}<small>{t.nav.workspaceKind}</small></div><ChevronDown size={14}/></div>
    <p className="nav-caption">{t.nav.caption}</p><nav>{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={(pathname===href||(href==='/campaigns'&&pathname==='/'))?'nav-link active':'nav-link'}><Icon size={18}/>{label}{href==='/campaigns'&&<span className="nav-count">↗</span>}</Link>)}</nav>
    <div className="sidebar-bottom"><Link className={`nav-link ${pathname==='/architecture'?'active':''}`} href="/architecture"><Workflow size={18}/>{t.nav.architecture}<ArrowUpRight size={14}/></Link><div className="system-note"><span className="live-dot"/>{t.nav.systemNoteTitle}<small>{t.nav.systemNoteSubtitle}</small></div><div className="profile"><div className="avatar">ST</div><div>{t.nav.profileName}<small>{t.nav.profileRole}</small></div><ChevronDown size={14}/></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb">{t.topbar.root} <span>/</span> <strong>{crumb}</strong></div><div className="topbar-right"><span className="demo-label"><span className="live-dot"/>{cloud?t.topbar.connected:t.topbar.demo}</span><LocaleToggle/><Link href="/architecture" className="icon-button" aria-label={t.topbar.viewArchitecture}><Workflow size={18}/></Link><span className="avatar small">ST</span></div></header><main>{children}</main><footer className="footer"><span><ShieldCheck size={13}/> {t.footer.tagline}</span><span>{t.footer.product} <b> / </b> V1.0</span></footer></div></div>;
}
