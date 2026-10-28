// Won jobs: my customers after the sale. The office runs the job; I can see every step
// (so I always know what to tell the customer) and I act only when the office needs me.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconTrophy, IconSearch, IconTool, IconCircleCheck, IconAlertTriangle, IconChevronRight, IconCalendar, IconInfoCircle } from '@tabler/icons-react';
import { PageHead, Tag, Tile, Empty } from '../components/ui';
import { roleTone, installOf } from '../components/Journey';
import { phaseLabel, Row } from '../components/derive';
import { gbp, IMG } from '../data/mock';
import { useStore, fmtDate, EnquiryX } from '../data/store';
import { useMine, AFTER_STEPS, afterIndex, whoHasIt, SalesActionModal, actionKey } from '../components/sales';
import { valueOf } from './MyDay';

export default function WonJobs() {
  const nav = useNavigate();
  const { events } = useStore();
  const won = useMine().filter(r => r.e.stage === 'Won');
  const [f, setF] = useState('All');
  const [q, setQ] = useState('');
  const [act, setAct] = useState<{ k: string; e: EnquiryX } | null>(null);
  const filters: [string, (r: Row) => boolean][] = [
    ['All', () => true], ['Needs you', r => r.st.role === 'Sales'], ['Being ordered', r => ['won', 'order'].includes(r.st.phase)], ['Being fitted', r => ['ready', 'install', 'review'].includes(r.st.phase)], ['Complete', r => ['pay', 'after'].includes(r.st.phase)],
  ];
  const fn = filters.find(x => x[0] === f)![1];
  const list = won.filter(r => fn(r) && (r.e.name + (r.e.jobId || '') + r.e.postcode).toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(b.st.role === 'Sales') - Number(a.st.role === 'Sales') || afterIndex(a.st.phase) - afterIndex(b.st.phase));
  const sum = (rs: Row[]) => gbp(rs.reduce((a, r) => a + valueOf(r.e), 0));
  return (
    <>
      <PageHead title="Won jobs" crumbs={[{ label: 'My day', to: '/' }, { label: 'Won jobs' }]} />
      <div className="grid-4">
        {[['Won in total', sum(won), `${won.length} jobs`, IconTrophy, '#1f9d5b'], ['Needs you', String(won.filter(r => r.st.role === 'Sales').length), 'The office is waiting for you', IconAlertTriangle, won.some(r => r.st.role === 'Sales') ? '#e0a100' : '#0b6e5c'], ['Being ordered or fitted', String(won.filter(r => ['won', 'order', 'ready', 'install', 'review'].includes(r.st.phase)).length), 'The office is on it', IconTool, '#0b6e5c'], ['Complete', String(won.filter(r => ['pay', 'after'].includes(r.st.phase)).length), 'Fitted and signed off', IconCircleCheck, '#0b6e5c']].map(([l, v, s, I, c]: any) => (
          <div key={l} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}><Tile icon={<I size={22} />} color={c} size={48} /><div className="vstack" style={{ gap: 2 }}><span className="small t2">{l}</span><b style={{ fontSize: 22 }}>{v}</b><span className="tiny muted">{s}</span></div></div>
        ))}
      </div>
      <div className="alert info small"><IconInfoCircle size={16} />After Won the office checks the documents, books the final survey, orders, and books the fitting. You only step in if a size changes at the final survey.</div>
      <div className="card flush">
        <div className="toolbar">
          <div className="input-icon" style={{ width: 300 }}><IconSearch size={16} /><input className="input" style={{ height: 36 }} placeholder="Search customer or job number" value={q} onChange={e => setQ(e.target.value)} /></div>
          {filters.map(([n, t]) => <button key={n} className={`chip ${f === n ? 'on' : ''}`} onClick={() => setF(n)}>{n}<span className="n">{won.filter(t).length}</span></button>)}
        </div>
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Products</th><th>Value</th><th>Won on</th><th style={{ width: 260 }}>Where it is</th><th>Fitting</th><th>Next step</th><th></th></tr></thead>
          <tbody>
            {list.map(r => {
              const { e, st } = r;
              const at = afterIndex(st.phase);
              const fit = installOf(e, events);
              const mineNow = st.role === 'Sales';
              return (
                <tr key={e.id} className="click" onClick={() => nav(`/enquiries/${e.id}`)}>
                  <td><div className="hstack" style={{ gap: 10 }}><img src={IMG[e.photo]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} /><div className="vstack" style={{ gap: 2 }}><b style={{ whiteSpace: 'nowrap' }}>{e.name}</b><span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>{e.jobId || 'Not ordered yet'}</span></div></div></td>
                  <td className="t2">{e.product}</td>
                  <td className="b">{gbp(valueOf(e))}</td>
                  <td className="t2">{e.wonOn || '—'}</td>
                  <td>
                    <div className="vstack" style={{ gap: 5 }}>
                      <div className="hstack" style={{ gap: 3 }}>{AFTER_STEPS.map((s, i) => <span key={s.id} title={s.label} style={{ flex: 1, height: 6, borderRadius: 3, background: i < at || (st.phase === 'after') ? 'var(--primary-dark)' : i === at ? 'var(--primary)' : 'var(--border)' }} />)}</div>
                      <span className="tiny t2">{st.role === 'Sales' ? st.label : phaseLabel(st.phase)}</span>
                    </div>
                  </td>
                  <td className="t2" style={{ whiteSpace: 'nowrap' }}>{fit ? <span className="hstack" style={{ gap: 5 }}><IconCalendar size={13} />{fmtDate(fit.date)}</span> : '—'}</td>
                  <td>{mineNow ? <Tag tone="warn">Your turn</Tag> : <span className="hstack" style={{ gap: 6 }}><Tag tone={roleTone[st.role]}>{st.role}</Tag><span className="small t2" style={{ whiteSpace: 'nowrap' }}>{whoHasIt(r, events).split(' ')[0]}</span></span>}</td>
                  <td onClick={ev => ev.stopPropagation()}>{mineNow ? <button className="btn btn-dark btn-xs" onClick={() => setAct({ k: actionKey(st), e })}>{st.icon}{st.label}</button> : <IconChevronRight size={16} color="#6b7a78" />}</td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={8}><Empty icon={<IconTrophy size={22} />} title="Nothing here" sub="Try another filter." /></td></tr>}
          </tbody>
        </table>
      </div>
      {act && <SalesActionModal k={act.k} e={act.e} onClose={() => setAct(null)} />}
    </>
  );
}
