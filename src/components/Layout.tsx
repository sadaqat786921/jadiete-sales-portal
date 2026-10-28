import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  IconLayoutDashboard, IconInbox, IconFilter, IconUsers, IconFileText, IconTrophy, IconMessage, IconCurrencyPound, IconChartBar, IconSettings, IconSearch,
  IconBell, IconMenu2, IconCalendarCheck, IconRefresh, IconChevronRight, IconArrowRight, IconHelpCircle, IconLogout, IconUser, IconSelector, IconMail, IconRulerMeasure, IconChecklist,
} from '@tabler/icons-react';
import { me, IMG } from '../data/mock';
import { useStore, TODAY } from '../data/store';
import { Avatar, Tile, toneColor } from './ui';
import { useMine, myTurn, stageLabel, useSalesAlerts } from './sales';
import { needsReply } from '../pages/Messages';

type NavDef = { to: string; label: string; icon: any; count?: number; chev?: boolean; end?: boolean };
const NAV: { section: string; items: NavDef[] }[] = [
  { section: 'Main', items: [{ to: '/', label: 'My day', icon: IconLayoutDashboard, chev: true, end: true }, { to: '/pipeline', label: 'My pipeline', icon: IconFilter }] },
  { section: 'My work', items: [{ to: '/calendar', label: 'Calendar & tasks', icon: IconCalendarCheck }, { to: '/customers', label: 'My customers', icon: IconUsers, chev: true }, { to: '/quotes', label: 'Quotes (Framepoint)', icon: IconFileText }, { to: '/won', label: 'Won jobs', icon: IconTrophy }] },
  { section: 'Communicate', items: [{ to: '/messages', label: 'Messages', icon: IconMessage }] },
  { section: 'Results', items: [{ to: '/performance', label: 'My performance', icon: IconChartBar, chev: true }] },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const st = useStore();
  const mine = useMine();
  const yours = mine.filter(myTurn);
  const live: Record<string, number> = {
    '/pipeline': yours.length,
    '/calendar': st.tasks.filter(t => t.owner === me.id && !t.done && t.due <= TODAY).length + st.appts.filter(a => a.who === me.id && a.date === TODAY && a.status !== 'Done').length,
    '/quotes': mine.filter(r => ['quote', 'decide'].includes(r.st.key)).length,
    '/won': mine.filter(r => r.e.stage === 'Won' && r.st.role === 'Sales').length,
    '/messages': mine.filter(r => needsReply(r.e)).length,
  };
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <img src="images/mark.svg" alt="" />
        <b>Jadeite</b>
        <button className="collapse" onClick={onToggle} aria-label="Collapse menu"><IconMenu2 size={20} /></button>
      </div>
      <div className="workspace">
        <span className="ws-logo"><img src="images/mark.svg" alt="" /></span>
        <span>Jadeite Glazing · Sales</span>
        <IconSelector size={15} className="ml-auto muted" style={{ marginLeft: 'auto' }} />
      </div>
      {NAV.map(s => (
        <React.Fragment key={s.section}>
          <div className="nav-label">{s.section}</div>
          {s.items.map(it => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={it.label}>
              <it.icon size={18} stroke={1.8} />
              <span>{it.label}</span>
              {(live[it.to] ?? it.count) ? <em className="count" style={{ fontStyle: 'normal' }}>{live[it.to] ?? it.count}</em> : it.chev ? <IconChevronRight size={15} className="chev" /> : null}
            </NavLink>
          ))}
        </React.Fragment>
      ))}
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ marginTop: 6 }} title="Settings">
        <IconSettings size={18} stroke={1.8} /><span>Settings</span>
      </NavLink>
      <div className="promo">
        <img src={IMG.orangery} alt="" style={{ objectPosition: 'center 35%' }} />
        <div>
          <b>{yours.length} deal{yours.length === 1 ? ' needs' : 's need'} you</b>
          <p>Customers waiting for your next step.</p>
          <Link to="/pipeline?show=turn">Open my list <IconArrowRight size={13} /></Link>
        </div>
      </div>
    </aside>
  );
}

