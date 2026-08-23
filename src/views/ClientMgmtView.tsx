import React, { useState } from 'react';
import type { ClientPortalClient, ClientPortalProject, ClientPortalTask, ClientPortalInvoice, ClientPortalMeeting, ClientPortalDocument } from '../api-client-portal';

interface P {
  clients: ClientPortalClient[]; projects: ClientPortalProject[]; tasks: ClientPortalTask[]; invoices: ClientPortalInvoice[];
  meetings: ClientPortalMeeting[]; documents: ClientPortalDocument[];
  onAddClient: any; onUpdateClient: any; onDeleteClient: any;
  onAddProject: any; onUpdateProject: any; onDeleteProject: any;
  onAddTask: any; onUpdateTask: any; onDeleteTask: any;
  onAddInvoice: any; onUpdateInvoice: any; onDeleteInvoice: any;
  onAddMeeting: any; onUpdateMeeting: any; onDeleteMeeting: any;
  onAddDocument: any; onUpdateDocument: any; onDeleteDocument: any;
}

const SC: Record<string,string> = { lead:'badge-clay', contracted:'badge-camel', onboarding:'badge-info', active:'badge-success', paused:'badge-warning', complete:'badge-info', offboarded:'badge-muted' };
const HC: Record<string,string> = { green:'#7A9E7E', yellow:'#D4A771', red:'#C25B38' };

