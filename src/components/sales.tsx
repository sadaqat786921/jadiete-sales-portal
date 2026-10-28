// Shared pieces for the Sales portal. A salesperson only ever sees their own customers,
// and the same record moves on everywhere: the office sees every change straight away.
import React, { useMemo, useState } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconPhone, IconRefresh, IconChecklist, IconPlus } from '@tabler/icons-react';
import { Modal, Field, useToast, Check } from './ui';
import { ActionModal, Step } from './Journey';
import { useRows, Row } from './derive';
import { me, staffById, gbp } from '../data/mock';
import { useStore, TODAY, addDays, fmtDate, EnquiryX, DiaryEvent } from '../data/store';
import { crewTeam } from '../data/crew';
import { installOf } from './Journey';

export const SALES_STAGES = ['New Enquiry', 'Qualification', 'Appointment', 'Quote Preparation', 'Quote Sent', 'Follow-up', 'Won', 'Lost'] as const;
export const stageLabel: Record<string, string> = { 'New Enquiry': 'New enquiry', Qualification: 'Qualification', Appointment: 'Appointment', 'Quote Preparation': 'Quote preparation', 'Quote Sent': 'Quote sent', 'Follow-up': 'Follow-up', Won: 'Won', Lost: 'Lost' };
export const stageColor: Record<string, string> = { 'New Enquiry': '#0b6e5c', Qualification: '#0b6e5c', Appointment: '#00c7a1', 'Quote Preparation': '#e0a100', 'Quote Sent': '#0b6e5c', 'Follow-up': '#e0a100', Won: '#1f9d5b', Lost: '#d64545' };
export const OPEN_STAGES = ['New Enquiry', 'Qualification', 'Appointment', 'Quote Preparation', 'Quote Sent', 'Follow-up'];

export const isMine = (e: EnquiryX) => e.type === 'Sales' && e.assigned === me.id;
export const isOpen = (e: EnquiryX) => OPEN_STAGES.includes(e.stage);

/** Every one of my records with its current step. */
export function useMine(): Row[] {
  const rows = useRows();
  return useMemo(() => rows.filter(r => isMine(r.e)), [rows]);
}

/** The salesperson has to do something now (waiting for a customer reply only counts once the follow-up is due). */
export const myTurn = (r: Row) => r.st.role === 'Sales' && !r.st.wait && (r.st.key !== 'reply' || ['Today', 'Overdue'].includes(r.e.nextDue));
export const isLate = (e: EnquiryX) => isOpen(e) && e.nextDue === 'Overdue';
export const actionKey = (st: Step) => (st.key === 'decide' ? 'won' : st.key);

/** Who has the next step, in plain words, when it is not the salesperson. */
export function whoHasIt(r: Row, events: DiaryEvent[]) {
  const { e, st } = r;
  if (st.role === 'Sales') return 'You';
  if (st.role === 'Office') return 'Sarah in the office';
  if (st.role === 'Surveyor') return `${staffById(e.finalSurvey?.surveyor)?.name || 'The surveyor'} (surveyor)`;
  if (st.role === 'Installer') return `${crewTeam(installOf(e, events))?.name || 'The installers'} (installers)`;
  return 'The director';
}

/** Steps of a won job, from the salesperson's point of view, for the "After the sale" tab and Won jobs. */
export const AFTER_STEPS = [
  { id: 'won', label: 'Office checks' },
  { id: 'order', label: 'Ordered' },
  { id: 'ready', label: 'Delivered' },
  { id: 'install', label: 'Being fitted' },
  { id: 'review', label: 'Finishing off' },
  { id: 'pay', label: 'Final payment' },
  { id: 'after', label: 'Complete' },
];
export const afterIndex = (phase: string) => Math.max(0, AFTER_STEPS.findIndex(s => s.id === phase));

