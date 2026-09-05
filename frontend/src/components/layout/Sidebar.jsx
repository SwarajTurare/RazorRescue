import {
  Activity,
  Calculator,
  Bot,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Menu,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';

import {
  NavLink,
  Link,
} from 'react-router-dom';

import { useState } from 'react';

const links = [
  [
    'Dashboard',
    '/dashboard',
    LayoutDashboard,
  ],
  [
    'Triage Studio',
    '/triage',
    Bot,
  ],
  [
    'Batch Recovery',
    '/batch-recovery',
    Zap,
  ],
  [
    'Promise-to-Pay',
    '/promise-to-pay',
    MessageSquare,
  ],
  [
    'Compliance',
    '/compliance',
    ShieldCheck,
  ],
  [
    'Audit Ledger',
    '/audit-ledger',
    FileText,
  ],
  [
    'ROI Calculator',
    '/roi-calculator',
    Calculator,
  ],
];

/* ============================================================
   BRAND
============================================================ */

function Brand({ onClick }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="
        mb-8

        flex
        items-center
        gap-3

        rounded-xl
        p-1

        outline-none

        transition-all
        duration-300

        hover:bg-rr-gold/[0.035]
        hover:opacity-95

        focus-visible:ring-2
        focus-visible:ring-rr-gold
      "
      aria-label="Go to RazorRescue home"
    >
      {/* Logo */}

      <div
        className="
          grid
          h-10
          w-10
          shrink-0
          place-items-center

          rounded-xl

          bg-gradient-to-br
          from-rr-gold
          via-[#B87436]
          to-[#191D2B]

          shadow-[0_0_28px_rgba(217,163,83,0.12)]
        "
      >
        <Activity
          size={20}
          className="text-rr-bg"
        />
      </div>

      {/* Brand text */}

      <div className="min-w-0">
        <div className="font-semibold tracking-tight text-rr-text">
          RazorRescue
        </div>

        <div className="text-xs text-rr-dim">
          AI revenue recovery
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   NAVIGATION
============================================================ */

function Navigation({ onNavigate }) {
  return (
    <nav
      aria-label="Primary navigation"
      className="space-y-1"
    >
      {links.map(
        ([label, to, Icon]) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            end
            className={({ isActive }) => `
              group

              flex
              w-full
              items-center
              gap-3

              rounded-xl

              px-3
              py-2.5

              text-sm

              transition-all
              duration-300

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-rr-gold

              ${
                isActive
                  ? `
                    border
                    border-rr-gold/10

                    bg-rr-gold/[0.08]

                    text-rr-text

                    shadow-[inset_2px_0_0_#D9A353]
                  `
                  : `
                    border
                    border-transparent

                    text-rr-muted

                    hover:border-rr-border/50
                    hover:bg-rr-surface
                    hover:text-rr-text
                    hover:shadow-[0_0_18px_rgba(217,163,83,0.05)]
                  `
              }
            `}
          >
            <Icon
              size={17}
              strokeWidth={1.8}
              className="
                shrink-0

                text-current

                transition-transform
                duration-300

                group-hover:translate-x-[1px]
              "
            />

            <span className="truncate">
              {label}
            </span>
          </NavLink>
        )
      )}
    </nav>
  );
}

/* ============================================================
   SIDEBAR
============================================================ */

export default function Sidebar() {
  const [open, setOpen] =
    useState(false);

  const closeMobileMenu = () => {
    setOpen(false);
  };

  return (
    <>
      {/* ======================================================
          MOBILE MENU BUTTON
      ======================================================= */}

      <button
        type="button"
        className="
          fixed
          left-3
          top-3

          z-[90]

          rounded-xl

          border
          border-rr-border

          bg-rr-bg/95

          p-2.5

          text-rr-muted

          shadow-lg

          backdrop-blur-xl

          transition-all
          duration-300

          hover:border-rr-gold/40
          hover:bg-rr-surface
          hover:text-rr-text

          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-rr-gold

          md:hidden
        "
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <Menu size={18} />
      </button>

      {/* ======================================================
          MOBILE DRAWER
      ======================================================= */}

      {open && (
        <div
          className="
            fixed
            inset-0

            z-[100]

            bg-black/70

            backdrop-blur-[2px]

            md:hidden
          "
          onClick={closeMobileMenu}
        >
          <aside
            className="
              relative

              h-full
              w-[82%]
              max-w-[300px]

              border-r
              border-rr-border

              bg-rr-bg

              p-5

              shadow-2xl

              overflow-y-auto
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Close */}

            <button
              type="button"
              onClick={closeMobileMenu}
              className="
                mb-4
                ml-auto

                block

                rounded-lg

                p-2

                text-rr-dim

                transition

                hover:bg-rr-surface
                hover:text-rr-text

                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-rr-gold
              "
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>

            {/* Navigation */}

            <div className="flex min-h-full flex-col">
              <Brand
                onClick={
                  closeMobileMenu
                }
              />

              <Navigation
                onNavigate={
                  closeMobileMenu
                }
              />
            </div>
          </aside>
        </div>
      )}

      {/* ======================================================
          DESKTOP SIDEBAR

          IMPORTANT:
          z-[60] makes the sidebar sit above the workspace.
          pointer-events-auto guarantees it receives clicks.
      ======================================================= */}

      <aside
        className="
          fixed
          inset-y-0
          left-0

          z-[60]

          hidden
          w-[250px]

          border-r
          border-rr-border/70

          bg-rr-bg/98

          p-5

          md:flex
          md:flex-col

          pointer-events-auto

          select-none

          overflow-y-auto
        "
        aria-label="Sidebar navigation"
      >
        <div className="flex min-h-full flex-col">
          <Brand />

          <Navigation />
        </div>
      </aside>
    </>
  );
}