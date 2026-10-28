// My customers: one row per person I look after, however many projects they have. Built from the same records the office uses.
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { IconSearch, IconPlus, IconPhone, IconMail, IconHome, IconChevronRight, IconDownload, IconPhoneCall, IconArrowRight, IconExternalLink, IconFolder, IconMailForward, IconNotes, IconSettings, IconBellRinging, IconUser } from '@tabler/icons-react';
import { PageHead, Card, CardHead, Tag, Avatar, Tabs, Tile, useToast, Empty } from '../components/ui';
import { roleTone } from '../components/Journey';
import { isMine, myTurn, NewLeadModal, SalesActionModal, stageLabel, actionKey } from '../components/sales';
import { useCustomers, phaseLabel, docsFor, DocRow, useDocViewer, totalsOf, products, Customer } from '../components/derive';
import { gbp, IMG, staffById } from '../data/mock';
import { useStore } from '../data/store';

const commIcon: Record<string, [any, string]> = { 'email-out': [IconMailForward, '#0b6e5c'], 'email-in': [IconMail, '#0b6e5c'], call: [IconPhoneCall, '#0b6e5c'], note: [IconNotes, '#3a4a4a'], system: [IconSettings, '#6b7a78'], reminder: [IconBellRinging, '#d64545'] };
const commLabel: Record<string, string> = { 'email-out': 'Email sent', 'email-in': 'Email received', call: 'Call', note: 'Note', system: 'Update', reminder: 'Reminder' };

/** Customers who have at least one project with me, showing only my projects. */
export function useMyCustomers() {
  const all = useCustomers();
  return useMemo(() => all.filter(c => c.projects.some(r => isMine(r.e))).map(c => ({ ...c, projects: c.projects.filter(r => isMine(r.e)) })), [all]);
}

export function Customers() {
  const nav = useNavigate();
  const toast = useToast();
  const customers = useMyCustomers();
  const [q, setQ] = useState('');
  const [f, setF] = useState('All');
  const [modal, setModal] = useState(false);
  const filters = ['All', 'Active job', 'Enquiry', 'In aftercare', 'Lost'];
  const rows = customers.filter(c => (f === 'All' || c.status === f) && (c.name + c.postcode + c.address + c.email + c.phone).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead title="My customers" crumbs={[{ label: 'My day', to: '/' }, { label: 'My customers' }]} actions={<><button className="btn btn-grey" onClick={() => toast(`${rows.length} customers exported to CSV`)}><IconDownload size={16} />Export</button><button className="btn btn-primary" onClick={() => setModal(true)}><IconPlus size={16} />Add an enquiry</button></>} />
      <div className="card flush">
        <div className="toolbar">
          <div className="input-icon" style={{ width: 320 }}><IconSearch size={16} /><input className="input" style={{ height: 36 }} placeholder="Search name, postcode, phone or email" value={q} onChange={e => setQ(e.target.value)} /></div>
          {filters.map(s => <button key={s} className={`chip ${f === s ? 'on' : ''}`} onClick={() => setF(s)}>{s}<span className="n">{customers.filter(c => s === 'All' || c.status === s).length}</span></button>)}
        </div>
        <table className="tbl">
          <thead><tr><th>Customer</th><th>Property</th><th>Contact</th><th>Projects</th><th>Won value</th><th>Next step</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="click" onClick={() => nav(`/customers/${c.id}`)}>
                <td><div className="hstack" style={{ gap: 10 }}><Avatar i={c.initials} size={34} /><div className="vstack" style={{ gap: 2 }}><b>{c.name}</b><span className="tiny muted">{c.id} · since {c.since.split(',')[0]}</span></div></div></td>
                <td><div className="hstack" style={{ gap: 8 }}><img src={IMG[c.photo as keyof typeof IMG]} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover' }} /><div className="vstack" style={{ gap: 2 }}><span>{c.address}</span><span className="tiny muted">{c.postcode}</span></div></div></td>
                <td><div className="vstack" style={{ gap: 2 }}><span>{c.phone}</span><span className="tiny muted">{c.email}</span></div></td>
                <td>{c.projects.length}</td>
                <td className="b">{c.value ? gbp(c.value) : '—'}</td>
                <td>{(() => { const t = c.projects.find(myTurn); return t ? <Tag tone="warn">Your turn · {t.st.label}</Tag> : <span className="t2 small">{c.projects[0].st.label}</span>; })()}</td>
                <td><Tag tone={c.tone}>{c.status}</Tag></td>
                <td><IconChevronRight size={16} color="#6b7a78" /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8}><Empty icon={<IconUser size={22} />} title="No customers found" sub="Try another search or filter." /></td></tr>}
          </tbody>
        </table>
      </div>
      {modal && <NewLeadModal onClose={() => setModal(false)} onCreated={id => nav(`/enquiries/${id}`)} />}
    </>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const customers = useMyCustomers();
  const c = customers.find(x => x.id === id);
  if (!c) return <Empty icon={<IconUser size={22} />} title="Customer not found" sub="They may have been merged with another record." action={<Link to="/customers" className="btn btn-primary btn-sm">Back to my customers</Link>} />;
  return <CustomerView c={c} />;
}

