// One record for the whole life of a customer, seen by their salesperson.
// The top bar shows ONE main button when it is the salesperson's turn. After Won the office takes over,
// and the salesperson can follow every step in "After the sale" without changing it.
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  IconPlus, IconPhone, IconMail, IconHome, IconUserPlus, IconSend, IconCalendarEvent, IconClipboardCheck, IconFileInvoice, IconMessageReply, IconTrophy, IconX, IconWorld,
  IconPackage, IconCircleCheck, IconTruckDelivery, IconCalendarPlus, IconTool, IconBellRinging, IconDots, IconPhoneCall, IconUserShare, IconExternalLink, IconRefresh,
  IconArrowsSplit, IconInfoCircle, IconMailForward, IconNotes, IconSettings, IconAlertTriangle, IconClock, IconArrowRight, IconShieldCheck, IconUser, IconRulerMeasure, IconPlugConnected,
} from '@tabler/icons-react';
import { PageHead, Card, CardHead, Tag, Avatar, Tabs, Tile, useToast, Empty, Check } from '../components/ui';
import { SurveyReport, QuoteDoc, FinalSurveyView, orderLines, FileChip } from '../components/Lifecycle';
import { stepFor, PHASES, journeyList, roleTone, installOf } from '../components/Journey';
import { SalesActionModal, myTurn, isOpen, whoHasIt, actionKey, AFTER_STEPS, afterIndex, stageLabel } from '../components/sales';
import { me } from '../data/mock';
import { phaseLabel } from '../components/derive';
import { staffById, IMG, gbp } from '../data/mock';
import { crewTeam } from '../data/crew';
import { useStore, fmtDate, addDays, TODAY } from '../data/store';
import { quoteTotals } from '../data/lifecycle';
import { stageTone } from './Enquiries';

const commIcon: Record<string, [any, string]> = {
  'email-out': [IconMailForward, '#0b6e5c'], 'email-in': [IconMail, '#0b6e5c'], call: [IconPhoneCall, '#e0a100'], note: [IconNotes, '#3a4a4a'], system: [IconSettings, '#6b7a78'], reminder: [IconBellRinging, '#d64545'],
};
const commLabel: Record<string, string> = { 'email-out': 'Email sent', 'email-in': 'Email received', call: 'Call', note: 'Note', system: 'Update', reminder: 'Reminder' };

const Info = ({ items }: { items: [string, React.ReactNode][] }) => (
  <div className="grid-4" style={{ rowGap: 16 }}>
    {items.map(([l, v]) => <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 13 }}>{v}</b></div>)}
  </div>
);

