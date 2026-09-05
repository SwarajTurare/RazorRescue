import { useEffect, useState } from 'react';
import {
  Bell,
  Search,
  X,
  LayoutDashboard,
  Bot,
  Zap,
  MessageSquare,
  ShieldCheck,
  FileText,
  Calculator,
  ExternalLink,
} from 'lucide-react';
import {
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import Sidebar from './Sidebar';
import KineticBackground from './KineticBackground';
import { useLenis } from '../../hooks/useLenis';
import { api } from '../../services/api';

const quickLinks = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Triage Studio', '/triage', Bot],
  ['Batch Recovery', '/batch-recovery', Zap],
  ['Promise-to-Pay', '/promise-to-pay', MessageSquare],
  ['Compliance', '/compliance', ShieldCheck],
  ['Audit Ledger', '/audit-ledger', FileText],
  ['ROI Calculator', '/roi-calculator', Calculator],
];

const notifications = [
  {
    id: 1,
    title: 'Recovery ledger is available.',
    meta: 'Audit trail ready',
  },
  {
    id: 2,
    title: 'Compliance gates remain enabled.',
    meta: 'Safety controls active',
  },
];

export default function AppShell() {
  useLenis();

  const navigate = useNavigate();
  const location = useLocation();

  const [connected, setConnected] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState('');

  /* ==========================================================
     BACKEND HEALTH CHECK
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        await api.health();

        if (mounted) {
          setConnected(true);
        }
      } catch {
        if (mounted) {
          setConnected(false);
        }
      }
    };

    checkHealth();

    const timer = setInterval(checkHealth, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  /* ==========================================================
     SEARCH
  ========================================================== */

  const normalizedQuery = query.trim().toLowerCase();

  const results = quickLinks.filter(([label]) =>
    label.toLowerCase().includes(normalizedQuery)
  );

  /* ==========================================================
     CLOSE OVERLAYS
  ========================================================== */

  const closeOverlays = () => {
    setSearchOpen(false);
    setNotificationsOpen(false);
    setQuery('');
  };

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const goTo = (path) => {
    navigate(path);
    closeOverlays();
  };

  /* ==========================================================
     KEYBOARD ESCAPE
  ========================================================== */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeOverlays();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-rr-bg text-rr-text">
      {/* =====================================================
          GLOBAL BACKGROUND
      ====================================================== */}

      <KineticBackground />

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar />

      {/* =====================================================
          WORKSPACE
          md:pl-[250px] reserves sidebar width
      ====================================================== */}

      <main className="relative z-10 min-h-screen md:pl-[250px]">
        {/* ===================================================
            HEADER
        ==================================================== */}

        <header
          className="
            sticky
            top-0
            z-40

            flex
            h-[72px]
            items-center
            justify-between

            border-b
            border-rr-border/70

            bg-rr-bg/95
            px-4
            backdrop-blur-xl

            md:px-8
          "
        >
          {/* =================================================
              LEFT HEADER AREA
          ================================================== */}

          <div className="flex min-w-0 items-center">
            {/* Mobile title / current page */}

            <div className="ml-12 min-w-0 md:ml-0">
              <div className="truncate text-sm font-semibold text-rr-text">
                {getPageTitle(location.pathname)}
              </div>

              <div className="hidden text-[11px] text-rr-dim sm:block">
                Revenue recovery operations
              </div>
            </div>
          </div>

          {/* =================================================
              RIGHT HEADER AREA
          ================================================== */}

          <div className="flex items-center gap-2">
            {/* ===============================================
                API STATUS
            ================================================ */}

            <div
              className={`
                mr-1
                hidden
                items-center
                gap-2
                text-xs
                sm:flex
                ${
                  connected
                    ? 'text-rr-success'
                    : 'text-rr-danger'
                }
              `}
              title={
                connected
                  ? 'Backend API is connected'
                  : 'Backend API is offline'
              }
            >
              <span
                className={`
                  h-2
                  w-2
                  rounded-full
                  ${
                    connected
                      ? 'bg-rr-success'
                      : 'bg-rr-danger'
                  }
                `}
              />

              <span>
                {connected
                  ? 'API connected'
                  : 'API offline'}
              </span>
            </div>

            {/* ===============================================
                SEARCH
            ================================================ */}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(
                    (value) => !value
                  );
                  setNotificationsOpen(false);
                }}
                className={`
                  rounded-xl
                  border
                  border-rr-border
                  bg-rr-surface
                  p-2.5
                  text-rr-muted
                  transition-all
                  duration-300

                  hover:border-rr-gold/45
                  hover:bg-rr-gold/[0.04]
                  hover:text-rr-text

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-rr-gold

                  ${
                    searchOpen
                      ? 'border-rr-gold/50 text-rr-gold'
                      : ''
                  }
                `}
                aria-label="Search workspace"
                aria-expanded={searchOpen}
              >
                <Search size={17} />
              </button>

              {searchOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-12
                    z-[80]

                    w-[min(88vw,380px)]

                    rounded-2xl
                    border
                    border-rr-border

                    bg-rr-surface

                    p-3

                    shadow-2xl
                    backdrop-blur-xl
                  "
                >
                  {/* Search input */}

                  <div
                    className="
                      flex
                      items-center
                      gap-2

                      rounded-xl
                      border
                      border-rr-border

                      bg-rr-bg

                      px-3
                    "
                  >
                    <Search
                      size={15}
                      className="shrink-0 text-rr-dim"
                    />

                    <input
                      autoFocus
                      value={query}
                      onChange={(event) =>
                        setQuery(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Escape'
                        ) {
                          closeOverlays();
                        }

                        if (
                          event.key === 'Enter' &&
                          results.length > 0
                        ) {
                          goTo(results[0][1]);
                        }
                      }}
                      placeholder="Search workspace..."
                      className="
                        w-full
                        bg-transparent
                        py-2.5
                        text-sm
                        text-rr-text

                        outline-none

                        placeholder:text-rr-dim
                      "
                    />

                    {query && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuery('')
                        }
                        className="
                          rounded-md
                          p-1
                          text-rr-dim
                          transition
                          hover:bg-rr-bg
                          hover:text-rr-text
                        "
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Search results */}

                  <div className="mt-2 max-h-64 overflow-auto">
                    {results.length > 0 ? (
                      results.map(
                        ([label, to, Icon]) => (
                          <button
                            key={to}
                            type="button"
                            onClick={() =>
                              goTo(to)
                            }
                            className="
                              flex
                              w-full
                              items-center
                              gap-3

                              rounded-xl
                              px-3
                              py-2.5

                              text-left
                              text-sm
                              text-rr-muted

                              transition-all
                              duration-200

                              hover:bg-rr-gold/[0.06]
                              hover:text-rr-text
                            "
                          >
                            <Icon
                              size={15}
                              className="shrink-0 text-rr-gold"
                            />

                            <span>
                              {label}
                            </span>
                          </button>
                        )
                      )
                    ) : (
                      <div
                        className="
                          px-3
                          py-4
                          text-xs
                          text-rr-dim
                        "
                      >
                        No matching workspace page.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ===============================================
                NOTIFICATIONS
            ================================================ */}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(
                    (value) => !value
                  );
                  setSearchOpen(false);
                }}
                className={`
                  relative
                  rounded-xl
                  border
                  border-rr-border
                  bg-rr-surface
                  p-2.5
                  text-rr-muted

                  transition-all
                  duration-300

                  hover:border-rr-gold/45
                  hover:bg-rr-gold/[0.04]
                  hover:text-rr-text

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-rr-gold

                  ${
                    notificationsOpen
                      ? 'border-rr-gold/50 text-rr-gold'
                      : ''
                  }
                `}
                aria-label="Notifications"
                aria-expanded={
                  notificationsOpen
                }
              >
                <Bell size={17} />

                {/* Notification indicator */}

                <span
                  className="
                    absolute
                    right-2
                    top-2

                    h-1.5
                    w-1.5

                    rounded-full
                    bg-rr-gold

                    shadow-[0_0_8px_rgba(217,163,83,0.65)]
                  "
                />
              </button>

              {notificationsOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-12
                    z-[80]

                    w-[min(88vw,360px)]

                    rounded-2xl
                    border
                    border-rr-border

                    bg-rr-surface

                    p-3

                    shadow-2xl
                    backdrop-blur-xl
                  "
                >
                  {/* Header */}

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      px-2
                      pb-2
                    "
                  >
                    <div>
                      <div className="text-sm font-semibold text-rr-text">
                        Notifications
                      </div>

                      <div className="mt-0.5 text-[11px] text-rr-dim">
                        Workspace activity
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setNotificationsOpen(
                          false
                        )
                      }
                      className="
                        rounded-lg
                        p-1

                        text-rr-dim

                        transition
                        hover:bg-rr-bg
                        hover:text-rr-text
                      "
                      aria-label="Close notifications"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* API notification */}

                  <div
                    className="
                      mb-2
                      rounded-xl
                      border
                      border-rr-border/60
                      bg-rr-bg/40
                      px-3
                      py-3
                    "
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`
                          mt-1.5
                          h-2
                          w-2
                          shrink-0
                          rounded-full
                          ${
                            connected
                              ? 'bg-rr-success'
                              : 'bg-rr-danger'
                          }
                        `}
                      />

                      <div className="min-w-0">
                        <div className="text-sm text-rr-text">
                          {connected
                            ? 'Backend API is connected.'
                            : 'Backend API is offline.'}
                        </div>

                        <div className="mt-1 text-[11px] text-rr-dim">
                          {connected
                            ? 'Healthy connection'
                            : 'Start the Node API'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Static operational notifications */}

                  {notifications.map(
                    (notification) => (
                      <div
                        key={
                          notification.id
                        }
                        className="
                          mb-2
                          rounded-xl
                          border
                          border-rr-border/60
                          bg-rr-bg/40

                          px-3
                          py-3

                          last:mb-0
                        "
                      >
                        <div className="text-sm text-rr-text">
                          {notification.title}
                        </div>

                        <div className="mt-1 text-[11px] text-rr-dim">
                          {notification.meta}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* ===============================================
                RAZORRESCUE BRAND
            ================================================ */}

            <Link
              to="/"
              onClick={closeOverlays}
              className="
                ml-2
                hidden
                items-center
                gap-3

                rounded-xl
                p-1.5

                text-right

                transition-all
                duration-300

                hover:bg-rr-gold/[0.04]

                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-rr-gold

                sm:flex
              "
              aria-label="Go to RazorRescue home"
            >
              <div>
                <div className="text-sm font-semibold leading-5 text-rr-text">
                  RazorRescue
                </div>

                <div className="text-xs text-rr-dim">
                  AI revenue recovery
                </div>
              </div>

              <div
                className="
                  grid
                  h-9
                  w-9
                  shrink-0
                  place-items-center
                  rounded-full

                  bg-gradient-to-br
                  from-rr-gold
                  via-[#B87436]
                  to-[#191D2B]

                  text-xs
                  font-bold
                  text-rr-bg

                  shadow-[0_0_24px_rgba(217,163,83,0.10)]
                "
              >
                RR
              </div>
            </Link>

            {/* ===============================================
                RAZORPAY LOGO
            ================================================ */}

            <div className="hidden items-center sm:flex">
              <div className="mx-1 h-6 w-px bg-rr-border/70" />

              <a
                href="https://razorpay.com"
                target="_blank"
                rel="noreferrer"
                className="
                  flex
                  items-center
                  gap-2

                  rounded-lg
                  px-2
                  py-1.5

                  opacity-70

                  transition-all
                  duration-300

                  hover:bg-rr-gold/[0.04]
                  hover:opacity-100

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-rr-gold
                "
                aria-label="Visit Razorpay"
              >
                <img
                  src="/razorpay-logo.png"
                  alt="Razorpay"
                  className="
                    h-5
                    w-auto
                    max-w-[92px]
                    object-contain
                  "
                />

                <ExternalLink
                  size={12}
                  className="text-rr-dim"
                />
              </a>
            </div>
          </div>
        </header>

        {/* ===================================================
            PAGE CONTENT
        ==================================================== */}

        <section
          className="
            mx-auto
            min-h-[calc(100vh-72px)]
            w-full
            max-w-[1500px]

            px-4
            py-6

            md:px-8
            md:py-8
          "
        >
          <Outlet />
        </section>
      </main>
    </div>
  );
}

/* ============================================================
   PAGE TITLE HELPER
============================================================ */

function getPageTitle(pathname) {
  const pageTitles = {
    '/dashboard': 'Dashboard',
    '/triage': 'Triage Studio',
    '/batch-recovery': 'Batch Recovery',
    '/promise-to-pay': 'Promise-to-Pay',
    '/compliance': 'Compliance',
    '/audit-ledger': 'Audit Ledger',
    '/roi-calculator': 'ROI Calculator',
  };

  return pageTitles[pathname] || 'RazorRescue';
}