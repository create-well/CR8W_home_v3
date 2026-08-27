import { useState, useEffect, useCallback } from 'react';
import type {
  ClientPortalClient,
  ClientPortalProject,
  ClientPortalTask,
  ClientPortalInvoice,
  ClientPortalMeeting,
  ClientPortalDocument,
} from '../api-client-portal';
import * as api from '../api-client-portal';

interface ClientData {
  clients: ClientPortalClient[];
  projects: ClientPortalProject[];
  tasks: ClientPortalTask[];
  invoices: ClientPortalInvoice[];
  meetings: ClientPortalMeeting[];
  documents: ClientPortalDocument[];
  loaded: boolean;
  error: string | null;
}

export function useClientData(pollMs = 30000) {
  const [data, setData] = useState<ClientData>({
    clients: [], projects: [], tasks: [], invoices: [], meetings: [], documents: [], loaded: false, error: null,
  });

  const fetchAll = useCallback(async () => {
    try {
      const [clients, projects, tasks, invoices, meetings, documents] = await Promise.all([
        api.getPortalClients(),
        api.getPortalProjects(),
        api.getPortalTasks(),
        api.getPortalInvoices(),
        api.getPortalMeetings(),
        api.getPortalDocuments(),
      ]);
      setData({ clients, projects, tasks, invoices, meetings, documents, loaded: true, error: null });
    } catch (e: any) {
      setData(prev => ({ ...prev, loaded: true, error: e.message }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, pollMs);
    return () => clearInterval(id);
  }, [fetchAll, pollMs]);

  const refresh = fetchAll;

  const addClient = async (c: Omit<ClientPortalClient, 'id' | 'createdAt'>) => {
    const created = await api.createPortalClient(c);
    setData(prev => ({ ...prev, clients: [...prev.clients, created] }));
    return created;
  };
  const updateClient = async (id: string, updates: Partial<ClientPortalClient>) => {
    const updated = await api.updatePortalClient(id, updates);
    setData(prev => ({ ...prev, clients: prev.clients.map(c => c.id === id ? updated : c) }));
    return updated;
  };
  const removeClient = async (id: string) => {
    await api.deletePortalClient(id);
    setData(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
  };

  const addProject = async (p: Omit<ClientPortalProject, 'id' | 'createdAt'>) => {
    const created = await api.createPortalProject(p);
    setData(prev => ({ ...prev, projects: [...prev.projects, created] }));
    return created;
  };
  const updateProject = async (id: string, updates: Partial<ClientPortalProject>) => {
    const updated = await api.updatePortalProject(id, updates);
    setData(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? updated : p) }));
    return updated;
  };
  const removeProject = async (id: string) => {
    await api.deletePortalProject(id);
    setData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const addTask = async (t: Omit<ClientPortalTask, 'id' | 'createdAt'>) => {
    const created = await api.createPortalTask(t);
    setData(prev => ({ ...prev, tasks: [...prev.tasks, created] }));
    return created;
  };
  const updateTask = async (id: string, updates: Partial<ClientPortalTask>) => {
    const updated = await api.updatePortalTask(id, updates);
    setData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? updated : t) }));
    return updated;
  };
  const removeTask = async (id: string) => {
    await api.deletePortalTask(id);
    setData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  };

  const addInvoice = async (i: Omit<ClientPortalInvoice, 'id' | 'createdAt'>) => {
    const created = await api.createPortalInvoice(i);
    setData(prev => ({ ...prev, invoices: [...prev.invoices, created] }));
    return created;
  };
  const updateInvoice = async (id: string, updates: Partial<ClientPortalInvoice>) => {
    const updated = await api.updatePortalInvoice(id, updates);
    setData(prev => ({ ...prev, invoices: prev.invoices.map(i => i.id === id ? updated : i) }));
    return updated;
  };
  const removeInvoice = async (id: string) => {
    await api.deletePortalInvoice(id);
    setData(prev => ({ ...prev, invoices: prev.invoices.filter(i => i.id !== id) }));
  };

  const addMeeting = async (m: Omit<ClientPortalMeeting, 'id' | 'createdAt'>) => {
    const created = await api.createPortalMeeting(m);
    setData(prev => ({ ...prev, meetings: [...prev.meetings, created] }));
    return created;
  };
  const updateMeeting = async (id: string, updates: Partial<ClientPortalMeeting>) => {
    const updated = await api.updatePortalMeeting(id, updates);
    setData(prev => ({ ...prev, meetings: prev.meetings.map(m => m.id === id ? updated : m) }));
    return updated;
  };
  const removeMeeting = async (id: string) => {
    await api.deletePortalMeeting(id);
    setData(prev => ({ ...prev, meetings: prev.meetings.filter(m => m.id !== id) }));
  };

  const addDocument = async (d: Omit<ClientPortalDocument, 'id' | 'createdAt'>) => {
    const created = await api.createPortalDocument(d);
    setData(prev => ({ ...prev, documents: [...prev.documents, created] }));
    return created;
  };
  const updateDocument = async (id: string, updates: Partial<ClientPortalDocument>) => {
    const updated = await api.updatePortalDocument(id, updates);
    setData(prev => ({ ...prev, documents: prev.documents.map(d => d.id === id ? updated : d) }));
    return updated;
  };
  const removeDocument = async (id: string) => {
    await api.deletePortalDocument(id);
    setData(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }));
  };

  return {
    ...data,
    refresh,
    addClient, updateClient, removeClient,
    addProject, updateProject, removeProject,
    addTask, updateTask, removeTask,
    addInvoice, updateInvoice, removeInvoice,
    addMeeting, updateMeeting, removeMeeting,
    addDocument, updateDocument, removeDocument,
  };
}

export function useClientPortal(clientId: string | null, data: ClientData) {
  const client = data.clients.find(c => c.id === clientId) || null;
  const projects = data.projects.filter(p => p.clientId === clientId);
  const projectIds = projects.map(p => p.id);
  const tasks = data.tasks.filter(t => projectIds.includes(t.projectId));
  const invoices = data.invoices.filter(i => i.clientId === clientId);
  const meetings = data.meetings.filter(m => projectIds.includes(m.projectId));
  const documents = data.documents.filter(d => projectIds.includes(d.projectId));

  const totalBalanceDue = invoices.reduce((sum, i) => sum + (i.amount - i.amountPaid), 0);
  const progress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) : 0;

  return {
    client,
    projects,
    tasks,
    invoices,
    meetings,
    documents,
    totalBalanceDue,
    progress,
  };
}
