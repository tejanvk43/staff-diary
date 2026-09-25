import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Archive,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  LockKeyhole,
  MessageCircle,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

const AUDIENCE_OPTIONS = {
  Admin: [
    { value: 'ALL_STAFF', label: 'All staff', helper: 'Broadcast to every Admin, HOD, and Faculty account.' },
    { value: 'HODS_ONLY', label: 'HODs only', helper: 'Visible to all HOD accounts and the sender.' },
    { value: 'INDIVIDUAL', label: 'Individual staff', helper: 'Start a private-looking one-to-one thread. Admin audit visibility still applies.' },
  ],
  HOD: [
    { value: 'DEPARTMENT_GROUP', label: 'Department group', helper: 'Your department staff remain the base group; you can add or remove members.' },
  ],
};

function emptyComposer(user) {
  const defaultAudience = user?.role === 'HOD' ? 'DEPARTMENT_GROUP' : 'ALL_STAFF';
  return { subject: '', body: '', audience_type: defaultAudience, recipient_employee_ids: [] };
}

function parseServerDate(value) {
  if (!value) return null;
  const raw = String(value);
  const normalized = raw
    .replace(' ', 'T')
    .replace(/\.(\d{3})\d+/, '.$1');
  const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatStamp(value) {
  const date = parseServerDate(value);
  return date ? format(date, 'dd MMM yyyy, hh:mm:ss a') : String(value || 'Unknown time');
}

function formatShortStamp(value) {
  const date = parseServerDate(value);
  return date ? format(date, 'dd MMM, hh:mm a') : '—';
}

function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function audienceLabel(type) {
  return {
    ALL_STAFF: 'All staff',
    HODS_ONLY: 'HODs only',
    INDIVIDUAL: 'Individual',
    DEPARTMENT_GROUP: 'Department group',
  }[type] || type;
}

function participantSummary(conversation, currentUser) {
  if (conversation.audience_type === 'ALL_STAFF') return 'All staff';
  if (conversation.audience_type === 'HODS_ONLY') return 'All HODs';
  if (conversation.audience_type === 'DEPARTMENT_GROUP') return conversation.department || 'Department staff';
  const other = (conversation.participants || []).find(p => p.employee_id !== currentUser?.employee_id);
  return other?.full_name || 'Individual conversation';
}

function personLabel(person) {
  if (!person) return '';
  return `${person.full_name} · ${person.role} · ${person.department}`;
}

function PersonSearchSelect({ id, label, value, onChange, options, placeholder = 'Search staff…' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const selected = options.find(person => person.employee_id === value);
  const filtered = options.filter(person => personLabel(person).toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const handleOutside = event => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="message-person-field" ref={wrapRef}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className={`message-person-control ${open ? 'open' : ''}`}>
        <Search size={14} />
        <input
          id={id}
          autoComplete="off"
          value={open ? query : (selected ? personLabel(selected) : '')}
          placeholder={open ? placeholder : 'Any staff member'}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={event => { setQuery(event.target.value); setOpen(true); }}
        />
        {value && <button type="button" className="person-clear" aria-label={`Clear ${label}`} onClick={() => { onChange(''); setQuery(''); setOpen(false); }}><X size={13} /></button>}
      </div>
      {open && (
        <div className="message-person-options">
          <button type="button" className={!value ? 'person-option selected' : 'person-option'} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(''); setQuery(''); setOpen(false); }}>
            <span><strong>Any staff member</strong><small>No {label.toLowerCase()} filter</small></span>
            {!value && <Check size={14} />}
          </button>
          {filtered.map(person => (
            <button type="button" key={person.employee_id} className={`person-option ${person.employee_id === value ? 'selected' : ''}`} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(person.employee_id); setQuery(''); setOpen(false); }}>
              <span><strong>{person.full_name}</strong><small>{person.role} · {person.department} · {person.employee_id}</small></span>
              {person.employee_id === value && <Check size={14} />}
            </button>
          ))}
          {!filtered.length && <div className="person-no-results">No staff match “{query}”.</div>}
        </div>
      )}
    </div>
  );
}

