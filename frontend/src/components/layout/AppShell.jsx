import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  {
    to: '/',
    label: 'Live Monitor',
    end: true,
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-7 4 14 2-7h6" />
      </svg>
    ),
  },
  {
    to: '/control',
    label: 'Control',
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" />
      </svg>
    ),
  },
  {
    to: '/results',
    label: 'Results',
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v4m4-8v8m4-12v12" />
      </svg>
    ),
  },
];

export default function AppShell({ connected }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-hairline bg-surface-alt lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-hairline px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-nested border border-hairline bg-paper">
            <svg className="h-4 w-4 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h16" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold tracking-tight text-ink">
              Load Balancing
            </p>
            <p className="truncate text-caption text-mute">Operator console</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [isActive ? 'nav-link nav-link-active' : 'nav-link'].join(' ')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline p-4">
          <div className="flex items-center gap-2 rounded-pill bg-canvas px-3 py-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                connected ? 'bg-ink' : 'bg-mute'
              }`}
            />
            <span className="text-caption font-medium text-ink-soft">
              {connected ? 'Live connected' : 'Reconnecting'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 border-b border-hairline bg-paper/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-nested border border-hairline bg-surface-alt">
                <svg className="h-3.5 w-3.5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h16" />
                </svg>
              </div>
              <span className="text-body font-semibold tracking-tight text-ink">
                Load Balancing
              </span>
            </div>
            <span className="badge-soft">
              <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                  connected ? 'bg-ink' : 'bg-mute'
                }`}
              />
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-caption font-medium transition',
                    isActive
                      ? 'bg-ink text-surface-alt'
                      : 'bg-canvas text-mute hover:text-ink',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-page flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        <footer className="border-t border-hairline bg-surface-alt">
          <div className="mx-auto max-w-page px-4 py-4 text-center text-caption text-mute sm:px-6 lg:px-8">
            Performance evaluation of load balancing algorithms for web servers
          </div>
        </footer>
      </div>
    </div>
  );
}
