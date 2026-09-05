import { useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import KineticBackground from './KineticBackground';
import { useLenis } from '../../hooks/useLenis';
import { api } from '../../services/api';

export default function AppShell() {
  useLenis();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkHealth = () => api.health()
      .then(() => mounted && setConnected(true))
      .catch(() => mounted && setConnected(false));

    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  return (
    <div className="min-h-screen">
      <KineticBackground />
      <Sidebar />
      <main className="min-h-screen md:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-end gap-2 border-b border-white/8 bg-[#151517]/55 px-4 backdrop-blur-xl md:px-8">
          <div className="mr-2 hidden items-center gap-2 text-xs text-white/45 sm:flex">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {connected ? 'API connected' : 'API offline'}
          </div>
          <button className="rounded-xl border border-white/8 bg-white/[.03] p-2 text-white/55 hover:text-white" aria-label="Search">
            <Search size={17} />
          </button>
          <button className="rounded-xl border border-white/8 bg-white/[.03] p-2 text-white/55 hover:text-white" aria-label="Notifications">
            <Bell size={17} />
          </button>
          <div className="ml-2 hidden text-right sm:block">
            <div className="text-sm font-medium">Merchant Workspace</div>
            <div className="text-xs text-white/40">Razorpay test mode</div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#45B5E7] to-[#B24D9C] text-xs font-bold">RR</div>
        </header>
        <section className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