function SearchableMemberPicker({ label, options, selectedIds, onChange, helper }) {
  const [query, setQuery] = useState('');
  const selectedPeople = options.filter(person => selectedIds.includes(person.employee_id));
  const filtered = options.filter(person => personLabel(person).toLowerCase().includes(query.trim().toLowerCase()));

  const toggle = employeeId => {
    onChange(selectedIds.includes(employeeId)
      ? selectedIds.filter(id => id !== employeeId)
      : [...selectedIds, employeeId]);
  };

  return (
    <div className="message-member-picker">
      <div className="member-picker-heading"><div><span className="form-label">{label}</span>{helper && <small>{helper}</small>}</div><span className="member-count">{selectedIds.length} selected</span></div>
      <div className="member-picker-search"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search any user by name, role, department, or ID…" /></div>
      {selectedPeople.length > 0 && (
        <div className="member-chip-row">
          {selectedPeople.slice(0, 4).map(person => <span className="member-chip" key={person.employee_id}>{person.full_name}<button type="button" aria-label={`Remove ${person.full_name}`} onClick={() => toggle(person.employee_id)}><X size={11} /></button></span>)}
          {selectedPeople.length > 4 && <span className="member-chip more">+{selectedPeople.length - 4} more</span>}
        </div>
      )}
      <div className="member-picker-options">
        {filtered.map(person => (
          <label className={`member-option ${selectedIds.includes(person.employee_id) ? 'selected' : ''}`} key={person.employee_id}>
            <input type="checkbox" checked={selectedIds.includes(person.employee_id)} onChange={() => toggle(person.employee_id)} />
            <span><strong>{person.full_name}</strong><small>{person.role} · {person.employee_id}</small></span>
            {selectedIds.includes(person.employee_id) && <Check size={14} />}
          </label>
        ))}
        {!filtered.length && <div className="person-no-results">No department staff match “{query}”.</div>}
      </div>
    </div>
  );
}

