import { NavLink } from 'react-router-dom';
import { Activity, BarChart3, Bot, Calculator, FileText, LayoutDashboard, MessageSquare, Menu, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import { useState } from 'react';

const links = [
 ['Dashboard','/dashboard',LayoutDashboard],['Triage Studio','/triage',Bot],['Batch Recovery','/batch-recovery',Zap],
 ['Promise-to-Pay','/promise-to-pay',MessageSquare],['Compliance','/compliance',ShieldCheck],['Audit Ledger','/audit-ledger',FileText],['ROI Calculator','/roi-calculator',Calculator],
];

export default function Sidebar(){
 const [open,setOpen]=useState(false);
 const nav=<>
  <div className="mb-8 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#45B5E7] to-[#B24D9C] shadow-glow"><Activity size={20}/></div><div><div className="font-semibold">RazorRescue</div><div className="text-xs text-white/45">AI revenue recovery</div></div></div>
  <nav className="space-y-1">{links.map(([label,to,Icon])=><NavLink key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=>`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive?'bg-white/[.08] text-white shadow-[inset_2px_0_0_#45B5E7]':'text-white/58 hover:bg-white/[.05] hover:text-white'}`}><Icon size={17} className="shrink-0"/><span>{label}</span></NavLink>)}</nav>
  <div className="mt-auto pt-8"><div className="rounded-2xl border border-white/8 bg-white/[.03] p-4"><div className="flex items-center gap-2 text-xs font-medium text-[#45B5E7]"><Sparkles size={14}/> TEST MODE</div><p className="mt-2 text-xs leading-5 text-white/48">Recovery actions are bounded, auditable, and safe to demo.</p></div></div>
 </>;
 return <><button className="fixed left-3 top-3 z-40 rounded-xl border border-white/10 bg-[#151517]/85 p-2.5 backdrop-blur md:hidden" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={18}/></button>{open&&<div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={()=>setOpen(false)}><aside className="h-full w-[82%] max-w-[300px] border-r border-white/10 bg-[#151517] p-5" onClick={e=>e.stopPropagation()}><button onClick={()=>setOpen(false)} className="mb-4 ml-auto block rounded-lg p-2 text-white/60 hover:bg-white/5" aria-label="Close navigation"><X size={18}/></button><div className="flex h-[calc(100%-3rem)] flex-col">{nav}</div></aside></div>}
 <aside className="fixed inset-y-0 left-0 hidden w-[250px] border-r border-white/8 bg-[#151517]/84 p-5 backdrop-blur-xl md:flex md:flex-col">{nav}</aside></>;
}
