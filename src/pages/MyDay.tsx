// My day: everything the salesperson needs today, worked out from their own customer records.
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  IconPlus, IconPhone, IconChevronRight, IconClock, IconCalendar, IconCalendarEvent, IconFileText, IconTrophy, IconInbox, IconAlertTriangle,
  IconMapPin, IconCheck, IconRefresh, IconPencil, IconMessage, IconArrowUpRight, IconTarget, IconChecklist, IconPhoneCall, IconFilter,
} from '@tabler/icons-react';
import { Card, CardHead, PageHead, Tag, Avatar, Tile, Progress, Check, hexA, useToast, Dd } from '../components/ui';
import { AreaLine } from '../components/charts';
import { useStore, TODAY, fmtDate, addDays, EnquiryX } from '../data/store';
import { me, IMG, gbp } from '../data/mock';
import { totalsOf, phaseLabel, Row } from '../components/derive';
import { roleTone } from '../components/Journey';
import { useMine, myTurn, isOpen, isLate, actionKey, stageLabel, stageColor, OPEN_STAGES, NewLeadModal, FollowUpModal, MyTaskModal, SalesActionModal, whoHasIt, afterIndex, AFTER_STEPS } from '../components/sales';
import { commTime } from './Messages';

const OCT = [[28, 29, 30, 1, 2, 3, 4], [5, 6, 7, 8, 9, 10, 11], [12, 13, 14, 15, 16, 17, 18], [19, 20, 21, 22, 23, 24, 25], [26, 27, 28, 29, 30, 31, 1]];
export const wonThisMonth = (rows: Row[]) => rows.filter(r => r.e.stage === 'Won' && (r.e.wonOn || '').endsWith('Oct'));
export const valueOf = (e: EnquiryX) => (e.quote ? totalsOf(e).total : e.value);

