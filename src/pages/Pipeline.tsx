// My pipeline: only my own deals, from New enquiry to Won or Lost.
// Every card has one button for my next step. Dragging a card opens the same step, so nothing moves without the details.
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconPlus, IconLayoutKanban, IconListDetails, IconInfoCircle, IconAlertTriangle, IconChevronRight } from '@tabler/icons-react';
import { PageHead, Tag, Seg, useToast, Empty } from '../components/ui';
import { JourneyCard, roleTone } from '../components/Journey';
import { gbp } from '../data/mock';
import { useStore, EnquiryX } from '../data/store';
import { useMine, myTurn, isLate, isOpen, actionKey, SALES_STAGES, stageLabel, stageColor, NewLeadModal, SalesActionModal } from '../components/sales';
import { valueOf } from './MyDay';
import { Row } from '../components/derive';

// Where each step takes the card, so a drag onto that column opens the right step.
const NEXT_STAGE: Record<string, string> = { contact: 'Qualification', appt: 'Appointment', apptDone: 'Quote Preparation', quote: 'Quote Sent', reply: 'Follow-up', decide: 'Won' };

export default function Pipeline() {
  const nav = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const all = useMine();
  const { events } = useStore();
  const [view, setView] = useState(params.get('view') || 'board');
  const [show, setShow] = useState(params.get('show') || 'all');
  const stageOnly = params.get('stage');
  const [modal, setModal] = useState(false);
  const [act, setAct] = useState<{ k: string; e: EnquiryX } | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  useEffect(() => { setShow(params.get('show') || 'all'); }, [params]);
  const filters: [string, string, (r: Row) => boolean][] = [
    ['all', 'All my deals', () => true], ['turn', 'Your turn', myTurn], ['late', 'Overdue', r => isLate(r.e)], ['new', 'New enquiries', r => r.e.stage === 'New Enquiry'],
  ];
  const fn = filters.find(f => f[0] === show)?.[2] || (() => true);
  const list = all.filter(r => fn(r) && (!stageOnly || r.e.stage === stageOnly));
  const open = all.filter(r => isOpen(r.e));
  const decided = all.filter(r => ['Won', 'Lost'].includes(r.e.stage));
  const pick = (k: string) => { setShow(k); const p = new URLSearchParams(params); if (k === 'all') p.delete('show'); else p.set('show', k); p.delete('stage'); setParams(p, { replace: true }); };
  const drop = (id: string, st: string) => {
    const r = all.find(x => x.e.id === id)!;
    const e = r.e;
    if (st === e.stage) return;
    if (st === 'Lost') { if (isOpen(e)) setAct({ k: 'lost', e }); else toast('Only open deals can be marked as Lost'); return; }
    if (e.stage === 'Lost') { setAct({ k: 'reopen', e }); return; }
    if (st === 'Won' && ['Quote Sent', 'Follow-up'].includes(e.stage)) { setAct({ k: 'won', e }); return; }
    if (NEXT_STAGE[r.st.key] === st && r.st.role === 'Sales') { setAct({ k: actionKey(r.st), e }); return; }
    toast(`${e.name} is at “${stageLabel[e.stage]}”. Use “${r.st.label}” on the card — each step saves what happened.`);
  };
  return (
    <>
      <PageHead title="My pipeline" crumbs={[{ label: 'My day', to: '/' }, { label: 'My pipeline' }]}
        actions={<><Seg value={view} onChange={setView} items={[{ id: 'board', label: 'Board', icon: <IconLayoutKanban size={15} /> }, { id: 'list', label: 'List', icon: <IconListDetails size={15} /> }]} /><button className="btn btn-primary" onClick={() => setModal(true)}><IconPlus size={16} />Add an enquiry</button></>} />
      <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
        {filters.map(([k, l, f]) => <button key={k} className={`chip ${show === k && !stageOnly ? 'on' : ''}`} onClick={() => pick(k)}>{l}<span className="n">{all.filter(f).length}</span></button>)}
        {stageOnly && <button className="chip on" onClick={() => pick('all')}>{stageLabel[stageOnly]} only ✕</button>}
        <div className="ml-auto hstack" style={{ gap: 18 }}>
          <span className="small t2">Open: <b style={{ color: 'var(--text)' }}>{open.length}</b></span>
          <span className="small t2">Pipeline value: <b style={{ color: 'var(--text)' }}>{gbp(open.reduce((a, r) => a + valueOf(r.e), 0))}</b></span>
          <span className="small t2">Win rate: <b style={{ color: 'var(--ok)' }}>{Math.round((all.filter(r => r.e.stage === 'Won').length / Math.max(1, decided.length)) * 100)}%</b></span>
        </div>
      </div>
      {all.some(r => isLate(r.e)) && show !== 'late' && <div className="alert err small"><IconAlertTriangle size={16} /><div><b>{all.filter(r => isLate(r.e)).length} follow-up{all.filter(r => isLate(r.e)).length > 1 ? 's are' : ' is'} overdue.</b> The office can see this too. <button className="link" onClick={() => pick('late')}>Show them</button></div></div>}
      {view === 'board' ? (
        <div className="kanban">
          {SALES_STAGES.map(st => {
            const cards = list.filter(r => r.e.stage === st);
            return (
              <div key={st} className="kcol" style={{ outline: over === st ? '2px dashed #00c7a1' : 'none' }} onDragOver={ev => { ev.preventDefault(); setOver(st); }} onDragLeave={() => setOver(null)}
                onDrop={() => { if (drag) drop(drag, st); setDrag(null); setOver(null); }}>
                <div className="between" style={{ padding: '2px 4px' }}>
                  <span className="hstack" style={{ gap: 8 }}><i className="dot" style={{ background: stageColor[st] }} /><b style={{ fontSize: 13 }}>{stageLabel[st]}</b><span className="tag grey">{cards.length}</span></span>
                  <span className="tiny muted">{gbp(cards.reduce((a, r) => a + valueOf(r.e), 0))}</span>
                </div>
                {cards.map(r => (
                  <JourneyCard key={r.e.id} e={r.e} st={r.st} mode="sales" onOpen={() => nav(`/enquiries/${r.e.id}`)} onAct={k => setAct({ k, e: r.e })} onDragStart={() => setDrag(r.e.id)} />
                ))}
                {cards.length === 0 && <div className="tiny muted" style={{ textAlign: 'center', padding: '18px 0', border: '1.5px dashed #d5dcd9', borderRadius: 10 }}>{st === 'Won' || st === 'Lost' ? `Drop here to mark as ${st}` : 'Nothing here'}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flush">
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Interested in</th><th>Value</th><th>Stage</th><th>Days in stage</th><th>Next step</th><th></th></tr></thead>
            <tbody>
              {list.map(r => {
                const { e, st } = r;
                const late = isLate(e);
                return (
                  <tr key={e.id} className="click" onClick={() => nav(`/enquiries/${e.id}`)}>
                    <td><b>{e.name}</b><div className="tiny muted">{e.postcode} · {e.source}</div></td>
                    <td>{e.product}</td>
                    <td className="b">{valueOf(e) ? gbp(valueOf(e)) : '—'}</td>
                    <td><Tag tone={e.stage === 'Won' ? 'ok' : e.stage === 'Lost' ? 'err' : 'jade'}>{stageLabel[e.stage]}</Tag></td>
                    <td style={{ color: late ? 'var(--err)' : 'var(--text)', fontWeight: late ? 600 : 400 }}>{isOpen(e) ? e.stageDays : '—'}</td>
                    <td><span className="hstack" style={{ gap: 6 }}><Tag tone={st.role === 'Sales' ? 'warn' : roleTone[st.role]}>{st.role === 'Sales' ? 'You' : st.role}</Tag><span className="t2">{e.stage === 'Won' && st.role !== 'Sales' ? `With the office · ${st.label}` : `${st.label}${isOpen(e) ? ` · ${e.nextDue}` : ''}`}</span></span></td>
                    <td onClick={ev => ev.stopPropagation()}>{myTurn(r) ? <button className="btn btn-dark btn-xs" onClick={() => setAct({ k: actionKey(st), e })}>{st.icon}{st.label}</button> : e.stage === 'Lost' ? <button className="btn btn-outline btn-xs" onClick={() => setAct({ k: 'reopen', e })}>Reopen</button> : <IconChevronRight size={16} color="#6b7a78" />}</td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={7}><Empty icon={<IconListDetails size={22} />} title="Nothing here" sub="Try another filter." /></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <span className="hstack tiny muted" style={{ gap: 6 }}><IconInfoCircle size={13} />Press the button on a card for your next step, or drag the card to the next column. Won deals go to the office — follow them in Won jobs.</span>
      {modal && <NewLeadModal onClose={() => setModal(false)} onCreated={id => nav(`/enquiries/${id}`)} />}
      {act && <SalesActionModal k={act.k} e={act.e} onClose={() => setAct(null)} />}
    </>
  );
}