/* ---------- Pick one of my deals (used by "Book appointment", "Link Framepoint quote" and so on) ---------- */
export function PickDealModal({ title, sub, rows, cta, onClose, onPick }: { title: string; sub: string; rows: Row[]; cta: string; onClose: () => void; onPick: (e: EnquiryX) => void }) {
  const [id, setId] = useState(rows[0]?.e.id || '');
  return (
    <Modal title={title} sub={sub} onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!id} onClick={() => { const r = rows.find(x => x.e.id === id); if (r) onPick(r.e); }}>{cta}</button></>}>
      {rows.length === 0 ? <div className="alert ok small"><IconCircleCheck size={16} />Nothing is waiting for this right now.</div> : (
        <div className="vstack" style={{ gap: 8 }}>
          {rows.map(({ e, st }) => (
            <button key={e.id} type="button" className={`job-pick ${id === e.id ? 'on' : ''}`} onClick={() => setId(e.id)}>
              <div className="vstack" style={{ gap: 3, flex: 1, minWidth: 0 }}><b style={{ fontSize: 14 }}>{e.name}</b><span className="tiny muted">{e.product} · {e.address} · {stageLabel[e.stage]}</span><span className="tiny t2">{st.status}</span></div>
              <span className="tick">{id === e.id && <IconCircleCheck size={14} />}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ---------- My own enquiry (showroom visit, referral, someone who rang me) ---------- */
const initialsOf = (n: string) => n.replace(/^(Mr|Mrs|Ms|Dr|Miss)\.?\s+/i, '').split(/\s|&/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'NC';
export function NewLeadModal({ onClose, preset, onCreated }: { onClose: () => void; preset?: { name: string; phone: string; email: string; address: string; postcode: string }; onCreated?: (id: string) => void }) {
  const toast = useToast();
  const { enquiries, set } = useStore();
  const [name, setName] = useState(preset?.name || '');
  const [phone, setPhone] = useState(preset?.phone || '');
  const [email, setEmail] = useState(preset?.email || '');
  const [address, setAddress] = useState(preset?.address || '');
  const [postcode, setPostcode] = useState(preset?.postcode || '');
  const [product, setProduct] = useState<string[]>(['Windows']);
  const [source, setSource] = useState('Showroom');
  const [notes, setNotes] = useState('');
  const [follow, setFollow] = useState(addDays(TODAY, 1));
  const [linked, setLinked] = useState(!!preset?.name);
  const pc = postcode.replace(/\s/g, '').toUpperCase();
  const dup = !linked && pc.length >= 3 ? enquiries.find(e => e.type === 'Sales' && e.postcode.replace(/\s/g, '').toUpperCase().startsWith(pc)) : undefined;
  const othersCustomer = (linked || dup) && (dup || enquiries.find(e => e.name === name && e.postcode === postcode))?.assigned;
  const owner = othersCustomer && othersCustomer !== me.id ? staffById(othersCustomer) : undefined;
  const toggle = (p: string) => setProduct(ps => (ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]));
  const save = () => {
    const id = 'EN-' + (2300 + enquiries.length);
    const when = `${fmtDate(TODAY, { day: '2-digit', month: 'short' })}, ${new Date().toTimeString().slice(0, 5)}`;
    set('enquiries', es => [{ id, name: name.trim(), initials: initialsOf(name), phone: phone || '—', email: email || '—', address: address || '—', postcode: postcode.toUpperCase() || '—', product: product.join(', ') || 'Not known', source, received: 'Just now', daysAgo: 0, assigned: me.id, stage: 'New Enquiry', value: 0, next: 'Call the customer', nextDue: follow === TODAY ? 'Today' : fmtDate(follow), photo: 'house', type: 'Sales', stageDays: 0, followUp: follow, hot: true,
      comms: [{ id: 'c' + Date.now(), kind: 'system', title: `Enquiry added by ${me.name} · ${source.toLowerCase()}`, body: notes || undefined, when, who: me.name }] }, ...es]);
    set('tasks', ts => [{ id: 'tk' + Date.now(), title: `Contact ${name.trim()} about ${product.join(', ').toLowerCase() || 'their enquiry'}`, owner: me.id, due: follow, enq: id, done: false }, ...ts]);
    toast(`${name.trim()} added to your pipeline · the office can see it too`);
    onCreated?.(id); onClose();
  };
  return (
    <Modal title="Add an enquiry" sub="For a customer who came to you — in the showroom, by referral or by phone. It goes into your pipeline." onClose={onClose} width={720}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={name.trim().length < 2 || !!owner} onClick={save}><IconPlus size={16} />Add to my pipeline</button></>}>
      <div className="grid-2">
        <Field label="Customer name"><input className="input" placeholder="e.g. Mr & Mrs Patel" value={name} onChange={x => setName(x.target.value)} /></Field>
        <Field label="Phone"><input className="input" placeholder="07700 900 000" value={phone} onChange={x => setPhone(x.target.value)} /></Field>
        <Field label="Email"><input className="input" placeholder="name@email.co.uk" value={email} onChange={x => setEmail(x.target.value)} /></Field>
        <Field label="Postcode" hint="We check for an existing customer as you type."><input className="input" placeholder="HG1 2AB" value={postcode} onChange={x => { setPostcode(x.target.value); setLinked(false); }} /></Field>
      </div>
      <Field label="Property address"><input className="input" placeholder="House number and street, town" value={address} onChange={x => setAddress(x.target.value)} /></Field>
      {dup && !linked && (
        <div className="alert warn"><IconAlertTriangle size={18} /><div style={{ flex: 1 }}><b>This may be an existing customer:</b> {dup.name}, {dup.address} {dup.postcode}{dup.assigned && dup.assigned !== me.id ? ` · ${staffById(dup.assigned)?.name}'s customer` : ''}.</div><button className="btn btn-dark btn-xs" onClick={() => { setLinked(true); setName(dup.name); setPhone(dup.phone); setEmail(dup.email); setAddress(dup.address); setPostcode(dup.postcode); }}>Use this customer</button></div>
      )}
      {owner ? <div className="alert err small"><IconAlertTriangle size={16} /><div>One customer has one salesperson. <b>&nbsp;{name}&nbsp;</b> is {owner.name}'s customer — please ask Sarah in the office to pass it to you or to {owner.name.split(' ')[0]}.</div></div>
        : linked && <div className="alert ok small"><IconCircleCheck size={16} />Linked to the existing customer — no duplicate record is made.</div>}
      <Field label="Interested in"><div className="hstack" style={{ flexWrap: 'wrap' }}>{['Windows', 'Doors', 'Bi-folds', 'Conservatory', 'Roof lantern', 'Repairs'].map(p => <button key={p} type="button" className={`chip ${product.includes(p) ? 'on' : ''}`} onClick={() => toggle(p)}>{p}</button>)}</div></Field>
      <div className="grid-2">
        <Field label="How did they find us?"><select className="select" value={source} onChange={x => setSource(x.target.value)}><option>Showroom</option><option>Referral</option><option>Phone call</option><option>Website</option><option>Email</option></select></Field>
        <Field label="When will you contact them?" hint="A task is added to your list."><input type="date" className="input" min={TODAY} value={follow} onChange={x => x.target.value && setFollow(x.target.value)} /></Field>
      </div>
      <Field label="Notes (optional)"><textarea className="textarea" value={notes} onChange={x => setNotes(x.target.value)} placeholder="e.g. Wants grey frames. 1930s semi. Best to call after 5pm." /></Field>
    </Modal>
  );
}

/* ---------- A follow-up call in my calendar ---------- */
export function FollowUpModal({ e, onClose, onDone, day }: { e?: EnquiryX; onClose: () => void; onDone?: () => void; day?: string }) {
  const toast = useToast();
  const { set, updEnq, appts } = useStore();
  const mine = useMine().filter(r => isOpen(r.e));
  const [id, setId] = useState(e?.id || mine[0]?.e.id || '');
  // Default to two days ahead, skipping Sunday.
  const [date, setDate] = useState(day || (new Date(addDays(TODAY, 2) + 'T12:00:00').getDay() === 0 ? addDays(TODAY, 3) : addDays(TODAY, 2)));
  const [time, setTime] = useState('10:00');
  const [why, setWhy] = useState(e?.stage === 'Quote Sent' || e?.stage === 'Follow-up' ? 'Talk through the quote' : 'Check how they are getting on');
  const rec = mine.find(r => r.e.id === id)?.e || e;
  const clash = appts.find(a => a.who === me.id && a.date === date && a.time.split(' ')[0] === time && a.status !== 'Done');
  const save = () => {
    if (!rec) return;
    set('appts', as => [...as, { id: 'ap' + Date.now(), kind: 'Follow-up call', customer: rec.name, who: me.id, date, time, address: rec.address, synced: true, status: 'Booked' }]);
    updEnq(rec.id, { followUp: date, nextDue: date === TODAY ? 'Today' : fmtDate(date) }, { kind: 'note', title: `Follow-up call booked · ${fmtDate(date)} ${time}`, body: why, who: me.name });
    toast(`Follow-up call with ${rec.name} · ${fmtDate(date)} at ${time} · in your Outlook`);
    onDone?.(); onClose();
  };
  return (
    <Modal title="Book a follow-up call" sub="It goes into your Outlook calendar and your phone reminds you." onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!rec || !!clash} onClick={save}><IconPhone size={16} />Book call</button></>}>
      {!e && <Field label="Customer"><select className="select" value={id} onChange={x => setId(x.target.value)}>{mine.map(r => <option key={r.e.id} value={r.e.id}>{r.e.name} · {r.e.product} · {stageLabel[r.e.stage]}</option>)}</select></Field>}
      <div className="grid-2">
        <Field label="Date"><input type="date" className="input" min={TODAY} value={date} onChange={x => x.target.value && setDate(x.target.value)} /></Field>
        <Field label="Time"><select className="select" value={time} onChange={x => setTime(x.target.value)}>{['09:00', '10:00', '11:30', '13:30', '16:00', '17:00', '18:00'].map(t => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <Field label="What is the call about?"><input className="input" value={why} onChange={x => setWhy(x.target.value)} /></Field>
      {clash ? <div className="alert err small"><IconAlertTriangle size={16} />You already have {clash.kind.toLowerCase()} with {clash.customer} then. Pick another time.</div>
        : <div className="alert ok small"><IconCircleCheck size={16} />You are free at {time} on {fmtDate(date)}.</div>}
    </Modal>
  );
}

/* ---------- A task for me ---------- */
export function MyTaskModal({ e, onClose }: { e?: EnquiryX; onClose: () => void }) {
  const toast = useToast();
  const { set } = useStore();
  const mine = useMine();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(TODAY);
  const [enq, setEnq] = useState(e?.id || '');
  return (
    <Modal title="Add a task" sub="Your own reminder. It shows on My day and in your phone app." onClose={onClose} width={540}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={title.trim().length < 3} onClick={() => { set('tasks', ts => [{ id: 'tk' + Date.now(), title: title.trim(), owner: me.id, due, enq: enq || undefined, done: false }, ...ts]); toast(`Task added · due ${due === TODAY ? 'today' : fmtDate(due)}`); onClose(); }}><IconChecklist size={16} />Add task</button></>}>
      <Field label="What needs doing?"><input className="input" value={title} onChange={x => setTitle(x.target.value)} placeholder="e.g. Send Mrs Noble the obscure glass samples" autoFocus /></Field>
      <div className="grid-2">
        <Field label="Due date"><input type="date" className="input" value={due} onChange={x => x.target.value && setDue(x.target.value)} /></Field>
        <Field label="Customer (optional)"><select className="select" value={enq} disabled={!!e} onChange={x => setEnq(x.target.value)}><option value="">Not linked</option>{mine.map(r => <option key={r.e.id} value={r.e.id}>{r.e.name}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

/* ---------- A lost customer came back ---------- */
export function ReopenModal({ e, onClose, onDone }: { e: EnquiryX; onClose: () => void; onDone?: (tab: string) => void }) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const [why, setWhy] = useState('The customer got back in touch');
  const [call, setCall] = useState(true);
  const to = e.quote ? 'Follow-up' : 'Qualification';
  const save = () => {
    updEnq(e.id, x => ({ stage: to, stageDays: 0, lostReason: undefined, quote: x.quote ? { ...x.quote, status: 'Sent' } : x.quote, next: to === 'Follow-up' ? 'Follow up again' : 'Book appointment', nextDue: 'Today' }), { kind: 'system', title: 'Enquiry reopened', body: why, who: me.name });
    if (call) set('tasks', ts => [{ id: 'tk' + Date.now(), title: `Call ${e.name} — reopened`, owner: me.id, due: TODAY, enq: e.id, done: false }, ...ts]);
    toast(`Reopened · back in ${to}`); onDone?.('overview'); onClose();
  };
  return (
    <Modal title="Reopen this enquiry" sub={`${e.name} · lost: ${e.lostReason || ''}`} onClose={onClose} width={540}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={why.trim().length < 3} onClick={save}><IconRefresh size={16} />Reopen</button></>}>
      <Field label="What happened?"><input className="input" value={why} onChange={x => setWhy(x.target.value)} /></Field>
      <div className="alert info small"><IconInfoCircle size={16} />It goes back into <b>&nbsp;{stageLabel[to]}&nbsp;</b>{e.quote ? ` with quote ${e.quote.ref}` : ''}. The lost reason is kept in the history.</div>
      <Check on={call} onChange={setCall} label="Add a task to call them today" />
    </Modal>
  );
}

/** Opens the right pop-up for any sales step (and the sales-only ones). */
export function SalesActionModal({ k, e, onClose, onDone }: { k: string; e: EnquiryX; onClose: () => void; onDone?: (tab: string) => void }) {
  if (k === 'reopen') return <ReopenModal e={e} onClose={onClose} onDone={onDone} />;
  if (k === 'followup') return <FollowUpModal e={e} onClose={onClose} onDone={() => onDone?.('comms')} />;
  if (k === 'task') return <MyTaskModal e={e} onClose={onClose} />;
  return <ActionModal k={k} e={e} onClose={onClose} onDone={onDone} />;
}

/** Things the salesperson should know about, newest first. */
export function useSalesAlerts() {
  const mine = useMine();
  const { tasks } = useStore();
  return useMemo(() => {
    const out: { id: string; title: string; sub: string; to: string; tone: string; icon: string }[] = [];
    mine.forEach(({ e, st }) => {
      if (e.stage === 'New Enquiry') out.push({ id: 'n' + e.id, title: `New enquiry: ${e.name}`, sub: `${e.product} · ${e.postcode} · ${e.nextDue === 'Overdue' ? 'call is overdue' : 'please contact them'}`, to: `/enquiries/${e.id}`, tone: e.nextDue === 'Overdue' ? 'err' : 'warn', icon: 'inbox' });
      if (e.stage === 'Follow-up') out.push({ id: 'r' + e.id, title: `${e.name} replied to the quote`, sub: e.quote?.reply || 'Open to read the reply', to: `/enquiries/${e.id}`, tone: 'warn', icon: 'mail' });
      if (st.key === 'revise') out.push({ id: 'v' + e.id, title: `${e.name}: a size changed at the final survey`, sub: 'Revise the quote in Framepoint before the office orders', to: `/enquiries/${e.id}`, tone: 'err', icon: 'ruler' });
      if (e.stage === 'Won' && e.wonOn && ['16 Oct', '15 Oct'].includes(e.wonOn)) out.push({ id: 'w' + e.id, title: `Deposit paid · ${e.name}`, sub: `Matched in Xero · with the office now`, to: `/enquiries/${e.id}`, tone: 'ok', icon: 'pound' });
    });
    const late = tasks.filter(t => t.owner === me.id && !t.done && t.due < TODAY);
    if (late.length) out.push({ id: 'tasks', title: `${late.length} task${late.length > 1 ? 's are' : ' is'} overdue`, sub: late.map(t => t.title).join(' · '), to: '/calendar', tone: 'err', icon: 'check' });
    return out;
  }, [mine, tasks]);
}

export const money = (n: number) => gbp(Math.round(n));