export default function MyDay() {
  const nav = useNavigate();
  const toast = useToast();
  const { appts, tasks, set, events } = useStore();
  const mine = useMine();
  const [modal, setModal] = useState<'lead' | 'call' | 'task' | null>(null);
  const [act, setAct] = useState<{ k: string; e: EnquiryX } | null>(null);
  const open = mine.filter(r => isOpen(r.e));
  const turn = mine.filter(myTurn).sort((a, b) => Number(isLate(b.e)) - Number(isLate(a.e)));
  const fresh = mine.filter(r => r.e.stage === 'New Enquiry');
  const replied = mine.filter(r => r.e.stage === 'Follow-up');
  const lateTasks = tasks.filter(t => t.owner === me.id && !t.done && t.due < TODAY);
  const late = open.filter(r => isLate(r.e));
  const waiting = mine.filter(r => r.e.stage === 'Quote Sent');
  const won = wonThisMonth(mine);
  const wonValue = won.reduce((a, r) => a + valueOf(r.e), 0);
  const decided = mine.filter(r => ['Won', 'Lost'].includes(r.e.stage));
  const rate = Math.round((mine.filter(r => r.e.stage === 'Won').length / Math.max(1, decided.length)) * 100);
  const todayAppts = appts.filter(a => a.who === me.id && a.date === TODAY).sort((a, b) => a.time.localeCompare(b.time));
  const todayTasks = tasks.filter(t => t.owner === me.id && (t.due === TODAY || (t.due < TODAY && !t.done)));
  const upcoming = appts.filter(a => a.who === me.id && a.date > TODAY && a.status !== 'Done').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const marked = new Set(appts.filter(a => a.who === me.id && a.date.startsWith('2026-10') && a.status !== 'Done').map(a => +a.date.slice(8)));
  const recByName = (n: string) => mine.find(r => r.e.name === n)?.e;
  const recent = mine.flatMap(r => (r.e.comms || []).filter(c => ['email-in', 'call', 'system'].includes(c.kind)).slice(0, 2).map(c => ({ e: r.e, c }))).sort((a, b) => commTime(b.c.when) - commTime(a.c.when)).slice(0, 5);
  const wonJobs = mine.filter(r => r.e.stage === 'Won').sort((a, b) => afterIndex(a.st.phase) - afterIndex(b.st.phase));
  const doneAppt = (a: (typeof appts)[number]) => {
    const e = recByName(a.customer);
    if (a.kind === 'Sales visit' && e?.appt?.status === 'Booked') return setAct({ k: 'apptDone', e });
    if (a.kind === 'Follow-up call' && e) { set('appts', as => as.map(x => (x.id === a.id ? { ...x, status: 'Done' } : x))); return setAct({ k: 'call', e }); }
    set('appts', as => as.map(x => (x.id === a.id ? { ...x, status: 'Done' } : x))); toast('Marked as done');
  };
  return (
    <>
      <PageHead title="My day" crumbs={[{ label: 'My day', to: '/' }, { label: me.name }]}
        actions={<><button className="btn btn-grey" onClick={() => setModal('call')}><IconPhone size={16} />Book follow-up call</button><button className="btn btn-primary" onClick={() => setModal('lead')}><IconPlus size={16} />Add an enquiry</button></>} />

      <div className="attn">
        <div style={{ background: 'var(--deep)', color: '#fff' }}><IconAlertTriangle size={18} color="#00c7a1" /><b style={{ fontSize: 13 }}>Needs your<br />attention</b></div>
        {[['Your turn', turn.length, 'Customers waiting for you', '#e0a100', '/pipeline?show=turn'], ['Overdue', late.length + lateTasks.length, 'Missed follow-ups and tasks', '#d64545', '/pipeline?show=late'], ['New enquiries', fresh.length, 'Call or email within a day', '#e0a100', '/pipeline?show=new'], ['Customers replied', replied.length, 'Answer, then Won or Lost', '#e0a100', '/quotes?show=replied']].map(([l, n, sub, c, to]: any) => (
          <Link key={l} to={to}>
            <span className="n" style={{ color: n ? c : 'var(--ok)' }}>{n}</span>
            <span className="vstack" style={{ gap: 1 }}><b style={{ fontSize: 13 }}>{l}</b><span className="tiny muted">{n ? sub : 'All clear'}</span></span>
            <IconChevronRight size={15} color="#6b7a78" style={{ marginLeft: 'auto' }} />
          </Link>
        ))}
      </div>

      <div className="banner">
        <div className="photo" style={{ backgroundImage: `url(${IMG.orangery})` }} />
        <span className="glow" style={{ left: 520, top: -60 }} />
        <div className="vstack" style={{ gap: 8 }}>
          <div className="hstack" style={{ gap: 10 }}><h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>Good morning, {me.first}</h2><button className="tile" style={{ width: 26, height: 26, background: 'rgba(255,255,255,.14)', borderRadius: 6, border: 0, color: '#fff' }} onClick={() => nav('/settings')} aria-label="Edit my profile"><IconPencil size={14} /></button></div>
          <span style={{ color: '#cfe0db', fontSize: 14 }}>{(n => (n ? `You have ${n} call${n === 1 ? '' : 's'} or visit${n === 1 ? '' : 's'} left today` : 'Your calls and visits are done for today'))(todayAppts.filter(a => a.status !== 'Done').length)}{turn.length ? ` and ${turn.length} customer${turn.length === 1 ? ' is' : 's are'} waiting for your next step.` : '.'}</span>
        </div>
        <span className="ml-auto hstack" style={{ color: '#e6efec', fontSize: 13.5 }}><IconRefresh size={16} />In step with Outlook and Framepoint</span>
      </div>

      <div className="grid-4">
        <Stat icon={<IconFilter size={24} />} color="#00c7a1" value={String(open.length)} label="Open deals" tag={gbp(open.reduce((a, r) => a + valueOf(r.e), 0))} tone="ok" foot={[['New', String(fresh.length)], ['Visits booked', String(mine.filter(r => r.e.stage === 'Appointment').length)]]} onClick={() => nav('/pipeline')} />
        <Stat icon={<IconFileText size={24} />} color="#0b6e5c" value={gbp([...waiting, ...replied].reduce((a, r) => a + valueOf(r.e), 0))} label="Quotes with customers" tone="ok" foot={[['Waiting', String(waiting.length)], ['Replied', String(replied.length)]]} onClick={() => nav('/quotes')} />
        <Stat icon={<IconTrophy size={24} />} color="#1f9d5b" value={gbp(wonValue)} label="Won this month" tag={`${Math.round((wonValue / me.target) * 100)}% of target`} tone={wonValue >= me.target ? 'ok' : 'warn'} foot={[['Deals', String(won.length)], ['Target', gbp(me.target)]]} onClick={() => nav('/performance')} />
        <Stat icon={<IconTarget size={24} />} color="#0b6e5c" value={`${rate}%`} label="My win rate" tag="All time" tone="ok" foot={[['Won', String(mine.filter(r => r.e.stage === 'Won').length)], ['Lost', String(mine.filter(r => r.e.stage === 'Lost').length)]]} onClick={() => nav('/performance')} />
      </div>

      <div className="row">
        <Card className="grow">
          <CardHead title="Today" sub={fmtDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long' })} right={<Link to="/calendar" className="link"><IconCalendar size={14} />Calendar</Link>} />
          {todayAppts.length === 0 && todayTasks.length === 0 && <span className="small muted">Nothing booked for today.</span>}
          {todayAppts.map(a => {
            const e = recByName(a.customer);
            return (
              <div key={a.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderLeft: `3px solid ${a.kind === 'Sales visit' ? '#0b6e5c' : '#e0a100'}` }}>
                <div className="datechip"><b>{a.time.split(' ')[0]}</b><span>{a.kind === 'Sales visit' ? 'Visit' : 'Call'}</span></div>
                <div className="vstack" style={{ gap: 3, flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13.5 }}>{a.kind} · {a.customer}</b>
                  <span className="small t2 hstack" style={{ gap: 10, flexWrap: 'wrap' }}>{a.address && <span className="hstack" style={{ gap: 4 }}><IconMapPin size={13} />{a.address}</span>}{e && <span>{e.product} · {stageLabel[e.stage]}</span>}</span>
                </div>
                {e && <Link to={`/enquiries/${e.id}`} className="btn btn-grey btn-xs">Open</Link>}
                {a.status === 'Done' ? <Tag tone="ok">Done</Tag> : <button className="btn btn-primary btn-xs" onClick={() => doneAppt(a)}>{a.kind === 'Follow-up call' ? <><IconPhoneCall size={13} />Log the call</> : <><IconCheck size={13} />Done</>}</button>}
              </div>
            );
          })}
          {todayTasks.length > 0 && <b style={{ fontSize: 13 }}>Tasks</b>}
          {todayTasks.map(t => {
            const e = mine.find(r => r.e.id === t.enq)?.e;
            const lt = !t.done && t.due < TODAY;
            return (
              <div key={t.id} className="hstack" style={{ gap: 10, padding: '4px 0', alignItems: 'flex-start' }}>
                <Check on={t.done} onChange={v => { set('tasks', ts => ts.map(x => (x.id === t.id ? { ...x, done: v } : x))); if (v) toast('Task done'); }} />
                <div className="vstack" style={{ gap: 3, flex: 1 }}>
                  <b style={{ fontSize: 13, color: t.done ? 'var(--muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</b>
                  <span className="hstack tiny t2" style={{ gap: 8 }}><IconClock size={12} />{t.due === TODAY ? 'Today' : fmtDate(t.due)}{lt && <Tag tone="err">Overdue</Tag>}{e && <Link to={`/enquiries/${e.id}`} className="link" style={{ fontSize: 11 }}>{e.name}</Link>}</span>
                </div>
              </div>
            );
          })}
          <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setModal('task')}><IconChecklist size={15} />Add task</button>
        </Card>

        <Card className="w-400">
          <CardHead title="Your turn" sub="One button for the next step" right={<Link to="/pipeline?show=turn" className="link">All<IconChevronRight size={14} /></Link>} />
          {turn.length === 0 && <div className="alert ok small"><IconCheck size={16} />Nobody is waiting for you. Well done.</div>}
          {turn.slice(0, 6).map(r => (
            <div key={r.e.id} className="hstack" style={{ gap: 10, padding: '10px 0', borderTop: '1px solid var(--border)', alignItems: 'flex-start' }}>
              <img src={IMG[r.e.photo]} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
              <div className="vstack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
                <Link to={`/enquiries/${r.e.id}`} className="between" style={{ gap: 8 }}>
                  <span className="vstack" style={{ gap: 2, minWidth: 0 }}><b style={{ fontSize: 13 }}>{r.e.name}</b><span className="tiny muted">{r.e.product} · {stageLabel[r.e.stage]}</span></span>
                  <span className="tiny" style={{ whiteSpace: 'nowrap', color: isLate(r.e) ? 'var(--err)' : 'var(--text-2)', fontWeight: isLate(r.e) ? 600 : 400 }}>{isLate(r.e) ? 'Overdue' : `Due ${r.e.nextDue}`}</span>
                </Link>
                <button className="btn btn-dark btn-xs" style={{ alignSelf: 'flex-start' }} onClick={() => setAct({ k: actionKey(r.st), e: r.e })}>{r.st.icon}{r.st.label}</button>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="row">
        <Card className="w-360">
          <CardHead title="My calendar" right={<button className="link" onClick={() => setModal('call')}><IconPlus size={14} />Add call</button>} />
          <div className="between"><b style={{ fontSize: 14 }}>October 2026</b><Link to="/calendar" className="link">Open calendar<IconChevronRight size={14} /></Link></div>
          <div className="cal-grid">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="d b t2">{d}</div>)}
            {OCT.flat().map((d, i) => {
              const out = (i < 3) || i > 33;
              return <div key={i} className={`d ${out ? 'prev' : d === 16 ? 'today' : marked.has(d) ? 'mark' : ''}`}><span>{d}</span></div>;
            })}
          </div>
          <b style={{ fontSize: 14 }}>Coming up</b>
          {upcoming.length === 0 && <span className="small muted">Nothing booked yet.</span>}
          {upcoming.slice(0, 3).map(a => {
            const e = recByName(a.customer);
            return (
              <Link to={e ? `/enquiries/${e.id}` : '/calendar'} key={a.id} className="card" style={{ padding: 0, gap: 0, borderLeft: `3px solid ${a.kind === 'Sales visit' ? '#0b6e5c' : '#e0a100'}` }}>
                <div className="hstack" style={{ gap: 10, padding: 12 }}>
                  <img src={IMG[e?.photo || 'house']} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                  <div className="vstack" style={{ gap: 3 }}><b style={{ fontSize: 13.5 }}>{a.kind} · {a.customer}</b><span className="small t2 hstack" style={{ gap: 5 }}><IconCalendar size={13} />{fmtDate(a.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
                </div>
                <div className="between small t2" style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}><span className="hstack" style={{ gap: 5 }}><IconClock size={13} />{a.time}</span>{a.address && <span className="hstack" style={{ gap: 4 }}><IconMapPin size={13} />{a.address.split(', ').pop()}</span>}</div>
              </Link>
            );
          })}
        </Card>

        <div className="col grow">
          <Card>
            <CardHead title="My pipeline" sub="Open deals by stage" right={<Link to="/pipeline" className="link">Open pipeline<IconChevronRight size={14} /></Link>} />
            <div className="vstack" style={{ gap: 10 }}>
              {OPEN_STAGES.map(st => {
                const rs = open.filter(r => r.e.stage === st);
                const v = rs.reduce((a, r) => a + valueOf(r.e), 0);
                return (
                  <Link key={st} to={`/pipeline?stage=${encodeURIComponent(st)}`} className="hstack" style={{ gap: 12 }}>
                    <span style={{ width: 130 }} className="small b">{stageLabel[st]}</span>
                    <div style={{ flex: 1 }}><Progress value={(rs.length / Math.max(1, ...OPEN_STAGES.map(s => open.filter(r => r.e.stage === s).length))) * 100} color={stageColor[st]} height={10} /></div>
                    <span className="small t2" style={{ width: 120, textAlign: 'right' }}><b style={{ color: 'var(--text)' }}>{rs.length}</b> · {v ? gbp(v) : '—'}</span>
                  </Link>
                );
              })}
            </div>
          </Card>
          <Card>
            <CardHead title="My won jobs" sub="What the office is doing for your customers" right={<Link to="/won" className="link">All won jobs<IconChevronRight size={14} /></Link>} />
            {wonJobs.slice(0, 4).map(r => (
              <Link key={r.e.id} to={`/enquiries/${r.e.id}`} className="hstack" style={{ gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <img src={IMG[r.e.photo]} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} />
                <div className="vstack" style={{ gap: 2, flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>{r.e.name}</b><span className="tiny muted">{r.e.jobId || `Won ${r.e.wonOn}`}</span></div>
                <div className="vstack" style={{ gap: 5, width: 170, flex: '0 0 170px' }}>
                  <div className="hstack" style={{ gap: 3 }}>{AFTER_STEPS.map((s, i) => <span key={s.id} title={s.label} style={{ flex: 1, height: 6, borderRadius: 3, background: i < afterIndex(r.st.phase) ? 'var(--primary-dark)' : i === afterIndex(r.st.phase) ? 'var(--primary)' : 'var(--border)' }} />)}</div>
                  <span className="tiny t2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.st.status}>{r.st.role === 'Sales' ? r.st.label : phaseLabel(r.st.phase)}</span>
                </div>
                <Tag tone={r.st.role === 'Sales' ? 'warn' : roleTone[r.st.role]}>{r.st.role === 'Sales' ? 'Your turn' : whoHasIt(r, events).split(' ')[0]}</Tag>
              </Link>
            ))}
          </Card>
        </div>

        <Card className="w-320">
          <CardHead title="Customer activity" right={<Link to="/messages" className="link">Messages<IconChevronRight size={14} /></Link>} />
          <div className="list">
            {recent.map(({ e, c }) => (
              <Link to={`/enquiries/${e.id}`} key={c.id} className="hstack" style={{ gap: 10, padding: '10px 0', alignItems: 'flex-start' }}>
                <Avatar i={e.initials} size={32} />
                <div className="vstack" style={{ gap: 3, flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>{e.name}</b><span className="small t2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span><span className="tiny muted">{c.when}</span></div>
                <Tag tone={c.kind === 'email-in' ? 'warn' : c.kind === 'call' ? 'grey' : 'jade'}>{c.kind === 'email-in' ? 'Customer' : c.kind === 'call' ? 'Call' : 'Update'}</Tag>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid-4" style={{ gap: 16 }}>
        {[['My pipeline', 'Every deal, stage by stage', '#0b6e5c', IconFilter, '/pipeline'], ['Add an enquiry', 'Showroom, referral or phone', '#00c7a1', IconPlus, 'lead'], ['Messages', 'Customers waiting for a reply', '#0b6e5c', IconMessage, '/messages'], ['Calendar & tasks', 'Visits, calls and reminders', '#0b6e5c', IconCalendarEvent, '/calendar']].map(([t, s, c, I, to]: any) => (
          <button key={t} className="pill-action" style={{ background: hexA(c, 0.08), borderColor: hexA(c, 0.2), textAlign: 'left' }} onClick={() => (to === 'lead' ? setModal('lead') : nav(to))}>
            <span className="ic" style={{ background: c }}><I size={19} /></span>
            <span className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 14 }}>{t}</b><span className="small t2">{s}</span></span>
            <IconChevronRight size={17} color={c} />
          </button>
        ))}
      </div>

      {modal === 'lead' && <NewLeadModal onClose={() => setModal(null)} onCreated={id => nav(`/enquiries/${id}`)} />}
      {modal === 'call' && <FollowUpModal onClose={() => setModal(null)} />}
      {modal === 'task' && <MyTaskModal onClose={() => setModal(null)} />}
      {act && <SalesActionModal k={act.k} e={act.e} onClose={() => setAct(null)} />}
    </>
  );
}

export function Stat({ icon, color, value, label, tag, tone, foot, onClick }: any) {
  return (
    <div className="card stat-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="hstack" style={{ gap: 12, alignItems: 'center' }}>
        <Tile icon={icon} color={color} size={52} radius={10} />
        <div className="vstack" style={{ gap: 2 }}><span className="kpi">{value}</span><span className="t2" style={{ fontSize: 13 }}>{label}</span></div>
        {tag && <span className="ml-auto" style={{ alignSelf: 'flex-start', marginTop: 4 }}><Tag tone={`solid-${tone}`}>{tag}</Tag></span>}
      </div>
      <div className="between small t2">{foot.map(([k, v]: any) => <span key={k}>{k} : <b style={{ color: 'var(--text)' }}>{v}</b></span>)}</div>
    </div>
  );
}
