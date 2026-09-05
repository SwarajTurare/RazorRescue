const map = {
  success: 'border-rr-success/30 bg-rr-success/[0.10] text-[#A6C5A0]',
  warning: 'border-rr-gold/30 bg-rr-gold/[0.10] text-rr-goldBright',
  danger: 'border-rr-danger/30 bg-rr-danger/[0.08] text-[#D89A8D]',
  info: 'border-[#B87436]/30 bg-[#B87436]/[0.08] text-[#D7A974]',
  neutral: 'border-rr-border bg-rr-surface text-rr-muted',
};

export default function StatusBadge({
  children,
  tone = 'neutral',
}) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}