import { req } from './api';

export interface ClientPortalClient {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: 'lead' | 'contracted' | 'onboarding' | 'active' | 'paused' | 'complete' | 'offboarded';
  portalAccess: boolean;
  accessToken?: string;
  createdAt: string;
}

export interface ClientPortalProject {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  status: 'planning' | 'in-progress' | 'review' | 'delivered' | 'paused';
  progress: number;
  startDate?: string;
  targetDate?: string;
  health?: 'green' | 'yellow' | 'red';
  createdAt: string;
}

export interface ClientPortalTask {
  id: string;
  projectId: string;
  title: string;
  status: 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done';
  dueDate?: string;
  assignee?: string;
  createdAt: string;
}

export interface ClientPortalInvoice {
  id: string;
  clientId: string;
  amount: number;
  amountPaid: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: string;
  createdAt: string;
}

export interface ClientPortalMeeting {
  id: string;
  projectId: string;
  title: string;
  date: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface ClientPortalDocument {
  id: string;
  projectId: string;
  title: string;
  url?: string;
  status: 'draft' | 'shared' | 'approved' | 'rejected';
  createdAt: string;
}

export const getPortalClients = () => req<ClientPortalClient[]>('GET', '/client-portal/clients');
export const createPortalClient = (c: Omit<ClientPortalClient, 'id' | 'createdAt'>) => req<ClientPortalClient>('POST', '/client-portal/clients', c);
export const updatePortalClient = (id: string, c: Partial<ClientPortalClient>) => req<ClientPortalClient>('PUT', `/client-portal/clients/${id}`, c);
export const deletePortalClient = (id: string) => req<{ ok: boolean }>('DELETE', `/client-portal/clients/${id}`);

export const getPortalProjects = () => req<ClientPortalProject[]>('GET', '/client-portal/projects');
export const createPortalProject = (p: Omit<ClientPortalProject, 'id' | 'createdAt'>) => req<ClientPortalProject>('POST', '/client-portal/projects', p);
export const updatePortalProject = (id: string, p: Partial<ClientPortalProject>) => req<ClientPortalProject>('PUT', `/client-portal/projects/${id}`, p);
export const deletePortalProject = (id: string) => req<{ ok: boolean }>('DELETE', `/client-portal/projects/${id}`);

export const getPortalTasks = () => req<ClientPortalTask[]>('GET', '/client-portal/tasks');
export const createPortalTask = (t: Omit<ClientPortalTask, 'id' | 'createdAt'>) => req<ClientPortalTask>('POST', '/client-portal/tasks', t);
export const updatePortalTask = (id: string, t: Partial<ClientPortalTask>) => req<ClientPortalTask>('PUT', `/client-portal/tasks/${id}`, t);
export const deletePortalTask = (id: string) => req<{ ok: boolean }>('DELETE', `/client-portal/tasks/${id}`);

export const getPortalInvoices = () => req<ClientPortalInvoice[]>('GET', '/client-portal/invoices');
export const createPortalInvoice = (i: Omit<ClientPortalInvoice, 'id' | 'createdAt'>) => req<ClientPortalInvoice>('POST', '/client-portal/invoices', i);
export const updatePortalInvoice = (id: string, i: Partial<ClientPortalInvoice>) => req<ClientPortalInvoice>('PUT', `/client-portal/invoices/${id}`, i);
export const deletePortalInvoice = (id: string) => req<{ ok: boolean }>('DELETE', `/client-portal/invoices/${id}`);

export const getPortalMeetings = () => req<ClientPortalMeeting[]>('GET', '/client-portal/meetings');
export const createPortalMeeting = (m: Omit<ClientPortalMeeting, 'id' | 'createdAt'>) => req<ClientPortalMeeting>('POST', '/client-portal/meetings', m);
export const updatePortalMeeting = (id: string, m: Partial<ClientPortalMeeting>) => req<ClientPortalMeeting>('PUT', `/client-portal/meetings/${id}`, m);
export const deletePortalMeeting = (id: string) => req<{ ok: boolean }>('DELETE', `/client-portal/meetings/${id}`);

export const getPortalDocuments = () => req<ClientPortalDocument[]>('GET', '/client-portal/documents');
export const createPortalDocument = (d: Omit<ClientPortalDocument, 'id' | 'createdAt'>) => req<ClientPortalDocument>('POST', '/client-portal/documents', d);
export const updatePortalDocument = (id: string, d: Partial<ClientPortalDocument>) => req<ClientPortalDocument>('PUT', `/client-portal/documents/${id}`, d);
export const deletePortalDocument = (id: string) => req<{ ok: boolean }>('DELETE', `/client-portal/documents/${id}`);

export const validateClientToken = (email: string, token: string) =>
  req<{ valid: boolean; client?: ClientPortalClient }>('POST', '/client-portal/validate-token', { email, token });
