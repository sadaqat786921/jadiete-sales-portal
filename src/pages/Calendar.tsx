// Calendar & tasks: my visits and follow-up calls (in step with Outlook) and my own reminders.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconPlus, IconCalendarEvent, IconPhone, IconAlertTriangle, IconBrandWindows, IconRefresh, IconMapPin, IconClock, IconChecklist, IconCheck, IconChevronLeft, IconChevronRight, IconPhoneCall, IconExternalLink, IconTrash, IconPencil, IconLayoutGrid, IconListDetails } from '@tabler/icons-react';
import { PageHead, Card, CardHead, Tag, Seg, Check, Tile, useToast, Modal, Field, Empty } from '../components/ui';
import { useStore, TODAY, fmtDate, addDays, mondayOf, Appt, EnquiryX } from '../data/store';
import { me, IMG } from '../data/mock';
import { useMine, PickDealModal, FollowUpModal, MyTaskModal, SalesActionModal, stageLabel } from '../components/sales';

const kindIcon: any = { 'Sales visit': IconCalendarEvent, 'Follow-up call': IconPhone, Survey: IconCalendarEvent, 'Snag visit': IconAlertTriangle };
const kindColor: any = { 'Sales visit': '#0b6e5c', 'Follow-up call': '#e0a100', Survey: '#0b6e5c', 'Snag visit': '#d64545' };

/** What happens when an appointment is marked done: a visit asks for the notes, a call asks what was said. */
export function useApptDone() {
  const toast = useToast();
  const { set } = useStore();
  const mine = useMine();
  const [act, setAct] = useState<{ k: string; e: EnquiryX } | null>(null);
  const done = (a: Appt) => {
    const e = mine.find(r => r.e.name === a.customer)?.e;
    if (a.kind === 'Sales visit' && e?.appt?.status === 'Booked') return setAct({ k: 'apptDone', e });
    set('appts', as => as.map(x => (x.id === a.id ? { ...x, status: 'Done' } : x)));
    if (a.kind === 'Follow-up call' && e) return setAct({ k: 'call', e });
    toast('Marked as done');
  };
  return { done, el: act && <SalesActionModal k={act.k} e={act.e} onClose={() => setAct(null)} /> };
}

function ApptModal({ a, onClose, onDone, onChange }: { a: Appt; onClose: () => void; onDone: () => void; onChange: (e: EnquiryX) => void }) {
  const toast = useToast();
  const { set } = useStore();
  const mine = useMine();
  const e = mine.find(r => r.e.name === a.customer)?.e;
  const [date, setDate] = useState(a.date);
  const [time, setTime] = useState(a.time);
  const [move, setMove] = useState(false);
  const isVisit = a.kind === 'Sales visit';
  const save = () => { set('appts', as => as.map(x => (x.id === a.id ? { ...x, date, time } : x))); toast(`Moved to ${fmtDate(date)} at ${time} · Outlook updated`); onClose(); };
  return (
    <Modal title={`${a.kind} · ${a.customer}`} sub={`${fmtDate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${a.time}`} onClose={onClose} width={560}
      footer={<>
        {!isVisit && a.status !== 'Done' && <button className="btn btn-outline" style={{ marginRight: 'auto', color: 'var(--err)' }} onClick={() => { set('appts', as => as.filter(x => x.id !== a.id)); toast('Call removed from your calendar'); onClose(); }}><IconTrash size={16} />Remove</button>}
        {e && <Link to={`/enquiries/${e.id}`} className="btn btn-grey" onClick={onClose}><IconExternalLink size={16} />Open customer</Link>}
        {a.status !== 'Done' && (isVisit ? (e?.appt?.status === 'Booked' && <button className="btn btn-outline" onClick={() => { onClose(); onChange(e); }}><IconPencil size={16} />Change</button>) : !move && <button className="btn btn-outline" onClick={() => setMove(true)}><IconPencil size={16} />Move</button>)}
        {move ? <button className="btn btn-primary" onClick={save}>Save new time</button> : a.status !== 'Done' && <button className="btn btn-primary" onClick={() => { onClose(); onDone(); }}>{isVisit ? <><IconCheck size={16} />Visit done — add notes</> : <><IconPhoneCall size={16} />Log the call</>}</button>}
      </>}>
      {e && (
        <div className="hstack" style={{ gap: 12, padding: 12, borderRadius: 12, background: 'var(--bg)' }}>
          <img src={IMG[e.photo]} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />
          <div className="vstack" style={{ gap: 3, flex: 1 }}><b>{e.name}</b><span className="small t2">{e.product} · {stageLabel[e.stage]}</span><span className="tiny muted">{e.phone} · {e.address}</span></div>
          <Tag tone={a.status === 'Done' ? 'ok' : 'jade'}>{a.status}</Tag>
        </div>
      )}
      <div className="grid-2" style={{ rowGap: 10 }}>
        {[['Type', isVisit ? e?.appt?.type || 'Home visit' : 'Phone call'], ['Where', a.address || 'By phone'], ['Calendar', a.synced ? 'In your Outlook' : 'Waiting to sync'], ['Customer told', isVisit ? 'Yes, by email' : '—']].map(([l, v]) => <div key={l} className="vstack" style={{ gap: 2 }}><span className="tiny muted">{l}</span><b style={{ fontSize: 13 }}>{v}</b></div>)}
      </div>
      {isVisit && e?.appt?.notes && <div className="alert info small">{e.appt.notes}</div>}
      {move && <div className="grid-2"><Field label="New date"><input type="date" className="input" min={TODAY} value={date} onChange={x => x.target.value && setDate(x.target.value)} /></Field><Field label="Time"><select className="select" value={time} onChange={x => setTime(x.target.value)}>{['09:00', '10:00', '11:30', '13:30', '16:00', '17:00', '18:00'].map(t => <option key={t}>{t}</option>)}</select></Field></div>}
    </Modal>
  );
}

