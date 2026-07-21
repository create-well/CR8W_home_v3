import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import * as api from './api';

export function LandingSignup({ onStaff }: { onStaff: () => void }) {
const [email, setEmail] = useState('');
const [name, setName] = useState('');
const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

async function submit(e: React.FormEvent) {
e.preventDefault();
const clean = email.trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) { setStatus('error'); return; }
setStatus('sending');
try {
await api.addSignup(clean, name.trim(), 'landing');
setStatus('done');
} catch { setStatus('error'); }
}

return (
<div className="cw-landing">
<h1>A community of creative beings coming home.</h1>
<p>Be first to hear about immersive events, workshops, and city drops.</p>
{status === 'done' ? (
<p className="cw-success">You're in — welcome home. ✦</p>
) : (
<form onSubmit={submit} className="cw-landing-form">
<label htmlFor="cw-name">First name (optional)</label>
<input id="cw-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="given-name" />
<label htmlFor="cw-email">Email</label>
<input id="cw-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
<button type="submit" disabled={status === 'sending'}>
<Mail size={16} /> {status === 'sending' ? 'Joining…' : 'Come home →'}
</button>
{status === 'error' && <p className="cw-err">Please enter a valid email and try again.</p>}
</form>
)}
<button className="cw-staff-link" onClick={onStaff}>Team member? Sign in →</button>
</div>
);
}
