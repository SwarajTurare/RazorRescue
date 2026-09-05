import { useState } from "react";
import { BarChart3, Play, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { api } from "../services/api";
import { toast } from "react-toastify";
import SectionHeader from "../components/ui/SectionHeader";
import StatusBadge from "../components/ui/StatusBadge";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { labels: { color: "#EBE4D1", boxWidth: 10, font: { size: 11 } } },
  },
  scales: {
    x: { ticks: { color: "#AF9F7E" }, grid: { color: "rgba(70,58,49,.35)" } },
    y: { ticks: { color: "#AF9F7E" }, grid: { color: "rgba(70,58,49,.35)" } },
  },
};

export default function BatchRecovery() {
  const [out, setOut] = useState(null),
    [busy, setBusy] = useState(false),
    [quiet, setQuiet] = useState(false),
    [approve, setApprove] = useState(false);
  const [mc, setMc] = useState(null),
    [benchmark, setBenchmark] = useState(null),
    [includeHitl, setIncludeHitl] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.batch({
        limit: 60,
        quietMode: quiet,
        approveAll: approve,
      });
      setOut(r);
      toast.success(`Batch complete: ${r.summary?.processed || 0} processed`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const runMonteCarlo = async () => {
    try {
      setMc(await api.monteCarlo());
      toast.success("20-trial Monte Carlo simulation complete");
    } catch (e) {
      toast.error(e.message);
    }
  };
  const runBenchmark = async () => {
    try {
      setBenchmark(await api.benchmark(includeHitl));
      toast.success("30-trial benchmark complete");
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Recovery engine"
        title="Batch recovery orchestrator"
        description="Execute the governed decision pipeline across the existing failed-payment batch, then validate its economics with API-free statistical models."
        action={
          <button
            onClick={run}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D9A353] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <Play size={16} />
            {busy ? "Processing…" : "Run batch recovery"}
          </button>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <div className="rr-surface rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-[#756A57]">
            Batch guardrails
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#AF9F7E]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={quiet}
                onChange={(e) => setQuiet(e.target.checked)}
              />{" "}
              Quiet-hours mode (23:00 simulation)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={approve}
                onChange={(e) => setApprove(e.target.checked)}
              />{" "}
              Auto-approve HITL
            </label>
          </div>
        </div>
        <button
          onClick={runMonteCarlo}
          className="rr-surface rounded-2xl px-4 py-3 text-sm hover:border-[#D9A353]/30"
        >
          <Sparkles size={15} className="mr-2 inline text-[#D9A353]" />
          20-trial Monte Carlo
        </button>
        <button
          onClick={runBenchmark}
          className="rr-surface rounded-2xl px-4 py-3 text-sm hover:border-[#B87436]/30"
        >
          <BarChart3 size={15} className="mr-2 inline text-[#B87436]" />
          30-trial benchmark
        </button>
      </div>

      {!out ? (
        <div className="rr-surface rounded-2xl p-8 text-center text-sm text-[#756A57]">
          <Zap size={22} className="mx-auto text-[#D9A353]" />
          <p className="mt-3">No batch execution in this session.</p>
          <p className="mt-1 text-xs">
            Run the batch to process the 60 CSV-backed records through the
            recovery agent.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["Processed", out.summary.processed],
              [
                "Recovered",
                `₹${Number(out.summary.recovered || 0).toLocaleString("en-IN")}`,
              ],
              ["Queued", out.summary.queued],
              ["Suppressed", out.summary.suppressed],
              ["HITL", out.summary.hitl],
              ["Failed", out.summary.failed],
            ].map(([k, v]) => (
              <div key={k} className="rr-surface rounded-2xl p-4">
                <div className="text-xs text-[#756A57]">{k}</div>
                <div className="mt-2 text-2xl font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rr-surface rounded-2xl overflow-hidden">
            <div className="border-b border-[#463A31]/70 px-4 py-4">
              <h2 className="text-sm font-semibold">Execution results</h2>
              <p className="mt-1 text-xs text-[#756A57]">
                Persisted batch outcome records
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="text-[#756A57]">
                  <tr className="border-b border-[#463A31]/45">
                    {[
                      "Transaction",
                      "Customer",
                      "Amount",
                      "Action",
                      "Confidence",
                      "Status",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {out.results.map((r) => (
                    <tr
                      key={r.transaction_id}
                      className="border-b border-[#463A31]/40 last:border-0"
                    >
                      <td className="px-4 py-3">{r.transaction_id}</td>
                      <td className="px-4 py-3 text-[#AF9F7E]">{r.name}</td>
                      <td className="px-4 py-3">
                        ₹{Number(r.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-[#AF9F7E]">
                        {r.decision?.action || r.error || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.confidence ?? "—"}
                        {r.confidence != null ? "%" : ""}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={
                            String(r.final_status || r.status).includes(
                              "Resolved",
                            )
                              ? "success"
                              : String(r.status).includes("Suppressed")
                                ? "danger"
                                : String(r.status).includes("Awaiting")
                                  ? "warning"
                                  : "info"
                          }
                        >
                          {r.final_status || r.status}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rr-surface rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#D9A353]" />
            <h2 className="text-sm font-semibold">
              20-trial Monte Carlo validation
            </h2>
          </div>
          {!mc ? (
            <p className="mt-3 text-xs text-[#756A57]">
              Run the deterministic economic simulation to estimate
              recovery-yield distribution without LLM or payment API calls.
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Mean", mc.mean],
                  ["Std dev", mc.stdDev],
                  ["Min", mc.min],
                  ["Max", mc.max],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-[#463A31]/70 bg-[#14100B] p-3"
                  >
                    <div className="text-[11px] text-[#756A57]">{k}</div>
                    <div className="mt-1 text-lg font-semibold">
                      {Number(v).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-[220px] sm:h-[260px] md:h-[300px]">
                <Line
                  data={{
                    labels: mc.values.map((_, i) => `T${i + 1}`),
                    datasets: [
                      {
                        label: "Recovery rate %",
                        data: mc.values,
                        borderColor: "#D9A353",
                        backgroundColor: "rgba(217,163,83,.10)",
                        fill: true,
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </div>
            </>
          )}
        </section>

        <section className="rr-surface rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#B87436]" />
                <h2 className="text-sm font-semibold">
                  Naive vs RazorRescue benchmark
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#756A57]">
                30 seeded trials using the original economic assumptions.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#AF9F7E]">
              <input
                type="checkbox"
                checked={includeHitl}
                onChange={(e) => setIncludeHitl(e.target.checked)}
              />{" "}
              Include HITL
            </label>
          </div>
          {!benchmark ? (
            <p className="mt-3 text-xs text-[#756A57]">
              Run the benchmark to compare expected net economic value and win
              rate.
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Naive", benchmark.avgNaiveNet],
                  ["RazorRescue", benchmark.avgRazorRescueNet],
                  ["Alpha", benchmark.avgAlpha],
                  ["Win rate", benchmark.winRate],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-[#463A31]/70 bg-[#14100B] p-3"
                  >
                    <div className="text-[11px] text-[#756A57]">{k}</div>
                    <div className="mt-1 text-lg font-semibold">
                      {k === "Win rate"
                        ? `${Number(v).toFixed(0)}%`
                        : `₹${Math.round(Number(v)).toLocaleString("en-IN")}`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-[220px] sm:h-[260px] md:h-[300px]">
                <Bar
                  data={{
                    labels: ["Naive Recovery Bot", "RazorRescue AI"],
                    datasets: [
                      {
                        label: "Expected net economic value (₹)",
                        data: [
                          benchmark.avgNaiveNet,
                          benchmark.avgRazorRescueNet,
                        ],
                        backgroundColor: ["#6B645B", "#D9A353"],
                        borderRadius: 8,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