export default function MessagingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isHod = user?.role === 'HOD';
  const canStartConversation = isAdmin || isHod;

  const [conversations, setConversations] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [composerMode, setComposerMode] = useState(canStartConversation ? 'new' : 'reply');
  const [composer, setComposer] = useState(() => emptyComposer(user));
  const [replyBody, setReplyBody] = useState('');
  const [filterDraft, setFilterDraft] = useState({ q: '', sender_employee_id: '', receiver_employee_id: '', from_date: '', to_date: '' });
  const [activeFilters, setActiveFilters] = useState({ q: '', sender_employee_id: '', receiver_employee_id: '', from_date: '', to_date: '' });
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const audienceOptions = AUDIENCE_OPTIONS[user?.role] || [];
  const departmentMembers = useMemo(() => directory.filter(person => (
    person.department === user?.department &&
    person.employee_id !== user?.employee_id
  )), [directory, user]);
  const groupMemberOptions = useMemo(() => directory.filter(person => (
    person.employee_id !== user?.employee_id
  )), [directory, user]);
  const ownedDepartmentGroup = useMemo(() => conversations.find(conversation => (
    isHod &&
    conversation.audience_type === 'DEPARTMENT_GROUP' &&
    conversation.created_by === user?.employee_id
  )), [conversations, isHod, user]);
  const existingIndividualThread = useMemo(() => {
    const recipientId = composer.recipient_employee_ids[0];
    if (!recipientId || !isAdmin) return null;
    return conversations.find(conversation => (
      conversation.audience_type === 'INDIVIDUAL' &&
      conversation.created_by === user?.employee_id &&
      (conversation.participants || []).some(participant => participant.employee_id === recipientId)
    )) || null;
  }, [composer.recipient_employee_ids, conversations, isAdmin, user]);

  const loadParticipants = async () => {
    try {
      const response = await api.get('/api/messaging/participants');
      setDirectory(response.data.data || []);
    } catch {
      toast.error('Staff directory could not be loaded.');
    }
  };

  const loadMessages = async (conversationId, filters = activeFilters) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const response = await api.get(`/api/messaging/conversations/${conversationId}/messages`, { params: filters });
      const data = response.data.data || {};
      setMessages(data.messages || []);
      setSelectedConversation(current => ({
        ...(current || {}),
        ...(data.conversation || {}),
        participants: data.participants || current?.participants || [],
      }));
      setGroupMemberIds((data.participants || [])
        .filter(participant => participant.employee_id !== user?.employee_id)
        .map(participant => participant.employee_id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversation history could not be loaded.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadConversations = async (filters = activeFilters, preserveSelection = true) => {
    setLoadingConversations(true);
    try {
      const response = await api.get('/api/messaging/conversations', { params: filters });
      const rows = response.data.data || [];
      setConversations(rows);
      const stillVisible = preserveSelection && rows.find(row => row.id === selectedConversationId);
      const next = stillVisible || rows[0];
      if (next) {
        setSelectedConversationId(next.id);
        setSelectedConversation(next);
        await loadMessages(next.id, filters);
        setComposerMode('reply');
      } else {
        setSelectedConversationId(null);
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversations could not be loaded.');
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadParticipants();
      loadConversations();
    }, 0);
    return () => window.clearTimeout(timer);
    // These loaders intentionally run once when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectConversation = async conversation => {
    setComposerMode('reply');
    setSelectedConversationId(conversation.id);
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
  };

  const handleFilterSubmit = async event => {
    event.preventDefault();
    if (filterDraft.from_date && filterDraft.to_date && filterDraft.from_date > filterDraft.to_date) {
      toast.error('From date cannot be later than to date.');
      return;
    }
    setActiveFilters(filterDraft);
    await loadConversations(filterDraft, false);
  };

  const clearFilters = async () => {
    const cleared = { q: '', sender_employee_id: '', receiver_employee_id: '', from_date: '', to_date: '' };
    setFilterDraft(cleared);
    setActiveFilters(cleared);
    await loadConversations(cleared, true);
  };

  const startNewConversation = () => {
    if (!canStartConversation) return;
    if (isHod && ownedDepartmentGroup) {
      selectConversation(ownedDepartmentGroup);
      toast('Your department group already exists. Append new messages to that thread.');
      return;
    }
    const nextComposer = emptyComposer(user);
    if (isHod) {
      nextComposer.recipient_employee_ids = departmentMembers.map(person => person.employee_id);
    }
    setComposer(nextComposer);
    setSelectedConversation(null);
    setSelectedConversationId(null);
    setMessages([]);
    setReplyBody('');
    setComposerMode('new');
  };

  const handleAudienceChange = event => {
    const audience = event.target.value;
    const nextRecipients = audience === 'DEPARTMENT_GROUP'
      ? departmentMembers.map(person => person.employee_id)
      : [];
    setComposer(current => ({ ...current, audience_type: audience, recipient_employee_ids: nextRecipients }));
  };

  const handleCreateConversation = async event => {
    event.preventDefault();
    if (!composer.subject.trim() || !composer.body.trim()) {
      toast.error('Add a subject and message before sending.');
      return;
    }
    if (composer.audience_type === 'INDIVIDUAL' && composer.recipient_employee_ids.length !== 1) {
      toast.error('Select one staff member for an individual conversation.');
      return;
    }
    if (isHod && composer.audience_type === 'DEPARTMENT_GROUP' && ownedDepartmentGroup) {
      selectConversation(ownedDepartmentGroup);
      toast('Your department group already exists. Append new messages to that thread.');
      return;
    }
    if (existingIndividualThread) {
      selectConversation(existingIndividualThread);
      toast('This individual chat already exists. Append your message to the existing thread.');
      return;
    }
    setSending(true);
    try {
      const response = await api.post('/api/messaging/conversations', {
        ...composer,
        subject: composer.subject.trim(),
        body: composer.body.trim(),
      });
      toast.success(response.data.message || 'Conversation sent.');
      const newId = response.data.data?.id;
      setComposer(emptyComposer(user));
      setComposerMode('reply');
      await loadConversations(activeFilters, false);
      if (newId) {
        setSelectedConversationId(newId);
        await loadMessages(newId, activeFilters);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversation could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const handleAppendMessage = async event => {
    event.preventDefault();
    if (!selectedConversationId || !replyBody.trim()) return;
    setSending(true);
    try {
      const response = await api.post(`/api/messaging/conversations/${selectedConversationId}/messages`, {
        body: replyBody.trim(),
      });
      toast.success(response.data.message || 'Message sent.');
      setReplyBody('');
      await loadMessages(selectedConversationId, activeFilters);
      await loadConversations(activeFilters, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const handleSaveGroupMembers = async () => {
    if (!selectedConversationId) return;
    setSavingMembers(true);
    try {
      const response = await api.put(`/api/messaging/conversations/${selectedConversationId}/participants`, {
        recipient_employee_ids: groupMemberIds,
      });
      toast.success(response.data.message || 'Group members updated.');
      await loadMessages(selectedConversationId, activeFilters);
      await loadConversations(activeFilters, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Group members could not be updated.');
    } finally {
      setSavingMembers(false);
    }
  };

  const isGroupOwner = isHod && selectedConversation?.audience_type === 'DEPARTMENT_GROUP' && selectedConversation.created_by === user?.employee_id;

  return (
    <AppLayout title="Messaging & Audit Archive">
      <div className="messaging-page">
        <section className="messaging-hero">
          <div>
            <div className="eyebrow"><ShieldCheck size={14} /> Auditable staff communication</div>
            <h2>Messages, with a permanent record.</h2>
            <p>Send to the right staff group, keep every conversation in context, and preserve the exact time a message was sent.</p>
          </div>
          <div className="audit-banner">
            <LockKeyhole size={18} />
            <div>
              <strong>Admin visibility is always on</strong>
              <span>Admins can review every conversation and filter the archive by date. Sent messages cannot be edited or deleted.</span>
            </div>
          </div>
        </section>

        <section className="messaging-toolbar card">
          <div className="toolbar-heading">
            <div>
              <span className="section-kicker">Archive filters</span>
              <h3>{isAdmin ? 'Search the complete message archive' : 'Find conversations available to you'}</h3>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowFilters(value => !value)}>
              <Filter size={15} /> {showFilters ? 'Hide filters' : 'Show filters'} <ChevronDown size={14} className={showFilters ? 'rotate-180' : ''} />
            </button>
          </div>
          {showFilters && (
            <form className="message-filter-form" onSubmit={handleFilterSubmit}>
              <label className="message-filter-search">
                <span className="sr-only">Search subject or sender</span>
                <Search size={16} />
                <input
                  className="input"
                  value={filterDraft.q}
                  onChange={event => setFilterDraft(current => ({ ...current, q: event.target.value }))}
                  placeholder="Search subject or sender"
                />
              </label>
              {isAdmin && (
                <>
                  <PersonSearchSelect
                    id="archive-sender"
                    label="Sender"
                    value={filterDraft.sender_employee_id}
                    options={directory}
                    onChange={value => setFilterDraft(current => ({ ...current, sender_employee_id: value }))}
                    placeholder="Type a sender name, role, or ID…"
                  />
                  <PersonSearchSelect
                    id="archive-receiver"
                    label="Receiver"
                    value={filterDraft.receiver_employee_id}
                    options={directory}
                    onChange={value => setFilterDraft(current => ({ ...current, receiver_employee_id: value }))}
                    placeholder="Type a receiver name, role, or ID…"
                  />
                </>
              )}
              <label>
                <span className="form-label">From date</span>
                <input className="input" type="date" value={filterDraft.from_date} onChange={event => setFilterDraft(current => ({ ...current, from_date: event.target.value }))} />
              </label>
              <label>
                <span className="form-label">To date</span>
                <input className="input" type="date" value={filterDraft.to_date} onChange={event => setFilterDraft(current => ({ ...current, to_date: event.target.value }))} />
              </label>
              <div className="message-filter-actions">
                <button className="btn btn-primary" type="submit"><Search size={15} /> Apply</button>
                <button className="btn btn-secondary" type="button" onClick={clearFilters}><X size={15} /> Clear</button>
              </div>
            </form>
          )}
        </section>

        <div className="messaging-layout">
          <aside className="conversation-panel card">
            <div className="conversation-panel-header">
              <div>
                <span className="section-kicker">{isAdmin ? 'Full archive' : 'Your inbox'}</span>
                <h3>Conversations <span>{conversations.length}</span></h3>
              </div>
              {canStartConversation && (!isHod || !ownedDepartmentGroup) && (
                <button type="button" className="btn btn-primary btn-icon" title="Start new conversation" aria-label="Start new conversation" onClick={startNewConversation}>
                  <MessageSquarePlus size={17} />
                </button>
              )}
            </div>
            <div className="archive-scope-note">
              <Archive size={14} />
              <span>{isAdmin ? 'All staff conversations are visible to you.' : 'Only conversations where you are a participant are shown.'}</span>
            </div>
            <div className="conversation-list">
              {loadingConversations && <div className="message-state"><RefreshCw size={18} className="spin" /> Loading conversations…</div>}
              {!loadingConversations && conversations.length === 0 && (
                <div className="message-state empty-state-small"><MessageCircle size={22} /><strong>No conversations found</strong><span>Try clearing the date filters or start a new thread.</span></div>
              )}
              {!loadingConversations && conversations.map(conversation => (
                <button
                  type="button"
                  key={conversation.id}
                  className={`conversation-row ${selectedConversationId === conversation.id && composerMode === 'reply' ? 'active' : ''}`}
                  onClick={() => selectConversation(conversation)}
                >
                  <div className="conversation-row-top">
                    <span className="conversation-audience">{audienceLabel(conversation.audience_type)}</span>
                    <span className="conversation-time">{formatShortStamp(conversation.last_sent_at || conversation.created_at)}</span>
                  </div>
                  <strong>{conversation.subject}</strong>
                  <span className="conversation-meta">{participantSummary(conversation, user)} · {conversation.message_count} {Number(conversation.message_count) === 1 ? 'message' : 'messages'}</span>
                  <span className="conversation-creator">Started by {conversation.creator_name}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="message-workspace card">
            {composerMode === 'new' && canStartConversation ? (
              <form className="new-conversation-form" onSubmit={handleCreateConversation}>
                <div className="workspace-header">
                  <div>
                    <span className="section-kicker">New message</span>
                    <h3>Start a conversation</h3>
                    <p>Choose a delivery flow. Every recipient receives the same permanent, timestamped record.</p>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setComposerMode('reply'); if (conversations[0]) selectConversation(conversations[0]); }}><X size={15} /> Cancel</button>
                </div>
                <div className="flow-choice-grid">
                  {audienceOptions.map(option => (
                    <label key={option.value} className={`flow-choice ${composer.audience_type === option.value ? 'selected' : ''}`}>
                      <input type="radio" name="audience_type" value={option.value} checked={composer.audience_type === option.value} onChange={handleAudienceChange} />
                      <span className="flow-choice-icon"><ArrowUpRight size={16} /></span>
                      <span><strong>{option.label}</strong><small>{option.helper}</small></span>
                    </label>
                  ))}
                </div>
                {composer.audience_type === 'INDIVIDUAL' && (
                  <PersonSearchSelect
                    id="new-conversation-recipient"
                    label="Staff member"
                    value={composer.recipient_employee_ids[0] || ''}
                    options={directory}
                    onChange={value => setComposer(current => ({ ...current, recipient_employee_ids: value ? [value] : [] }))}
                    placeholder="Search by name, role, department, or ID…"
                  />
                )}
                {composer.audience_type === 'DEPARTMENT_GROUP' && (
                  <div className="group-recipient-box">
                    <div><Users size={17} /><div><strong>Department group: {user?.department}</strong><span>Home-department staff are selected by default. Search and add any existing user from any department or role.</span></div></div>
                    <SearchableMemberPicker
                      label="Recipients"
                      options={groupMemberOptions}
                      selectedIds={composer.recipient_employee_ids}
                      onChange={recipientIds => setComposer(current => ({ ...current, recipient_employee_ids: recipientIds }))}
                      helper="All existing users are searchable across every department and role. Membership can be adjusted later without changing the permanent message history."
                    />
                  </div>
                )}
                {composer.audience_type === 'INDIVIDUAL' && existingIndividualThread && (
                  <div className="existing-thread-notice">
                    <div><MessageCircle size={16} /><span><strong>Existing individual chat found</strong><small>Only append messages to this existing thread. A second chat will not be created.</small></span></div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => selectConversation(existingIndividualThread)}>Open chat</button>
                  </div>
                )}
                <label>
                  <span className="form-label">Subject</span>
                  <input className="input" maxLength={255} value={composer.subject} onChange={event => setComposer(current => ({ ...current, subject: event.target.value }))} placeholder="Give the conversation a clear subject" />
                </label>
                <label>
                  <span className="form-label">Message</span>
                  <textarea className="input message-textarea" value={composer.body} onChange={event => setComposer(current => ({ ...current, body: event.target.value }))} placeholder="Write the message to send…" rows={8} />
                </label>
                <div className="composer-footer">
                  <span><LockKeyhole size={14} /> Messages are append-only once sent.</span>
                  <button className="btn btn-primary" type="submit" disabled={sending || !!existingIndividualThread}><Send size={15} /> {sending ? 'Sending…' : existingIndividualThread ? 'Open existing chat to append' : 'Send message'}</button>
                </div>
              </form>
            ) : selectedConversation ? (
              <>
                <div className="workspace-header conversation-header-detail">
                  <div>
                    <div className="detail-kicker"><span className="conversation-audience">{audienceLabel(selectedConversation.audience_type)}</span><span>Conversation #{selectedConversation.id}</span></div>
                    <h3>{selectedConversation.subject}</h3>
                    <p>{participantSummary(selectedConversation, user)} · Started by {selectedConversation.creator_name || selectedConversation.created_by}</p>
                  </div>
                  {canStartConversation && (!isHod || !ownedDepartmentGroup) && <button type="button" className="btn btn-primary btn-sm" onClick={startNewConversation}><MessageSquarePlus size={15} /> New conversation</button>}
                </div>

                <div className="conversation-audit-strip"><ShieldCheck size={15} /><span>Immutable archive</span><span className="audit-dot">•</span><span>{messages.length} record{messages.length === 1 ? '' : 's'} in this view</span><span className="audit-dot">•</span><span>Exact send times preserved</span></div>

                {isGroupOwner && (
                  <div className="group-management">
                    <div className="group-management-heading"><div><strong>Manage department group members</strong><span>Adding or removing members does not alter existing messages.</span></div><span className="group-management-count">{groupMemberIds.length} recipient{groupMemberIds.length === 1 ? '' : 's'}</span></div>
                    <SearchableMemberPicker
                      label="Recipients"
                      options={groupMemberOptions}
                      selectedIds={groupMemberIds}
                      onChange={setGroupMemberIds}
                      helper="Search the complete users list across all departments and roles, then check or uncheck members."
                    />
                    <div className="group-management-footer"><span>HOD owner is always retained.</span><button className="btn btn-secondary btn-sm" type="button" onClick={handleSaveGroupMembers} disabled={savingMembers}><Check size={14} /> {savingMembers ? 'Saving…' : 'Save members'}</button></div>
                  </div>
                )}

                <div className="message-timeline">
                  {loadingMessages && <div className="message-state"><RefreshCw size={18} className="spin" /> Loading message history…</div>}
                  {!loadingMessages && messages.length === 0 && <div className="message-state empty-state-small"><Clock3 size={22} /><strong>No messages in this date range</strong><span>Clear or widen the archive dates to view the permanent history.</span></div>}
                  {!loadingMessages && messages.map(message => {
                    const mine = message.sender_employee_id === user?.employee_id;
                    return (
                      <article key={message.id} className={`message-record ${mine ? 'mine' : ''}`}>
                        <div className="message-avatar">{initials(message.sender_name)}</div>
                        <div className="message-record-content">
                          <div className="message-record-meta"><strong>{message.sender_name}</strong><span className="role-pill">{message.sender_role}</span><time dateTime={String(message.sent_at)}><Clock3 size={12} /> {formatStamp(message.sent_at)}</time></div>
                          <div className="message-bubble">{message.body}</div>
                          <div className="message-integrity"><LockKeyhole size={11} /> Immutable record · ID {message.id} · hash {String(message.immutable_hash || '').slice(0, 12)}…</div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <form className="reply-composer" onSubmit={handleAppendMessage}>
                  <div className="reply-heading"><div><strong>Append to conversation</strong><span>Your reply will be recorded with a new server timestamp.</span></div><LockKeyhole size={16} /></div>
                  <textarea className="input message-textarea" value={replyBody} onChange={event => setReplyBody(event.target.value)} placeholder="Write a reply…" rows={3} />
                  <div className="composer-footer"><span>No edit or delete action is available for sent messages.</span><button className="btn btn-primary" type="submit" disabled={sending || !replyBody.trim()}><Send size={15} /> {sending ? 'Sending…' : 'Send reply'}</button></div>
                </form>
              </>
            ) : (
              <div className="message-empty-workspace"><MessageCircle size={38} /><h3>Select a conversation</h3><p>Choose a thread from the archive to review its complete timestamped history.</p>{canStartConversation && <button className="btn btn-primary" type="button" onClick={startNewConversation}><MessageSquarePlus size={15} /> Start a conversation</button>}</div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