function MoreMenu({ items }: { items: { label: string; icon: React.ReactNode; on: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (ev: MouseEvent) => { if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-grey" onClick={() => setOpen(!open)} aria-label="More actions"><IconDots size={16} />More</button>
      {open && (
        <div className="popover" style={{ width: 250, padding: 6 }}>
          {items.map(it => <button key={it.label} className="nav-item" style={{ width: '100%', border: 0, background: 'none', color: it.danger ? 'var(--err)' : undefined }} onClick={() => { setOpen(false); it.on(); }}>{it.icon}<span>{it.label}</span></button>)}
        </div>
      )}
    </div>
  );
}

export default function EnquiryRecord({ recordId }: { recordId?: string } = {}) {
  const params = useParams();
  const id = recordId || params.id;
  const toast = useToast();
  const st = useStore();
  const { enquiries, orders, events, snags, jobs, tasks, set } = st;
  const e = enquiries.find(x => x.id === id && x.type === 'Sales' && x.assigned === me.id);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState<string | null>(null);
  useEffect(() => { setTab('overview'); }, [id]);
  if (!e) {
    const other = enquiries.find(x => x.id === id);
    return <Empty icon={<IconUser size={22} />} title={other ? 'This customer is not yours' : 'Customer not found'} sub={other ? `${other.name} is looked after by ${staffById(other.assigned)?.name || 'the office'}. Ask Sarah in the office if it should come to you.` : 'It may have been moved to another salesperson.'} action={<Link to="/pipeline" className="btn btn-primary btn-sm">Back to my pipeline</Link>} />;
  }

  const s = staffById(e.assigned);
  const ctx = { events, snags: snags as any };
  const order = orders.find(o => o.job === e.jobId && e.jobId);
  const job = jobs.find(j => j.id === e.jobId);
  const install = installOf(e, events);
  const waiting = events.find(ev => ev.job === e.jobId && e.jobId && ev.team === 'un');
  const jobSnags = snags.filter(x => x.job === e.jobId && e.jobId);
  const step = stepFor(e, ctx);
  const t = e.quote ? quoteTotals(e.quote) : null;
  const open = e.type === 'Sales' && !['Won', 'Lost'].includes(e.stage);
  const phases = PHASES.filter(p => p.id !== 'lost');
  const idx = phases.findIndex(p => p.id === step.phase);
  const o = e.ops || {};

  const row = { e, st: step };
  const mineNow = myTurn(row) || (step.role === 'Sales' && !step.wait);
  const who = whoHasIt(row, events);
  const myTasks = tasks.filter(x => x.enq === e.id).sort((x, y) => Number(x.done) - Number(y.done) || x.due.localeCompare(y.due));
  const go = (k: string) => setModal(k);
  const done = (tb: string) => setTab(tb === 'install' || tb === 'snags' ? 'after' : tb);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'comms', label: 'Communication', n: e.comms?.length || 0 },
    ...(e.appt ? [{ id: 'appt', label: 'Appointment' }] : []),
    ...(e.survey ? [{ id: 'survey', label: e.survey.fp ? 'Survey (Framepoint)' : 'Survey' }] : []),
    ...(e.quote ? [{ id: 'quote', label: 'Quotation' }] : []),
    ...(e.finalSurvey ? [{ id: 'final', label: 'Final survey' }] : []),
    ...(e.stage === 'Won' ? [{ id: 'after', label: 'After the sale', n: step.role === 'Sales' ? 1 : undefined }] : []),
  ];

  const more = [
    { label: 'Send an email', icon: <IconMail size={17} />, on: () => setModal('email') },
    { label: 'Log a call', icon: <IconPhoneCall size={17} />, on: () => setModal('call') },
    ...(open ? [{ label: 'Book a follow-up call', icon: <IconPhone size={17} />, on: () => setModal('followup') }] : []),
    { label: 'Add a task', icon: <IconClipboardCheck size={17} />, on: () => setModal('task') },
    ...(e.stage === 'Appointment' && e.appt?.status === 'Booked' ? [{ label: 'Change the appointment', icon: <IconCalendarEvent size={17} />, on: () => setModal('appt') }] : []),
    ...(['Quote Sent', 'Follow-up'].includes(e.stage) && e.quote ? [{ label: 'New quote version (Framepoint)', icon: <IconFileInvoice size={17} />, on: () => setModal('revise') }] : []),
    ...(open ? [{ label: 'Mark as Lost', icon: <IconX size={17} />, on: () => setModal('lost'), danger: true }] : []),
  ];

  return (
    <>
      <PageHead title={e.name} crumbs={[{ label: e.stage === 'Won' ? 'Won jobs' : 'My pipeline', to: e.stage === 'Won' ? '/won' : '/pipeline' }, { label: `${e.jobId || e.id} · ${e.name}` }]}
        actions={<>
          <MoreMenu items={more} />
          {e.stage === 'Lost' ? <button className="btn btn-primary" onClick={() => go('reopen')}><IconRefresh size={16} />Reopen enquiry</button>
            : step.key === 'decide' ? <><button className="btn btn-outline" style={{ color: 'var(--err)' }} onClick={() => setModal('lost')}><IconX size={16} />Mark as Lost</button><button className="btn btn-primary" onClick={() => setModal('won')}><IconTrophy size={16} />Mark as Won</button></>
            : mineNow ? <button className={`btn ${step.key === 'reply' ? 'btn-outline' : 'btn-primary'}`} onClick={() => go(actionKey(step))}>{step.icon}{step.label}</button>
            : <span className="hstack small t2" style={{ gap: 8, padding: '0 12px', height: 40, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}><IconClock size={16} color="#0b6e5c" />With {who} · {step.label}</span>}
        </>} />

      {/* Header */}
      <Card>
        <div className="hstack" style={{ gap: 16, alignItems: 'flex-start' }}>
          <img src={IMG[e.photo]} alt="" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover' }} />
          <div className="vstack" style={{ gap: 8, flex: 1 }}>
            <div className="hstack" style={{ flexWrap: 'wrap' }}><h2 style={{ fontSize: 20 }}>{e.name}</h2><Tag tone={stageTone[e.stage]}>{stageLabel[e.stage]}</Tag><Tag tone="grey">{e.product}</Tag>{e.jobId && <Tag tone="info">Job {e.jobId}</Tag>}</div>
            <div className="hstack small t2" style={{ gap: 16, flexWrap: 'wrap' }}><span className="hstack" style={{ gap: 5 }}><IconPhone size={14} />{e.phone}</span><span className="hstack" style={{ gap: 5 }}><IconMail size={14} />{e.email}</span><span className="hstack" style={{ gap: 5 }}><IconHome size={14} />{e.address}, {e.postcode}</span></div>
            <div className="hstack" style={{ gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
              {([['Received', e.received], ['Salesperson', s ? s.name : 'Not assigned'], ['Surveyor', staffById(e.finalSurvey?.surveyor)?.name || '—'], ['Value', t ? gbp(t.total) : e.value ? gbp(e.value) : '—'], ['Next step', `${step.label} · ${step.role === 'Sales' ? 'You' : step.role}`]] as [string, string][]).map(([l, v]) => (
                <div key={l} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}><div className="tiny muted">{l}</div><b style={{ fontSize: 13, color: v === 'Not assigned' || v.endsWith('Overdue') ? 'var(--err)' : 'var(--text)' }}>{v}</b></div>
              ))}
            </div>
          </div>
        </div>
        {e.type === 'Sales' && (
          <div className="stepper journey" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {phases.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <span className="step-line" />}
                <span className={`step ${e.stage === 'Lost' ? '' : i < idx ? 'done' : i === idx ? 'now' : ''}`}>{i < idx && e.stage !== 'Lost' && <IconCircleCheck size={14} />}{p.label}</span>
              </React.Fragment>
            ))}
            {e.stage === 'Lost' && <><span className="step-line" /><span className="step now" style={{ background: 'var(--err)', borderColor: 'var(--err)' }}><IconX size={14} />Lost</span></>}
          </div>
        )}
      </Card>

      {/* What happens next — in plain words */}
      <div className={`alert ${e.stage === 'Lost' ? 'err' : mineNow ? 'warn' : 'info'}`}>
        <IconArrowRight size={18} />
        {e.stage === 'Lost' ? <div><b>Lost:</b> {e.lostReason}. If the customer comes back, press <b>Reopen enquiry</b> — the history is kept.</div>
          : <div><b>Next step: {step.key === 'decide' ? 'Mark as Won or Lost' : step.label}</b> <Tag tone={mineNow ? 'warn' : roleTone[step.role]}>{mineNow ? 'Your turn' : who}</Tag> {step.hint}{!mineNow && e.stage === 'Won' && ' You do not need to do anything — follow it in “After the sale”.'}</div>}
      </div>

      <div className="row">
        <div className="col grow">
          <Card>
            <Tabs value={tab} onChange={setTab} items={tabs} />

            {tab === 'overview' && (
              <div className="vstack" style={{ gap: 22 }}>
                <div className="vstack" style={{ gap: 12 }}><b>Basic info</b><Info items={[['Name', e.name], ['Mobile', e.phone], ['Email', e.email], ['Received', e.received], ['Enquiry source', e.source], ['Interested in', e.product], ['Salesperson', s ? s.name : <span style={{ color: 'var(--err)' }}>Not assigned yet</span>], ['Best way to contact', 'Phone, evenings']]} /></div>
                <div className="divider" />
                <div className="vstack" style={{ gap: 12 }}><b>Property</b><Info items={[['Address', e.address], ['Postcode', e.postcode], ['Property type', 'Semi-detached'], ['Built', '1930s'], ['Parking', e.survey?.parking || 'Driveway'], ['Access', e.survey?.access || 'Side gate'], ['Conservation area', 'No'], ['Notes', e.survey?.notes || e.appt?.notes || '—']]} /></div>
                <div className="divider" />
                <div className="vstack" style={{ gap: 12 }}><b>Project</b><Info items={[['Products', e.survey?.fp ? `${e.survey.fp.items.filter(i => !i.service).reduce((a, i) => a + i.qty, 0)} frames · ${e.product}` : e.product], ['Framepoint', e.survey?.fp ? `${e.survey.fp.ref} · ${e.survey.fp.source === 'Framepoint' ? 'imported' : 'read from PDF'}` : 'No survey yet'], ['Final survey', e.finalSurvey ? (e.finalSurvey.status === 'Done' ? `Done ${e.finalSurvey.doneOn || ''}` : `Booked ${fmtDate(e.finalSurvey.date)}`) : '—'], ['Quote', e.quote ? `${e.quote.ref} · ${e.quote.status}` : 'Not sent yet'], ['Quote total', t ? gbp(t.total) : '—'], [`Deposit (${t?.depositPct ?? 50}%)`, t ? gbp(t.deposit) : '—'], ['Won on', e.wonOn || '—'], ['Job', e.jobId || 'Created when ordered'], ['Vendor', order ? `${order.supplier} · ${order.ref}` : '—'], ['Customer portal', e.invite?.status || 'Not invited']]} /></div>
                <div className="divider" />
                <div className="vstack" style={{ gap: 12 }}>
                  <div className="between"><b>Complete journey</b><span className="tiny muted">Who does each step · ticked when done</span></div>
                  {(() => { const jl = journeyList(e, ctx).filter(j => !j.skip); const first = jl.findIndex(x => !x.done); return (
                  <div className="journey-list" style={{ gridTemplateRows: `repeat(${Math.ceil(jl.length / 2)}, auto)` }}>
                    {jl.map((j, n) => {
                      const now = n === first;
                      return <div key={j.label} className={`jl ${j.done ? 'done' : ''} ${now ? 'now' : ''}`}>{j.done ? <IconCircleCheck size={16} color="#1f9d5b" /> : <span className="jl-dot" />}<span className="jl-label"><span className="muted">{n + 1}.</span> {j.label}</span><Tag tone={roleTone[j.role]}>{j.role}</Tag>{j.when && <span className="tiny muted">{j.when}</span>}</div>;
                    })}
                  </div>); })()}
                </div>
              </div>
            )}

            {tab === 'comms' && (
              <div className="vstack" style={{ gap: 12 }}>
                <span className="small muted">Every email, reply, call and update about {e.name}, newest first — yours and the office's. Use <b>More</b> at the top to send an email or log a call.</span>
                <div className="timeline">
                  {(e.comms || []).map(cm => {
                    const [I, col] = commIcon[cm.kind];
                    return (
                      <div key={cm.id} className="tl-item">
                        <Tile icon={<I size={15} />} color={col} size={32} radius={16} />
                        <div className="vstack" style={{ gap: 6, flex: 1 }}>
                          <div className="between"><span className="hstack" style={{ gap: 8 }}><b style={{ fontSize: 13.5 }}>{cm.title}</b><Tag tone={cm.kind === 'email-in' ? 'jade' : cm.kind === 'reminder' ? 'err' : 'grey'}>{commLabel[cm.kind]}</Tag></span><span className="tiny muted">{cm.when}</span></div>
                          <span className="tiny muted">{cm.who}</span>
                          {cm.body && <div className="small t2" style={{ background: cm.kind === 'email-in' ? 'var(--tint)' : 'var(--bg)', borderRadius: 10, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>{cm.body}</div>}
                        </div>
                      </div>
                    );
                  })}
                  {!e.comms?.length && <Empty icon={<IconMail size={22} />} title="Nothing yet" sub="Emails, replies and calls will show here." />}
                </div>
              </div>
            )}

            {tab === 'appt' && e.appt && (
              <div className="vstack" style={{ gap: 16 }}>
                <div className="between"><b>{e.appt.type}</b><Tag tone={e.appt.status === 'Done' ? 'ok' : 'info'}>{e.appt.status}</Tag></div>
                <Info items={[['Date', fmtDate(e.appt.date, { weekday: 'long', day: 'numeric', month: 'long' })], ['Time', e.appt.time], ['With', staffById(e.appt.who)?.name || '—'], ['Where', e.appt.address], ['Calendar', 'In Outlook'], ['Customer told', 'Yes, by email']]} />
                {e.appt.notes && <div className="alert info small"><IconInfoCircle size={16} />{e.appt.notes}</div>}
                {e.appt.outcome ? <div className="vstack" style={{ gap: 6 }}><b style={{ fontSize: 13 }}>How it went</b><span className="t2">{e.appt.outcome}</span></div>
                  : <span className="small muted">After the visit, press <b>Appointment done — add notes</b> at the top. Then design and price it in Framepoint.</span>}
              </div>
            )}

            {tab === 'survey' && e.survey && (
              e.survey.status === 'Completed' ? <SurveyReport e={e} /> : (
                <div className="vstack" style={{ gap: 16 }}>
                  <Info items={[['Surveyor', staffById(e.survey.surveyor)?.name || '—'], ['Date', fmtDate(e.survey.date, { weekday: 'long', day: 'numeric', month: 'long' })], ['Time', e.survey.time], ['Requested by', e.survey.requestedBy]]} />
                  <div className="alert warn small"><IconClock size={16} />Booked — waiting for {staffById(e.survey.surveyor)?.name} to visit and send the results from their phone.</div>
                </div>
              )
            )}

            {tab === 'quote' && e.quote && (
              <div className="vstack" style={{ gap: 14 }}>
                <div className="between"><span className="hstack" style={{ gap: 8 }}><b>Quote {e.quote.ref}</b><Tag tone={e.quote.status === 'Accepted' ? 'ok' : e.quote.status === 'Declined' ? 'err' : 'info'}>{e.quote.status}</Tag></span><span className="small muted">Sent {e.quote.sentOn} by {e.quote.sentBy} for the customer to review · from Framepoint</span></div>
                <QuoteDoc e={e} q={e.quote} />
                {!!e.quote.files?.length && <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>{e.quote.files.map(f => <FileChip key={f} name={f} sub={`Sent to ${e.email}`} onOpen={() => toast(`Opening ${f}`)} />)}</div>}
                {e.quote.reply && <div className="vstack" style={{ gap: 6 }}><b style={{ fontSize: 13 }}>Customer’s reply</b><div className="small t2" style={{ background: 'var(--tint)', borderRadius: 10, padding: '10px 12px' }}>“{e.quote.reply}”</div></div>}
                {e.lostReason && <div className="alert err small"><IconX size={16} />Lost: {e.lostReason}</div>}
              </div>
            )}

            {tab === 'final' && e.finalSurvey && <FinalSurveyView e={e} />}

            {tab === 'after' && (
              <div className="vstack" style={{ gap: 18 }}>
                <div className="alert info small"><IconInfoCircle size={16} /><div>The office looks after {e.name} from here. You can see every step so you always know what to tell them{step.role === 'Sales' ? <> — <b>but right now they need you:</b> {step.label.toLowerCase()}.</> : '.'}</div></div>
                <div className="stepper journey">
                  {AFTER_STEPS.map((p, i) => { const at = afterIndex(step.phase); return <React.Fragment key={p.id}>{i > 0 && <span className="step-line" />}<span className={`step ${i < at || (p.id === 'after' && at === AFTER_STEPS.length - 1) ? 'done' : i === at ? 'now' : ''}`}>{i < at && <IconCircleCheck size={14} />}{p.label}</span></React.Fragment>; })}
                </div>
                <Info items={[['Where it is', phaseLabel(step.phase)], ['Right now', step.status], ['Next step', `${step.label} · ${who}`], ['Won on', e.wonOn || '—'], ['Deposit', o.deposit ? `Paid ${o.deposit.on} · ${o.deposit.inv}` : 'Not paid yet'], ['Final survey', e.finalSurvey ? (e.finalSurvey.status === 'Done' ? `Done ${e.finalSurvey.doneOn}` : `Booked ${fmtDate(e.finalSurvey.date)} · ${staffById(e.finalSurvey.surveyor)?.name}`) : 'Not booked yet'], ['Supplier order', order ? `${order.supplier} · ${order.ref}` : e.jobId ? 'Ordered' : 'Not ordered yet'], ['Delivery', o.received?.ok ? `Checked ${o.received.on}` : o.delivery || '—'], ['Installation', install ? `${fmtDate(install.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${install.days} day${install.days > 1 ? 's' : ''}` : waiting ? `Pencilled ${fmtDate(waiting.date)}` : 'Not booked yet'], ['Installers', install ? crewTeam(install)?.members || '—' : '—'], ['Snags', jobSnags.length ? `${jobSnags.filter(x => x.status !== 'Fixed').length} open of ${jobSnags.length}` : 'None'], ['Customer portal', e.invite?.status || 'Not invited']]} />
                <div className="vstack" style={{ gap: 8 }}>
                  <b style={{ fontSize: 13 }}>Every step after the sale</b>
                  {(() => { const jl = journeyList(e, ctx).filter(j => !j.skip).slice(8); const first = jl.findIndex(x => !x.done); return (
                    <div className="journey-list" style={{ gridTemplateRows: `repeat(${Math.ceil(jl.length / 2)}, auto)` }}>
                      {jl.map((j, n) => <div key={j.label} className={`jl ${j.done ? 'done' : ''} ${n === first ? 'now' : ''}`}>{j.done ? <IconCircleCheck size={16} color="#1f9d5b" /> : <span className="jl-dot" />}<span className="jl-label">{j.label}</span><Tag tone={j.role === 'Sales' ? 'warn' : roleTone[j.role]}>{j.role === 'Sales' ? 'You' : j.role}</Tag>{j.when && <span className="tiny muted">{j.when}</span>}</div>)}
                    </div>); })()}
                </div>
                {jobSnags.length > 0 && (
                  <div className="vstack" style={{ gap: 8 }}>
                    <b style={{ fontSize: 13 }}>Snags and aftercare</b>
                    {jobSnags.map(x => <div key={x.id} className="hstack" style={{ gap: 12, padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}><img src={IMG[x.photo]} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} /><div className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 13 }}>{x.title}</b><span className="tiny muted">{x.reported} · {x.owner}</span></div><Tag tone={x.tone}>{x.status}</Tag></div>)}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="col w-360">
          <Card>
            <CardHead title="People on this job" />
            <div className="list">
              {([['Salesperson', s ? `${s.name} (you)` : undefined, s?.initials], ['Surveyor', staffById(e.finalSurvey?.surveyor)?.name, staffById(e.finalSurvey?.surveyor)?.initials], ['Installers', install ? crewTeam(install)?.members : undefined, install ? crewTeam(install)?.initials : undefined], ['Office', 'Sarah Mitchell', 'SM']].filter(([r]) => e.stage === 'Won' || ['Salesperson', 'Office'].includes(r)) as [string, string | undefined, string | undefined][]).map(([role, name, ini]) => (
                <div key={role} className="hstack" style={{ gap: 10, padding: '10px 0' }}>
                  {name ? <Avatar i={ini || '?'} size={32} /> : <span className="avatar" style={{ width: 32, height: 32, background: 'var(--bg)', color: 'var(--muted)' }}><IconUser size={15} /></span>}
                  <div className="vstack" style={{ gap: 1 }}><span className="tiny muted">{role}</span><b style={{ fontSize: 13, color: name ? 'var(--text)' : 'var(--muted)' }}>{name || 'Not yet'}</b></div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="My tasks for this customer" right={<button className="link" onClick={() => setModal('task')}><IconPlus size={14} />Add</button>} />
            {myTasks.length === 0 && <span className="small muted">No tasks. {open ? 'Book a follow-up call or add a reminder.' : ''}</span>}
            {myTasks.map(t => (
              <div key={t.id} className="hstack" style={{ gap: 10, alignItems: 'flex-start' }}>
                <Check on={t.done} onChange={v => { set('tasks', ts => ts.map(x => (x.id === t.id ? { ...x, done: v } : x))); if (v) toast('Task done'); }} />
                <div className="vstack" style={{ gap: 2 }}><b style={{ fontSize: 13, color: t.done ? 'var(--muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</b><span className="tiny" style={{ color: !t.done && t.due < TODAY ? 'var(--err)' : 'var(--muted)' }}>{!t.done && t.due < TODAY ? 'Overdue · ' : ''}{t.due === TODAY ? 'Today' : fmtDate(t.due)}</span></div>
              </div>
            ))}
            {open && <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setModal('followup')}><IconPhone size={14} />Book a follow-up call</button>}
          </Card>
          <Card>
            <CardHead title="Recent activity" right={<button className="link" onClick={() => setTab('comms')}>View all</button>} />
            <div className="timeline">
              {(e.comms || []).slice(0, 4).map(cm => { const [I, col] = commIcon[cm.kind]; return <div key={cm.id} className="tl-item"><Tile icon={<I size={15} />} color={col} size={30} radius={15} /><div className="vstack" style={{ gap: 2 }}><b style={{ fontSize: 13 }}>{cm.title}</b><span className="tiny muted">{cm.when} · {cm.who}</span></div></div>; })}
            </div>
          </Card>
        </div>
      </div>

      {modal && <SalesActionModal k={modal} e={e} onClose={() => setModal(null)} onDone={done} />}
    </>
  );
}
