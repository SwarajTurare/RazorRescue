import { useEffect, useState } from 'react'; import { ShieldCheck } from 'lucide-react'; import { api } from '../services/api'; import { toast } from 'react-toastify'; import SectionHeader from '../components/ui/SectionHeader'; import StatusBadge from '../components/ui/StatusBadge';
export default function Compliance() {
    const [text, setText] = useState(''),
        [phone, setPhone] = useState('9876543210'),
        [result, setResult] = useState(null),
        [list, setList] = useState([]);
    const load = () => api.suppressionList().then(r => setList(r.numbers || [])).catch(e => toast.error(e.message));
    useEffect(load, []); const evalRule = async () => {
        try {
            const r = await api.compliance({ text }); setResult(r);
            if (r.is_opt_out) {
                await api.suppress({ phone, reason: r.reason });
                await load(); toast.warning('Suppression added and future recovery blocked')
            }

            else toast.success('No opt-out rule triggered')
        } catch (e) { toast.error(e.message) }
    }; return <div><SectionHeader eyebrow="Trust & safety" title="Compliance control center" description="Honor opt-outs, protect quiet hours, and make suppression a first-class recovery guardrail." /><div className="grid gap-4 lg:grid-cols-[1fr_.8fr]"><section className="rr-surface rounded-2xl p-5"><h2 className="text-sm font-semibold">Evaluate inbound stop rules</h2><div className="mt-5 space-y-4"><input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. band karo, stop messaging me" className="w-full rounded-xl border border-white/10 bg-white/[.04] p-3 text-sm" /><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Associated phone number" className="w-full rounded-xl border border-white/10 bg-white/[.04] p-3 text-sm" /><button onClick={evalRule} className="w-full rounded-xl bg-gradient-to-r from-[#45B5E7] to-[#B24D9C] px-4 py-3 text-sm font-semibold">Evaluate compliance</button>{result && <div className="rounded-xl border border-white/8 bg-white/[.03] p-4"><div className="flex items-center justify-between"><StatusBadge tone={result.is_opt_out ? 'danger' : 'success'}>{result.is_opt_out ? 'STOP RULE TRIGGERED' : 'NORMAL RESPONSE'}</StatusBadge><ShieldCheck size={18} className="text-[#45B5E7]" /></div><p className="mt-3 text-xs leading-5 text-white/55">{result.reason}</p></div>}</div></section><section className="rr-surface rounded-2xl p-5"><h2 className="text-sm font-semibold">Do-not-contact registry</h2><p className="mt-1 text-xs text-white/40">Persistent in SQLite</p><div className="mt-4 space-y-2">{list.length ? list.map(n => <div key={n} className="flex items-center justify-between rounded-xl border border-white/7 bg-white/[.03] px-3 py-3"><span className="font-mono text-sm">{n}</span><StatusBadge tone="danger">Permanent opt-out</StatusBadge></div>) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">Registry is empty.</div>}</div></section></div></div>
}