function CustomerView({ c }: { c: Customer }) {
  const nav = useNavigate();
  const { orders } = useStore();
  const [tab, setTab] = useState('overview');
  const [act, setAct] = useState<{ k: string; id: string } | null>(null);
  const [newEnq, setNewEnq] = useState(false);
  const docViewer = useDocViewer();
  const sales = c.projects.filter(r => r.e.type === 'Sales');
  const main = sales[0] || c.projects[0];
  const docs = useMemo(() => c.projects.flatMap(r => docsFor(r.e, orders.find(o => o.job === r.e.jobId && r.e.jobId))), [c, orders]);
  const comms = useMemo(() => c.projects.flatMap(r => (r.e.comms || []).map(cm => ({ ...cm, e: r.e }))).sort((a, b) => b.id.localeCompare(a.id)), [c]);
  const portal = sales.find(r => r.e.invite)?.e.invite?.status || 'Not invited';
  const actE = act && c.projects.find(r => r.e.id === act.id)?.e;
  const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'jobs', label: 'Jobs', n: c.projects.length }, { id: 'comms', label: 'Communication', n: comms.length }, { id: 'docs', label: 'Documents', n: docs.length }];
  return (
    <>
      <PageHead title={c.name} crumbs={[{ label: 'My customers', to: '/customers' }, { label: `${c.id} · ${c.name}` }]}
        actions={<><button className="btn btn-outline" onClick={() => setAct({ k: 'call', id: main.e.id })}><IconPhoneCall size={16} />Log a call</button><button className="btn btn-outline" onClick={() => setAct({ k: 'email', id: main.e.id })}><IconMail size={16} />Send email</button><button className="btn btn-primary" onClick={() => setNewEnq(true)}><IconPlus size={16} />New project for {c.name.split(' ')[0] === 'Mr' || c.name.split(' ')[0] === 'Mrs' || c.name.split(' ')[0] === 'Ms' || c.name.split(' ')[0] === 'Dr' ? 'this customer' : c.name.split(' ')[0]}</button></>} />
      <Card>
        <div className="hstack" style={{ gap: 16, alignItems: 'flex-start' }}>
          <img src={IMG[c.photo as keyof typeof IMG]} alt="" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover' }} />
          <div className="vstack" style={{ gap: 8, flex: 1 }}>
            <div className="hstack" style={{ flexWrap: 'wrap' }}><h2 style={{ fontSize: 20 }}>{c.name}</h2><Tag tone={c.tone}>{c.status}</Tag><Tag tone="grey">{c.projects.length} project{c.projects.length > 1 ? 's' : ''}</Tag></div>
            <div className="hstack small t2" style={{ gap: 16, flexWrap: 'wrap' }}><span className="hstack" style={{ gap: 5 }}><IconPhone size={14} />{c.phone}</span><span className="hstack" style={{ gap: 5 }}><IconMail size={14} />{c.email}</span><span className="hstack" style={{ gap: 5 }}><IconHome size={14} />{c.address}, {c.postcode}</span></div>
          </div>
        </div>
      </Card>
      <Card>
        <Tabs value={tab} onChange={setTab} items={tabs} />

        {tab === 'overview' && (
          <div className="vstack" style={{ gap: 20 }}>
            <div className="grid-4" style={{ rowGap: 16 }}>
              {([['Customer since', c.since.split(',')[0]], ['Salesperson', 'You'], ['Won value', c.value ? gbp(c.value) : '—'], ['Customer portal', portal], ['Phone', c.phone], ['Email', c.email], ['Address', c.address], ['Postcode', c.postcode]] as [string, string][]).map(([l, v]) => <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 13 }}>{v}</b></div>)}
            </div>
            <div className="divider" />
            <div className="vstack" style={{ gap: 10 }}>
              <b>What is happening now</b>
              {c.projects.map(({ e, st }) => (
                <div key={e.id} className="hstack" style={{ gap: 12, padding: 14, border: '1px solid var(--border)', borderRadius: 12, flexWrap: 'wrap' }}>
                  <img src={IMG[e.photo]} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
                  <div className="vstack" style={{ gap: 4, flex: 1, minWidth: 220 }}>
                    <span className="hstack" style={{ gap: 8 }}><b>{e.product}</b><Tag tone="grey">{e.jobId || e.id}</Tag><Tag tone="jade">{e.stage === 'Won' ? phaseLabel(st.phase) : stageLabel[e.stage]}</Tag></span>
                    <span className="small t2">{st.status}</span>
                    <span className="hstack tiny" style={{ gap: 6 }}><Tag tone={st.role === 'Sales' ? 'warn' : roleTone[st.role]}>{st.role === 'Sales' ? 'You' : st.role}</Tag><span className="muted">Next: {st.label}{e.nextDue && !['—', 'Done'].includes(e.nextDue) ? ` · ${e.nextDue}` : ''}</span></span>
                  </div>
                  <div className="hstack" style={{ gap: 8 }}>
                    {myTurn({ e, st }) && <button className="btn btn-primary btn-sm" onClick={() => setAct({ k: actionKey(st), id: e.id })}>{st.icon}{st.label}</button>}
                    <Link to={`/enquiries/${e.id}`} className="btn btn-outline btn-sm"><IconExternalLink size={14} />Open record</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'jobs' && (
          <table className="tbl" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
            <thead><tr><th>Reference</th><th>Products</th><th>Where it is</th><th>Value</th><th>Received</th><th>Next step</th><th></th></tr></thead>
            <tbody>{c.projects.map(({ e, st }) => (
              <tr key={e.id} className="click" onClick={() => nav(`/enquiries/${e.id}`)}>
                <td><b>{e.jobId || e.id}</b><div className="tiny muted">{e.jobId ? `Enquiry ${e.id}` : e.type}</div></td>
                <td className="t2">{products(e)}</td>
                <td><Tag tone={e.stage === 'Lost' ? 'err' : 'jade'}>{e.stage === 'Won' ? phaseLabel(st.phase) : stageLabel[e.stage]}</Tag></td>
                <td className="b">{e.value ? gbp(e.stage === 'Won' ? totalsOf(e).total : e.value) : '—'}</td>
                <td className="t2">{e.received.split(',')[0]}</td>
                <td><span className="hstack" style={{ gap: 6 }}><Tag tone={st.role === 'Sales' ? 'warn' : roleTone[st.role]}>{st.role === 'Sales' ? 'You' : st.role}</Tag><span className="small">{st.label}</span></span></td>
                <td><IconChevronRight size={16} color="#6b7a78" /></td>
              </tr>
            ))}</tbody>
          </table>
        )}

        {tab === 'comms' && (
          <div className="vstack" style={{ gap: 12 }}>
            <span className="small muted">Every email, reply, call and update with {c.name}, across your projects with them, newest first.</span>
            <div className="timeline">
              {comms.map(cm => {
                const [I, col] = commIcon[cm.kind];
                return (
                  <div key={cm.id} className="tl-item">
                    <Tile icon={<I size={15} />} color={col} size={32} radius={16} />
                    <div className="vstack" style={{ gap: 6, flex: 1 }}>
                      <div className="between"><span className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}><b style={{ fontSize: 13.5 }}>{cm.title}</b><Tag tone={cm.kind === 'reminder' ? 'err' : 'grey'}>{commLabel[cm.kind]}</Tag>{c.projects.length > 1 && <Tag tone="jade">{cm.e.product}</Tag>}</span><span className="tiny muted">{cm.when}</span></div>
                      <span className="tiny muted">{cm.who}</span>
                      {cm.body && <div className="small t2" style={{ background: cm.kind === 'email-in' ? 'var(--tint)' : 'var(--bg)', borderRadius: 10, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>{cm.body}</div>}
                    </div>
                  </div>
                );
              })}
              {comms.length === 0 && <Empty icon={<IconMail size={22} />} title="Nothing yet" sub="Emails, replies and calls will show here." />}
            </div>
          </div>
        )}

        {tab === 'docs' && (
          <div className="vstack" style={{ gap: 16 }}>
            {docs.length === 0 && <Empty icon={<IconFolder size={22} />} title="No documents yet" sub="Survey reports, quotes, invoices and guarantees appear here as the job moves on." />}
            {c.projects.filter(r => docs.some(d => d.e.id === r.e.id)).map(r => (
              <div key={r.e.id} className="vstack" style={{ gap: 8 }}>
                <span className="hstack" style={{ gap: 8 }}><b style={{ fontSize: 13 }}>{r.e.product}</b><Tag tone="grey">{r.e.jobId || r.e.id}</Tag></span>
                <div className="list" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0 6px' }}>
                  {docs.filter(d => d.e.id === r.e.id).map(d => <DocRow key={d.id} d={d} onOpen={() => docViewer.open(d)} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {act && actE && <SalesActionModal k={act.k} e={actE} onClose={() => setAct(null)} onDone={() => setTab(act.k === 'email' || act.k === 'call' ? 'comms' : 'overview')} />}
      {newEnq && <NewLeadModal preset={{ name: c.name, phone: c.phone, email: c.email, address: c.address, postcode: c.postcode }} onClose={() => setNewEnq(false)} onCreated={id => nav(`/enquiries/${id}`)} />}
      {docViewer.el}
    </>
  );
}