export function ClientMgmtView(props:P) {
  const [sid, setSid] = useState<string|null>(null);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState('');
  const c = props.clients.find(x=>x.id===sid);
  const ps = props.projects.filter(x=>x.clientId===sid);
  const ts = props.tasks.filter(t=>ps.some(p=>p.id===t.projectId));
  const inv = props.invoices.filter(x=>x.clientId===sid);
  const ms = props.meetings.filter(m=>ps.some(p=>p.id===m.projectId));
  const ds = props.documents.filter(d=>ps.some(p=>p.id===d.projectId));
  const bal = inv.reduce((s,i)=>s+(i.amount-i.amountPaid),0);
  const prog = ps.length?Math.round(ps.reduce((s,p)=>s+p.progress,0)/ps.length):0;
  const [f, setF] = useState({name:'',email:'',company:'',status:'lead',portalAccess:false});
  const [pf, setPF] = useState({name:'',description:'',status:'planning',progress:0,startDate:'',targetDate:'',health:'green' as const});
  const [tf, setTF] = useState({title:'',status:'backlog',dueDate:'',assignee:''});
  const [nf, setNF] = useState({amount:0,amountPaid:0,status:'draft',dueDate:''});
  const [mf, setMF] = useState({title:'',date:'',notes:'',status:'scheduled'});
  const [df, setDF] = useState({title:'',url:'',status:'draft'});

  const addC = ()=>{ if(!f.name||!f.email)return; props.onAddClient({...f, accessToken:Math.random().toString(36).slice(2,10), portalAccess:true}); setF({name:'',email:'',company:'',status:'lead',portalAccess:false}); setModal(''); };
  const addP = ()=>{ if(!sid||!pf.name)return; props.onAddProject({...pf,clientId:sid}); setPF({name:'',description:'',status:'planning',progress:0,startDate:'',targetDate:'',health:'green'}); setModal(''); };
  const addT = ()=>{ if(!sid||!ps.length||!tf.title)return; props.onAddTask({...tf,projectId:ps[0].id}); setTF({title:'',status:'backlog',dueDate:'',assignee:''}); setModal(''); };
  const addI = ()=>{ if(!sid)return; props.onAddInvoice({...nf,clientId:sid}); setNF({amount:0,amountPaid:0,status:'draft',dueDate:''}); setModal(''); };
  const addM = ()=>{ if(!sid||!ps.length||!mf.title)return; props.onAddMeeting({...mf,projectId:ps[0].id}); setMF({title:'',date:'',notes:'',status:'scheduled'}); setModal(''); };
  const addD = ()=>{ if(!sid||!ps.length||!df.title)return; props.onAddDocument({...df,projectId:ps[0].id}); setDF({title:'',url:'',status:'draft'}); setModal(''); };

  return (<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h1>Client Management</h1>
      <button className="btn-primary" onClick={()=>setModal('client')}>+ Client</button>
    </div>
    <div className="card" style={{marginBottom:20}}>
      <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <select value={sid||''} onChange={e=>{setSid(e.target.value||null);setTab('overview');}} style={{minWidth:220}}>
          <option value="">Select a client...</option>
          {props.clients.map(c=>(<option key={c.id} value={c.id}>{c.name} ({c.company||c.email})</option>))}
        </select>
        {c&&(<><span className={`badge ${SC[c.status]||'badge-info'}`}>{c.status}</span>{c.portalAccess&&<span className="badge badge-success">Portal active</span>}</>)}
      </div>
    </div>
    {c&&(<><div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      {['overview','projects','tasks','invoices','meetings','documents'].map(t=>(
        <button key={t} className={`btn-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
      ))}
    </div>
    {tab==='overview'&&(<div className="view-grid">
      <div className="card" style={{borderTop:'4px solid var(--rust)'}}><div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:4}}>Projects</div><div style={{fontSize:'1.5rem',fontWeight:700}}>{ps.length}</div></div>
      <div className="card" style={{borderTop:'4px solid var(--camel)'}}><div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:4}}>Avg Progress</div><div style={{fontSize:'1.5rem',fontWeight:700}}>{prog}%</div></div>
      <div className="card" style={{borderTop:'4px solid var(--clay)'}}><div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:4}}>Total Invoiced</div><div style={{fontSize:'1.5rem',fontWeight:700}}>${inv.reduce((s,i)=>s+i.amount,0).toLocaleString()}</div></div>
      <div className="card" style={{borderTop:'4px solid var(--success)'}}><div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:4}}>Balance Due</div><div style={{fontSize:'1.5rem',fontWeight:700',color:bal>0?'var(--danger)':'inherit'}}>${bal.toLocaleString()}</div></div>
      <div className="card" style={{borderTop:'4px solid var(--ocean)'}}><div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:4}}>Open Tasks</div><div style={{fontSize:'1.5rem',fontWeight:700}}>{ts.filter(t=>t.status!=='done').length}</div></div>
      <div className="card" style={{borderTop:'4px solid var(--sandstone)'}}><div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:4}}>Access Token</div><div style={{fontSize:'0.9rem',fontFamily:'monospace',wordBreak:'break-all'}}>{c.accessToken||'-'}</div></div>
    </div>)}
    {tab==='projects'&&(<><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h3>Projects</h3><button className="btn-primary" onClick={()=>setModal('project')}>+ Project</button></div><div className="view-grid">
      {ps.map(p=>(<div key={p.id} className="card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><h4 style={{marginBottom:4}}>{p.name}</h4><span className="badge badge-info">{p.status}</span></div>
      {p.description&&<p style={{fontSize:'0.85rem',color:'var(--text-muted)'}}>{p.description}</p>}
      <div style={{marginTop:8}}><div style={{height:6,background:'var(--sandstone)',borderRadius:3,overflow:'hidden'}}><div style={{width:`${p.progress}%`,height:'100%',background:HC[p.health||'green'],borderRadius:3}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',marginTop:4}}><span>{p.progress}%</span>{p.targetDate&&<span>Due {new Date(p.targetDate).toLocaleDateString()}</span>}</div></div>
      <div style={{display:'flex',gap:6,marginTop:10}}><button className="btn-sm" onClick={()=>{const n=['green','yellow','red'];const i=n.indexOf(p.health||'green');props.onUpdateProject(p.id,{health:n[(i+1)%3] as any});}}>Health: {p.health||'green'}</button><button className="btn-sm" onClick={()=>props.onDeleteProject(p.id)}>Delete</button></div></div>))}
    </div></>)}
    {tab==='tasks'&&(<><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h3>Tasks</h3><button className="btn-primary" onClick={()=>setModal('task')}>+ Task</button></div><div className="card" style={{overflowX:'auto'}}><table className="cr8w-table"><thead><tr><th>Task</th><th>Status</th><th>Due</th><th>Owner</th><th /></tr></thead><tbody>
      {ts.map(t=>(<tr key={t.id}><td>{t.title}</td><td><span className={`badge badge-${t.status==='done'?'success':t.status==='in-progress'?'info':'clay'}`}>{t.status}</span></td><td>{t.dueDate?new Date(t.dueDate).toLocaleDateString():'-'}</td><td>{t.assignee||'-'}</td><td><button className="btn-sm" onClick={()=>props.onDeleteTask(t.id)}>Delete</button></td></tr>))}
    </tbody></table></div></>)}
    {tab==='invoices'&&(<><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h3>Invoices</h3><button className="btn-primary" onClick={()=>setModal('invoice')}>+ Invoice</button></div><div className="card" style={{overflowX:'auto'}}><table className="cr8w-table"><thead><tr><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th><th /></tr></thead><tbody>
      {inv.map(i=>(<tr key={i.id}><td>${i.amount.toLocaleString()}</td><td>${i.amountPaid.toLocaleString()}</td><td style={{color:(i.amount-i.amountPaid)>0?'var(--danger)':'inherit'}}>${(i.amount-i.amountPaid).toLocaleString()}</td><td><span className={`badge badge-${i.status==='paid'?'success':i.status==='overdue'?'danger':'info'}`}>{i.status}</span></td><td>{i.dueDate?new Date(i.dueDate).toLocaleDateString():'-'}</td><td><button className="btn-sm" onClick={()=>props.onDeleteInvoice(i.id)}>Delete</button></td></tr>))}
    </tbody></table></div></>)}
    {tab==='meetings'&&(<><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h3>Meetings</h3><button className="btn-primary" onClick={()=>setModal('meeting')}>+ Meeting</button></div><div className="view-grid">
      {ms.map(m=>(<div key={m.id} className="card"><div style={{display:'flex',justifyContent:'space-between'}}><h4>{m.title}</h4><span className={`badge badge-${m.status==='completed'?'success':'info'}`}>{m.status}</span></div><div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginTop:4}}>{new Date(m.date).toLocaleString()}</div>{m.notes&&<p style={{fontSize:'0.85rem',marginTop:8}}>{m.notes}</p>}</div>))}
    </div></>)}
    {tab==='documents'&&(<><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h3>Documents</h3><button className="btn-primary" onClick={()=>setModal('document')}>+ Document</button></div><div className="view-grid">
      {ds.map(d=>(<div key={d.id} className="card"><div style={{display:'flex',justifyContent:'space-between'}}><h4>{d.title}</h4><span className={`badge badge-${d.status==='approved'?'success':d.status==='shared'?'info':'clay'}`}>{d.status}</span></div>{d.url&&<a href={d.url} target="_blank" rel="noreferrer" style={{fontSize:'0.85rem'}}>Open -</a>}</div>))}
    </div></>)}
    </>)}
    {modal==='client'&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal('');}}><div className="modal-content"><div className="modal-header"><span className="modal-title">New Client</span><button className="modal-close" onClick={()=>setModal('')}>x</button></div>
      <div className="form-group"><label>Name</label><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div>
      <div className="form-group"><label>Email</label><input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
      <div className="form-group"><label>Company</label><input value={f.company} onChange={e=>setF({...f,company:e.target.value})}/></div>
      <div className="form-row"><div className="form-group"><label>Status</label><select value={f.status} onChange={e=>setF({...f,status:e.target.value as any})}><option value="lead">Lead</option><option value="contracted">Contracted</option><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="paused">Paused</option><option value="complete">Complete</option><option value="offboarded">Offboarded</option></select></div><div className="form-group"><label>Portal Access</label><select value={String(f.portalAccess)} onChange={e=>setF({...f,portalAccess:e.target.value==='true'})}><option value="true">Enabled</option><option value="false">Disabled</option></select></div></div>
      <button className="btn-primary" style={{width:'100%'}} onClick={addC}>Create Client</button>
    </div></div>)}
    {modal==='project'&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal('');}}><div className="modal-content"><div className="modal-header"><span className="modal-title">New Project</span><button className="modal-close" onClick={()=>setModal('')}>x</button></div>
      <div className="form-group"><label>Name</label><input value={pf.name} onChange={e=>setPF({...pf,name:e.target.value})}/></div>
      <div className="form-group"><label>Description</label><textarea value={pf.description} onChange={e=>setPF({...pf,description:e.target.value})}/></div>
      <div className="form-row"><div className="form-group"><label>Status</label><select value={pf.status} onChange={e=>setPF({...pf,status:e.target.value as any})}><option value="planning">Planning</option><option value="in-progress">In Progress</option><option value="review">Review</option><option value="delivered">Delivered</option><option value="paused">Paused</option></select></div><div className="form-group"><label>Health</label><select value={pf.health} onChange={e=>setPF({...pf,health:e.target.value as any})}><option value="green">Green</option><option value="yellow">Yellow</option><option value="red">Red</option></select></div></div>
      <div className="form-row"><div className="form-group"><label>Progress %</label><input type="number" min={0} max={100} value={pf.progress} onChange={e=>setPF({...pf,progress:Number(e.target.value)})}/></div><div className="form-group"><label>Start</label><input type="date" value={pf.startDate} onChange={e=>setPF({...pf,startDate:e.target.value})}/></div><div className="form-group"><label>Target</label><input type="date" value={pf.targetDate} onChange={e=>setPF({...pf,targetDate:e.target.value})}/></div></div>
      <button className="btn-primary" style={{width:'100%'}} onClick={addP}>Create Project</button>
    </div></div>)}
    {modal==='task'&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal('');}}><div className="modal-content"><div className="modal-header"><span className="modal-title">New Task</span><button className="modal-close" onClick={()=>setModal('')}>x</button></div>
      <div className="form-group"><label>Title</label><input value={tf.title} onChange={e=>setTF({...tf,title:e.target.value})}/></div>
      <div className="form-row"><div className="form-group"><label>Status</label><select value={tf.status} onChange={e=>setTF({...tf,status:e.target.value as any})}><option value="backlog">Backlog</option><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="in-review">In Review</option><option value="done">Done</option></select></div><div className="form-group"><label>Due</label><input type="date" value={tf.dueDate} onChange={e=>setTF({...tf,dueDate:e.target.value})}/></div></div>
      <div className="form-group"><label>Assignee</label><input value={tf.assignee} onChange={e=>setTF({...tf,assignee:e.target.value})} placeholder="sunshine, monny, ..."/></div>
      <button className="btn-primary" style={{width:'100%'}} onClick={addT}>Create Task</button>
    </div></div>)}
    {modal==='invoice'&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal('');}}><div className="modal-content"><div className="modal-header"><span className="modal-title">New Invoice</span><button className="modal-close" onClick={()=>setModal('')}>x</button></div>
      <div className="form-row"><div className="form-group"><label>Amount</label><input type="number" value={nf.amount} onChange={e=>setNF({...nf,amount:Number(e.target.value)})}/></div><div className="form-group"><label>Paid</label><input type="number" value={nf.amountPaid} onChange={e=>setNF({...nf,amountPaid:Number(e.target.value)})}/></div></div>
      <div className="form-row"><div className="form-group"><label>Status</label><select value={nf.status} onChange={e=>setNF({...nf,status:e.target.value as any})}><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></select></div><div className="form-group"><label>Due Date</label><input type="date" value={nf.dueDate} onChange={e=>setNF({...nf,dueDate:e.target.value})}/></div></div>
      <button className="btn-primary" style={{width:'100%'}} onClick={addI}>Create Invoice</button>
    </div></div>)}
    {modal==='meeting'&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal('');}}><div className="modal-content"><div className="modal-header"><span className="modal-title">New Meeting</span><button className="modal-close" onClick={()=>setModal('')}>x</button></div>
      <div className="form-group"><label>Title</label><input value={mf.title} onChange={e=>setMF({...mf,title:e.target.value})}/></div>
      <div className="form-row"><div className="form-group"><label>Date & Time</label><input type="datetime-local" value={mf.date} onChange={e=>setMF({...mf,date:e.target.value})}/></div><div className="form-group"><label>Status</label><select value={mf.status} onChange={e=>setMF({...mf,status:e.target.value as any})}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div></div>
      <div className="form-group"><label>Notes</label><textarea value={mf.notes} onChange={e=>setMF({...mf,notes:e.target.value})}/></div>
      <button className="btn-primary" style={{width:'100%'}} onClick={addM}>Create Meeting</button>
    </div></div>)}
    {modal==='document'&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal('');}}><div className="modal-content"><div className="modal-header"><span className="modal-title">New Document</span><button className="modal-close" onClick={()=>setModal('')}>x</button></div>
      <div className="form-group"><label>Title</label><input value={df.title} onChange={e=>setDF({...df,title:e.target.value})}/></div>
      <div className="form-group"><label>URL</label><input value={df.url} onChange={e=>setDF({...df,url:e.target.value})} placeholder="https://..."/></div>
      <div className="form-group"><label>Status</label><select value={df.status} onChange={e=>setDF({...df,status:e.target.value as any})}><option value="draft">Draft</option><option value="shared">Shared</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
      <button className="btn-primary" style={{width:'100%'}} onClick={addD}>Create Document</button>
    </div></div>)}
  </div>);
}