function CommandSearch({ onClose }: { onClose: () => void }) {
  const mine = useMine();
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const s = q.toLowerCase();
  const res = mine.filter(r => !s || (r.e.name + r.e.id + r.e.postcode + r.e.address + (r.e.jobId || '') + (r.e.quote?.ref || '')).toLowerCase().includes(s)).slice(0, 8);
  const go = (to: string) => { onClose(); nav(to); };
  return (
    <div className="overlay" onMouseDown={onClose} style={{ alignItems: 'flex-start' }}>
      <div className="cmd" onMouseDown={e => e.stopPropagation()}>
        <div className="hstack" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', gap: 10 }}>
          <IconSearch size={18} color="#6b7a78" />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Search your customers, postcodes or quote numbers…" style={{ border: 0, outline: 0, fontSize: 15, flex: 1 }} />
          <kbd className="tiny muted">Esc</kbd>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8 }}>
          <div className="nav-label">My customers and deals</div>
          {res.map(({ e, st }) => (
            <button key={e.id} onClick={() => go(`/enquiries/${e.id}`)} className="nav-item" style={{ width: '100%', border: 0, background: 'none', height: 52, gap: 12 }}>
              <img src={IMG[e.photo]} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} alt="" />
              <div className="vstack" style={{ alignItems: 'flex-start', gap: 1 }}><b style={{ fontSize: 13 }}>{e.name}</b><span className="tiny muted">{e.jobId || e.id} · {e.product} · {e.postcode}</span></div>
              <span className={`tag ml-auto ${myTurn({ e, st }) ? 'warn' : 'grey'}`}>{stageLabel[e.stage]}</span>
            </button>
          ))}
          {res.length === 0 && <div className="small muted" style={{ padding: 16 }}>No customer of yours matches “{q}”.</div>}
        </div>
      </div>
    </div>
  );
}

const notifIcon: Record<string, any> = { inbox: IconInbox, mail: IconMail, ruler: IconRulerMeasure, pound: IconCurrencyPound, check: IconChecklist };

export function Header() {
  const { reset } = useStore();
  const alerts = useSalesAlerts();
  const [read, setRead] = useState(false);
  const [search, setSearch] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <header className="header">
      <div className="search" onClick={() => setSearch(true)}><IconSearch size={16} />Search<kbd>⌘K</kbd></div>
      <div className="spacer" />
      <div style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => { setBell(!bell); setMenu(false); }} aria-label="Notifications"><IconBell size={18} />{!read && alerts.length > 0 && <span className="dot" />}</button>
        {bell && (
          <div className="popover">
            <div className="between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}><b style={{ fontSize: 14 }}>Notifications</b><button className="link" onClick={() => setRead(true)}>Mark all as read</button></div>
            <div className="list" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {alerts.map(n => {
                const I = notifIcon[n.icon];
                return (
                  <button key={n.id} className="hstack" onClick={() => { setBell(false); nav(n.to); }} style={{ padding: '12px 16px', gap: 12, alignItems: 'flex-start', width: '100%', border: 0, background: read ? '#fff' : 'var(--tint-2)', textAlign: 'left' }}>
                    <Tile icon={<I size={17} />} color={toneColor[n.tone]} size={34} radius={17} />
                    <div className="vstack" style={{ gap: 2, flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>{n.title}</b><span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.sub}</span></div>
                  </button>
                );
              })}
              {alerts.length === 0 && <div className="small muted" style={{ padding: 16 }}>Nothing new.</div>}
            </div>
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <button className="me" onClick={() => { setMenu(!menu); setBell(false); }}>{me.initials}</button>
        {menu && (
          <div className="popover" style={{ width: 240 }}>
            <div className="hstack" style={{ padding: 14, gap: 10, borderBottom: '1px solid var(--border)' }}><Avatar i={me.initials} size={38} bg="#00c7a1" fg="#0b1f1b" /><div className="vstack" style={{ gap: 1 }}><b>{me.name}</b><span className="tiny muted">{me.role} · {me.area}</span></div></div>
            <div style={{ padding: 6 }}>
              <button className="nav-item" style={{ width: '100%', border: 0, background: 'none' }} onClick={() => { setMenu(false); nav('/settings'); }}><IconUser size={17} /><span>My profile</span></button>
              <button className="nav-item" style={{ width: '100%', border: 0, background: 'none' }} onClick={() => { setMenu(false); nav('/welcome/1'); }}><IconHelpCircle size={17} /><span>Take the tour again</span></button>
              <button className="nav-item" style={{ width: '100%', border: 0, background: 'none' }} onClick={() => { setMenu(false); reset(); nav('/'); }}><IconRefresh size={17} /><span>Reset demo data</span></button>
              <button className="nav-item" style={{ width: '100%', border: 0, background: 'none' }} onClick={() => nav('/login')}><IconLogout size={17} /><span>Sign out</span></button>
            </div>
          </div>
        )}
      </div>
      {search && <CommandSearch onClose={() => setSearch(false)} />}
    </header>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className="app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="main">
        <Header />
        <main className="content"><Outlet /></main>
        <footer className="footer"><span>© 2026 Jadeite Systems · Jadeite Glazing</span><span>Sales portal · Help · Privacy</span></footer>
      </div>
    </div>
  );
}
