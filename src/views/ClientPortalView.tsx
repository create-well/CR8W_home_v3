import React, { useMemo } from 'react';
import type { ClientPortalClient, ClientPortalProject, ClientPortalTask, ClientPortalInvoice, ClientPortalMeeting, ClientPortalDocument } from '../api-client-portal';

interface P {
  client: ClientPortalClient; projects: ClientPortalProject[]; tasks: ClientPortalTask[];
  invoices: ClientPortalInvoice[]; meetings: ClientPortalMeeting[]; documents: ClientPortalDocument[];
  onLogout: () => void;
}

const HD: Record<string,string> = { green:'#34764d', yellow:'#a66b00', red:'#a83832' };

export function ClientPortalView({ client, projects, tasks, invoices, meetings, documents, onLogout }: P) {
  const avgProgress = projects.length ? Math.round(projects.reduce((s,p)=>s+(p.progress||0),0)/projects.length) : 0;
  const totalDue = useMemo(()=>invoices.reduce((s,i)=>s+(i.amount-i.amountPaid),0),[invoices]);
  const openTasks = tasks.filter(t=>t.status!=='done');
  const upcomingMeetings = meetings.filter(m=>m.status==='scheduled' && new Date(m.date)>new Date()).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).slice(0,3);
  const sharedDocs = documents.filter(d=>d.status==='shared'||d.status==='approved');

  return (<div style={{maxWidth:900,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
      <div><h1 style={{marginBottom:4,color:'var(--ths-ink,#17233a)'}}>Welcome, {client.name}</h1><div style={{fontSize:'0.9rem',color:'var(--ths-muted,#667085)'}}>{client.company||client.email}</div></div>
      <button className='btn-sm' onClick={onLogout}>Logout</button>
    </div>
    <div className='view-grid' style={{marginBottom:24}}>
      <div className='card' style={{borderTop:'4px solid var(--ths-blue,#244b7a)',textAlign:'center',background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><div style={{fontSize:'0.8rem',color:'var(--ths-muted,#667085)',textTransform:'uppercase',letterSpacing:1}}>Projects</div><div style={{fontSize:'1.6rem',fontWeight:700,color:'var(--ths-ink,#17233a)'}}>{projects.length}</div></div>
      <div className='card' style={{borderTop:'4px solid var(--ths-gold,#d59b3b)',textAlign:'center',background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><div style={{fontSize:'0.8rem',color:'var(--ths-muted,#667085)',textTransform:'uppercase',letterSpacing:1}}>Progress</div><div style={{fontSize:'1.6rem',fontWeight:700,color:'var(--ths-ink,#17233a)'}}>{avgProgress}%</div></div>
      <div className='card' style={{borderTop:'4px solid var(--ths-red,#a83832)',textAlign:'center',background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><div style={{fontSize:'0.8rem',color:'var(--ths-muted,#667085)',textTransform:'uppercase',letterSpacing:1}}>Balance Due</div><div style={{fontSize:'1.6rem',fontWeight:700,color:totalDue>0?'var(--ths-red,#a83832)':'var(--ths-ink,#17233a)'}}>${totalDue.toLocaleString()}</div></div>
      <div className='card' style={{borderTop:'4px solid var(--ths-sage,#34764d)',textAlign:'center',background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><div style={{fontSize:'0.8rem',color:'var(--ths-muted,#667085)',textTransform:'uppercase',letterSpacing:1}}>Open Tasks</div><div style={{fontSize:'1.6rem',fontWeight:700,color:'var(--ths-ink,#17233a)'}}>{openTasks.length}</div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div className='card' style={{background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><h3 style={{marginBottom:12,color:'var(--ths-ink,#17233a)'}}>Active Projects</h3>
          {projects.length===0&&<p style={{color:'var(--ths-muted,#667085)',fontSize:'0.9rem'}}>No projects yet.</p>}
          {projects.map(p=>(<div key={p.id} style={{marginBottom:14,paddingBottom:14,borderBottom:'1px solid var(--ths-line,#ccd5e1)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:600,color:'var(--ths-ink,#17233a)'}}>{p.name}</span><span className='badge' style={{background:HD[p.health||'green'],color:'#fff',padding:'4px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:600}}>{p.health||'green'}</span>
            </div>
            {p.description&&<p style={{fontSize:'0.85rem',color:'var(--ths-muted,#667085)',margin:'6px 0'}}>{p.description}</p>}
            <div style={{marginTop:6}}><div style={{height:6,background:'var(--ths-line,#ccd5e1)',borderRadius:3,overflow:'hidden'}}><div style={{width:p.progress+'%',height:'100%',background:'var(--ths-blue,#244b7a)',borderRadius:3}}/></div><div style={{display:'flex',justifyContent:'space-between',fontSize:'0.75rem',marginTop:4,color:'var(--ths-muted,#667085)'}}><span>{p.progress}%</span>{p.targetDate&&<span>Due {new Date(p.targetDate).toLocaleDateString()}</span>}</div></div>
          </div>))}
        </div>
        <div className='card' style={{background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><h3 style={{marginBottom:12,color:'var(--ths-ink,#17233a)'}}>Tasks</h3>
          {tasks.length===0&&<p style={{color:'var(--ths-muted,#667085)',fontSize:'0.9rem'}}>No tasks yet.</p>}
          {tasks.map(t=>(<div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--ths-line,#ccd5e1)'}}>
            <div><div style={{fontSize:'0.9rem',color:'var(--ths-ink,#17233a)'}}>{t.title}</div>{t.dueDate&&<div style={{fontSize:'0.75rem',color:'var(--ths-muted,#667085)'}}>Due {new Date(t.dueDate).toLocaleDateString()}</div>}</div>
            <span className={'badge badge-' + (t.status==='done'?'success':t.status==='in-progress'?'info':'clay')} style={{padding:'4px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:600}}>{t.status}</span>
          </div>))}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div className='card' style={{background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><h3 style={{marginBottom:12,color:'var(--ths-ink,#17233a)'}}>Invoices</h3>
          {invoices.length===0&&<p style={{color:'var(--ths-muted,#667085)',fontSize:'0.9rem'}}>No invoices yet.</p>}
          {invoices.map(i=>(<div key={i.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--ths-line,#ccd5e1)'}}>
            <div><div style={{fontSize:'0.9rem',color:'var(--ths-ink,#17233a)'}}>${i.amount.toLocaleString()}</div><div style={{fontSize:'0.75rem',color:'var(--ths-muted,#667085)'}}>Paid ${i.amountPaid.toLocaleString()} - Balance ${(i.amount-i.amountPaid).toLocaleString()}</div></div>
            <span className={'badge badge-' + (i.status==='paid'?'success':i.status==='overdue'?'danger':'info')} style={{padding:'4px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:600}}>{i.status}</span>
          </div>))}
        </div>
        <div className='card' style={{background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><h3 style={{marginBottom:12,color:'var(--ths-ink,#17233a)'}}>Upcoming Meetings</h3>
          {upcomingMeetings.length===0&&<p style={{color:'var(--ths-muted,#667085)',fontSize:'0.9rem'}}>No upcoming meetings.</p>}
          {upcomingMeetings.map(m=>(<div key={m.id} style={{padding:'10px 0',borderBottom:'1px solid var(--ths-line,#ccd5e1)'}}>
            <div style={{fontWeight:600,fontSize:'0.9rem',color:'var(--ths-ink,#17233a)'}}>{m.title}</div>
            <div style={{fontSize:'0.8rem',color:'var(--ths-muted,#667085)',marginTop:4}}>{new Date(m.date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
            {m.notes&&<p style={{fontSize:'0.8rem',marginTop:6,color:'var(--ths-ink,#17233a)'}}>{m.notes}</p>}
          </div>))}
        </div>
        <div className='card' style={{background:'var(--ths-paper,#fff)',border:'1px solid var(--ths-line,#ccd5e1)',borderRadius:10,padding:16}}><h3 style={{marginBottom:12,color:'var(--ths-ink,#17233a)'}}>Shared Documents</h3>
          {sharedDocs.length===0&&<p style={{color:'var(--ths-muted,#667085)',fontSize:'0.9rem'}}>No shared documents yet.</p>}
          {sharedDocs.map(d=>(<div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--ths-line,#ccd5e1)'}}>
            <span style={{fontSize:'0.9rem',color:'var(--ths-ink,#17233a)'}}>{d.title}</span>
            {d.url?<a href={d.url} target='_blank' rel='noreferrer' style={{fontSize:'0.8rem',color:'var(--ths-blue,#244b7a)'}}>Open →</a>:<span className='badge badge-info' style={{fontSize:'0.7rem',padding:'4px 10px',borderRadius:20,fontWeight:600}}>{d.status}</span>}
          </div>))}
        </div>
      </div>
    </div>
  </div>);
}