export default function Calendar() {
  const toast = useToast();
  const { appts, tasks, set } = useStore();
  const mine = useMine();
  const [week, setWeek] = useState(mondayOf(TODAY));
  const [view, setView] = useState('week');
  const [tf, setTf] = useState('open');
  const [modal, setModal] = useState<string | null>(null);
  const [open, setOpen] = useState<Appt | null>(null);
  const [change, setChange] = useState<EnquiryX | null>(null);
  const [book, setBook] = useState<EnquiryX | null>(null);
  const apptDone = useApptDone();
  const my = appts.filter(a => a.who === me.id);
  const days = Array.from({ length: 6 }, (_, i) => addDays(week, i));
  const inWeek = my.filter(a => a.date >= week && a.date <= days[5]);
  const myTasks = tasks.filter(t => t.owner === me.id);
  const lateTasks = myTasks.filter(t => !t.done && t.due < TODAY);
  const tl = myTasks.filter(t => (tf === 'open' ? !t.done : t.done)).sort((a, b) => a.due.localeCompare(b.due));
  const notSynced = my.filter(a => !a.synced).length;
  const needAppt = mine.filter(r => r.e.stage === 'Qualification' || (r.e.stage === 'Appointment' && r.e.appt?.status !== 'Booked'));
  const agenda = my.filter(a => a.date >= TODAY || a.status !== 'Done').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const Item = ({ a }: { a: Appt }) => {
    const I = kindIcon[a.kind];
    return (
      <button type="button" className="card" onClick={() => setOpen(a)} style={{ padding: 10, gap: 6, borderLeft: `3px solid ${kindColor[a.kind]}`, textAlign: 'left', opacity: a.status === 'Done' ? 0.6 : 1, cursor: 'pointer' }}>
        <span className="hstack tiny b" style={{ gap: 5, color: kindColor[a.kind] }}><I size={13} />{a.time.split(' ')[0]} · {a.kind === 'Sales visit' ? 'Visit' : 'Call'}</span>
        <b style={{ fontSize: 13 }}>{a.customer}</b>
        {a.address && <span className="tiny muted">{a.address.split(', ').pop()}</span>}
        {a.status === 'Done' ? <Tag tone="ok">Done</Tag> : a.status === 'Overdue' ? <Tag tone="err">Missed</Tag> : !a.synced && <Tag tone="warn">Not in Outlook yet</Tag>}
      </button>
    );
  };
  return (
    <>
      <PageHead title="Calendar & tasks" crumbs={[{ label: 'My day', to: '/' }, { label: 'Calendar & tasks' }]}
        actions={<><button className="btn btn-grey" onClick={() => setModal('task')}><IconChecklist size={16} />Add task</button><button className="btn btn-outline" onClick={() => setModal('call')}><IconPhone size={16} />Book follow-up call</button><button className="btn btn-primary" onClick={() => setModal('appt')}><IconPlus size={16} />Book appointment</button></>} />
      <div className={`alert ${notSynced ? 'warn' : 'ok'} small`}><IconBrandWindows size={16} />{notSynced ? `${notSynced} appointment is waiting to sync with your Outlook.` : 'Your calendar is in step with Outlook.'}<button className="link ml-auto" onClick={() => { set('appts', as => as.map(a => (a.who === me.id ? { ...a, synced: true } : a))); toast('Synced with Outlook'); }}><IconRefresh size={14} />Sync now</button></div>
      <div className="grid-4">
        {[['Visits this week', inWeek.filter(a => a.kind === 'Sales visit').length, IconCalendarEvent, '#0b6e5c'], ['Calls this week', inWeek.filter(a => a.kind === 'Follow-up call').length, IconPhone, '#e0a100'], ['Tasks due today', myTasks.filter(t => !t.done && t.due === TODAY).length, IconChecklist, '#0b6e5c'], ['Overdue', lateTasks.length + my.filter(a => a.status === 'Overdue').length, IconAlertTriangle, '#d64545']].map(([l, v, I, c]: any) => (
          <div key={l} className="card" style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16 }}><Tile icon={<I size={22} />} color={c} size={48} /><div className="vstack" style={{ gap: 2 }}><span className="small t2">{l}</span><b style={{ fontSize: 22 }}>{v}</b></div></div>
        ))}
      </div>
      <div className="row">
        <Card className="grow">
          <div className="between" style={{ flexWrap: 'wrap', gap: 10 }}>
            {view === 'week' ? (
              <div className="hstack" style={{ gap: 8 }}>
                <button className="icon-btn" onClick={() => setWeek(addDays(week, -7))} aria-label="Previous week"><IconChevronLeft size={16} /></button>
                <b style={{ fontSize: 16, minWidth: 220, textAlign: 'center' }}>{fmtDate(week, { day: 'numeric', month: 'short' })} – {fmtDate(days[5], { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                <button className="icon-btn" onClick={() => setWeek(addDays(week, 7))} aria-label="Next week"><IconChevronRight size={16} /></button>
                <button className="btn btn-outline btn-xs" onClick={() => setWeek(mondayOf(TODAY))}>This week</button>
              </div>
            ) : <b style={{ fontSize: 16 }}>Coming up</b>}
            <Seg value={view} onChange={setView} items={[{ id: 'week', label: 'Week', icon: <IconLayoutGrid size={15} /> }, { id: 'list', label: 'List', icon: <IconListDetails size={15} /> }]} />
          </div>
          {view === 'week' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
              {days.map(d => (
                <div key={d} className="vstack" style={{ gap: 8, minHeight: 300, padding: 8, borderRadius: 10, background: d === TODAY ? 'var(--tint)' : 'var(--bg)', outline: d === TODAY ? '2px solid var(--primary)' : 'none' }}>
                  <div className="between"><b className="small" style={{ color: d === TODAY ? 'var(--primary-dark)' : 'var(--text-2)' }}>{fmtDate(d, { weekday: 'short', day: 'numeric' })}</b>{d === TODAY && <Tag tone="jade">Today</Tag>}</div>
                  {my.filter(a => a.date === d).sort((a, b) => a.time.localeCompare(b.time)).map(a => <Item key={a.id} a={a} />)}
                  {d >= TODAY && <button type="button" className="tiny muted" style={{ border: '1.5px dashed #d5dcd9', borderRadius: 8, background: 'none', padding: '8px 4px' }} onClick={() => setModal('call:' + d)}>+ Add a call</button>}
                </div>
              ))}
            </div>
          ) : (
            <div className="vstack" style={{ gap: 8 }}>
              {agenda.length === 0 && <Empty icon={<IconCalendarEvent size={22} />} title="Nothing booked" sub="Book an appointment or a follow-up call." />}
              {Array.from(new Set(agenda.map(a => a.date))).map(d => (
                <div key={d} className="vstack" style={{ gap: 8 }}>
                  <b className="small" style={{ color: d === TODAY ? 'var(--primary-dark)' : d < TODAY ? 'var(--err)' : 'var(--text-2)' }}>{d === TODAY ? 'Today' : d === addDays(TODAY, 1) ? 'Tomorrow' : fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                  {agenda.filter(a => a.date === d).map(a => {
                    const I = kindIcon[a.kind];
                    return (
                      <div key={a.id} className="card click" onClick={() => setOpen(a)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderLeft: `3px solid ${kindColor[a.kind]}`, cursor: 'pointer' }}>
                        <Tile icon={<I size={18} />} color={kindColor[a.kind]} size={38} />
                        <div className="vstack" style={{ gap: 3, flex: 1 }}><b style={{ fontSize: 13.5 }}>{a.kind} · {a.customer}</b><span className="small t2 hstack" style={{ gap: 12 }}><span className="hstack" style={{ gap: 4 }}><IconClock size={13} />{a.time}</span>{a.address && <span className="hstack" style={{ gap: 4 }}><IconMapPin size={13} />{a.address}</span>}</span></div>
                        {a.status === 'Done' ? <Tag tone="ok">Done</Tag> : a.status === 'Overdue' ? <Tag tone="err">Missed</Tag> : <Tag tone="jade">Booked</Tag>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <div className="hstack small t2" style={{ gap: 14 }}><span className="hstack" style={{ gap: 6 }}><i className="dot" style={{ background: '#0b6e5c' }} />Sales visit</span><span className="hstack" style={{ gap: 6 }}><i className="dot" style={{ background: '#e0a100' }} />Follow-up call</span><span className="muted">Click one to see it, move it or mark it done.</span></div>
        </Card>
        <Card className="w-400">
          <CardHead title="My tasks" sub="Reminders only you see" right={<button className="btn btn-outline btn-xs" onClick={() => setModal('task')}><IconPlus size={13} />Add</button>} />
          <Seg value={tf} onChange={setTf} items={[{ id: 'open', label: `To do · ${myTasks.filter(t => !t.done).length}` }, { id: 'done', label: 'Done' }]} />
          {lateTasks.length > 0 && tf === 'open' && <div className="alert err small"><IconAlertTriangle size={16} />{lateTasks.length} task{lateTasks.length > 1 ? 's are' : ' is'} overdue</div>}
          <div className="list">
            {tl.map(t => {
              const late = !t.done && t.due < TODAY;
              const e = mine.find(r => r.e.id === t.enq)?.e;
              return (
                <div key={t.id} className="hstack" style={{ gap: 10, padding: '11px 0', alignItems: 'flex-start' }}>
                  <Check on={t.done} onChange={v => { set('tasks', ts => ts.map(x => (x.id === t.id ? { ...x, done: v } : x))); toast(v ? 'Task done' : 'Task back on your list'); }} />
                  <div className="vstack" style={{ gap: 5, flex: 1 }}>
                    <b style={{ fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'var(--text)' }}>{t.title}</b>
                    <span className="hstack tiny t2" style={{ gap: 8, flexWrap: 'wrap' }}><span style={{ color: late ? 'var(--err)' : 'inherit', fontWeight: late ? 600 : 400 }}>{late ? 'Overdue · ' : ''}{t.due === TODAY ? 'Today' : fmtDate(t.due)}</span>{e && <Link to={`/enquiries/${e.id}`} className="link" style={{ fontSize: 11 }}>{e.name}</Link>}</span>
                  </div>
                  {!t.done && <button className="icon-btn" style={{ width: 28, height: 28 }} aria-label="Move to tomorrow" title="Move to tomorrow" onClick={() => { set('tasks', ts => ts.map(x => (x.id === t.id ? { ...x, due: addDays(t.due < TODAY ? TODAY : t.due, 1) } : x))); toast('Moved to the next day'); }}><IconChevronRight size={14} /></button>}
                </div>
              );
            })}
            {tl.length === 0 && <div className="small muted" style={{ padding: 16, textAlign: 'center' }}>{tf === 'open' ? 'Nothing to do. Well done.' : 'Nothing done yet.'}</div>}
          </div>
        </Card>
      </div>
      {modal === 'task' && <MyTaskModal onClose={() => setModal(null)} />}
      {modal?.startsWith('call') && <FollowUpModal day={modal.split(':')[1]} onClose={() => setModal(null)} />}
      {modal === 'appt' && <PickDealModal title="Book an appointment" sub="Customers who are ready for a visit" rows={needAppt} cta="Next" onClose={() => setModal(null)} onPick={e => { setModal(null); setBook(e); }} />}
      {open && <ApptModal a={open} onClose={() => setOpen(null)} onDone={() => apptDone.done(open)} onChange={e => setChange(e)} />}
      {(change || book) && <SalesActionModal k="appt" e={(change || book)!} onClose={() => { setChange(null); setBook(null); }} />}
      {apptDone.el}
    </>
  );
}
