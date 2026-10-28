// My performance: how my month is going against my target, worked out from my own deals.
import React from 'react';
import { Link } from 'react-router-dom';
import { IconTrophy, IconTarget, IconFileText, IconClock, IconInfoCircle, IconChevronRight } from '@tabler/icons-react';
import { PageHead, Card, CardHead, Tag, Tile, Progress, Dd } from '../components/ui';
import { BarChart, Donut, HBars } from '../components/charts';
import { me, gbp, mySalesByMonth } from '../data/mock';
import { useMine, isOpen, OPEN_STAGES, stageLabel, stageColor } from '../components/sales';
import { valueOf, wonThisMonth } from './MyDay';

export default function Performance() {
  const mine = useMine();
  const won = wonThisMonth(mine);
  const wonValue = won.reduce((a, r) => a + valueOf(r.e), 0);
  const allWon = mine.filter(r => r.e.stage === 'Won');
  const lost = mine.filter(r => r.e.stage === 'Lost');
  const rate = Math.round((allWon.length / Math.max(1, allWon.length + lost.length)) * 100);
  const sentOct = mine.filter(r => r.e.quote && r.e.quote.sentOn.endsWith('Oct'));
  const quotedOct = sentOct.reduce((a, r) => a + valueOf(r.e), 0);
  const open = mine.filter(r => isOpen(r.e));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNo = (s: string) => { const m = /(\d{1,2}) (\w{3})/.exec(s || ''); return m ? new Date(2026, MON.indexOf(m[2]), +m[1]).getTime() / 86400000 : NaN; };
  const spans = allWon.map(r => dayNo(r.e.wonOn || '') - dayNo(r.e.received)).filter(n => n >= 0);
  const daysToWin = spans.length ? Math.round(spans.reduce((a, n) => a + n, 0) / spans.length) : 0;
  const pct = Math.min(100, Math.round((wonValue / me.target) * 100));
  const months = [...mySalesByMonth, { m: 'Oct', quoted: Math.max(1, Math.round(quotedOct / 1000)), won: Math.round(wonValue / 1000) }];
  // How far my deals got: each stage counts every deal that reached it.
  const order = ['New Enquiry', 'Qualification', 'Appointment', 'Quote Preparation', 'Quote Sent', 'Follow-up', 'Won'];
  const reached = (st: string) => mine.filter(r => (r.e.stage === 'Lost' ? (r.e.quote ? 4 : r.e.appt ? 2 : 0) : order.indexOf(r.e.stage)) >= order.indexOf(st)).length;
  const sources = Array.from(new Set(mine.map(r => r.e.source))).map(s => ({ s, n: mine.filter(r => r.e.source === s).length, w: allWon.filter(r => r.e.source === s).length })).sort((a, b) => b.n - a.n);
  return (
    <>
      <PageHead title="My performance" crumbs={[{ label: 'My day', to: '/' }, { label: 'My performance' }]} actions={<Dd icon={<IconClock size={14} />}>October 2026</Dd>} />
      <div className="row">
        <Card className="grow">
          <div className="hstack" style={{ gap: 24, flexWrap: 'wrap' }}>
            <Donut parts={[{ v: Math.max(pct, 0.01), c: '#00c7a1' }, { v: 100 - pct, c: '#e3e9e7' }]} size={170} thickness={26} center={`${pct}%`} sub="of target" />
            <div className="vstack" style={{ gap: 10, flex: 1, minWidth: 260 }}>
              <span className="small t2">Won this month</span>
              <b style={{ fontSize: 34, letterSpacing: -0.6 }}>{gbp(wonValue)}</b>
              <span className="t2">Target {gbp(me.target)} · {wonValue >= me.target ? 'target reached — well done' : `${gbp(me.target - wonValue)} to go with 11 working days left`}</span>
              <Progress value={pct} height={10} />
              <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>{won.map(r => <Link key={r.e.id} to={`/enquiries/${r.e.id}`}><Tag tone="ok">{r.e.name} · {gbp(valueOf(r.e))}</Tag></Link>)}</div>
            </div>
          </div>
        </Card>
        <div className="w-400" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[['Win rate', `${rate}%`, `${allWon.length} won · ${lost.length} lost`, IconTarget], ['Quotes sent', String(sentOct.length), `${gbp(quotedOct)} this month`, IconFileText], ['Open pipeline', gbp(open.reduce((a, r) => a + valueOf(r.e), 0)), `${open.length} deals`, IconTrophy], ['Days to win', String(daysToWin), 'Average, enquiry to deposit', IconClock]].map(([l, v, s, I]: any) => (
            <div key={l} className="card" style={{ padding: 14, gap: 8 }}>
              <Tile icon={<I size={18} />} color="#0b6e5c" size={34} radius={8} />
              <span className="small t2">{l}</span>
              <b style={{ fontSize: 20 }}>{v}</b>
              <span className="tiny muted">{s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="row">
        <Card className="grow">
          <CardHead title="Quoted and won" sub="By month, in thousands of pounds" />
          <div className="hstack small t2" style={{ gap: 16 }}><span className="hstack" style={{ gap: 6 }}><i className="dot" style={{ background: '#dfe5e3' }} />Quoted</span><span className="hstack" style={{ gap: 6 }}><i className="dot" style={{ background: '#0b6e5c' }} />Won</span></div>
          <BarChart data={months} height={252} max={60} />
        </Card>
        <Card className="w-360">
          <CardHead title="How far my deals get" sub="Every deal that reached each step" />
          <HBars rows={order.map(st => ({ label: stageLabel[st], value: reached(st), max: Math.max(1, reached('New Enquiry')), right: String(reached(st)), color: stageColor[st] }))} />
        </Card>
      </div>
      <div className="row">
        <Card className="grow">
          <CardHead title="Open deals by stage" right={<Link to="/pipeline" className="link">My pipeline<IconChevronRight size={14} /></Link>} />
          <table className="tbl"><thead><tr><th>Stage</th><th>Deals</th><th>Value</th><th>Oldest</th></tr></thead>
            <tbody>{OPEN_STAGES.map(st => { const rs = open.filter(r => r.e.stage === st); return <tr key={st}><td><span className="hstack" style={{ gap: 8 }}><i className="dot" style={{ background: stageColor[st] }} /><b>{stageLabel[st]}</b></span></td><td>{rs.length}</td><td className="b">{gbp(rs.reduce((a, r) => a + valueOf(r.e), 0))}</td><td className="t2" style={{ whiteSpace: 'nowrap' }}>{rs.length ? (n => `${n} day${n === 1 ? '' : 's'}`)(Math.max(...rs.map(r => r.e.stageDays))) : '—'}</td></tr>; })}</tbody>
          </table>
        </Card>
        <Card className="w-360">
          <CardHead title="Why deals were lost" />
          {lost.length === 0 && <span className="small muted">Nothing lost. Great work.</span>}
          {lost.map(r => <Link key={r.e.id} to={`/enquiries/${r.e.id}`} className="vstack" style={{ gap: 3, padding: '8px 0', borderTop: '1px solid var(--border)' }}><b style={{ fontSize: 13 }}>{r.e.name} · {gbp(valueOf(r.e))}</b><span className="small t2">{r.e.lostReason}</span></Link>)}
          <div className="alert info small"><IconInfoCircle size={16} />Reasons come from “Mark as Lost”, so the office can spot patterns.</div>
        </Card>
        <Card className="w-360">
          <CardHead title="Where my enquiries come from" />
          <HBars rows={sources.map(x => ({ label: x.s, value: x.n, max: Math.max(...sources.map(y => y.n)), right: `${x.n} · ${x.w} won`, color: '#0b6e5c' }))} />
        </Card>
      </div>
    </>
  );
}
