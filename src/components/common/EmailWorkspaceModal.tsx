import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Inbox,
  Star,
  Search,
  Trash2,
  Reply,
  Forward,
  Building2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Plus,
  MailOpen,
  Megaphone,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { EmailMessage } from '../../types/restaurant';

interface EmailWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialComposeTo?: string;
  initialSubject?: string;
}

type MailFolder = 'inbox' | 'sent' | 'starred' | 'all';

export const EmailWorkspaceModal: React.FC<EmailWorkspaceModalProps> = ({
  isOpen,
  onClose,
  initialComposeTo = '',
  initialSubject = '',
}) => {
  const {
    currentOrganization,
    currentTenant,
    tenants,
    viewScope,
    activeOperator,
    emails,
    unreadEmailCount,
    sendEmail,
    markEmailRead,
    toggleEmailStar,
    deleteEmail,
    employees,
    waiters,
  } = useRestaurant();

  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // Compose form state
  const [composeTo, setComposeTo] = useState<string>(initialComposeTo);
  const [composeSubject, setComposeSubject] = useState<string>(initialSubject);
  const [composeBody, setComposeBody] = useState<string>('');
  const [composeCategory, setComposeCategory] = useState<EmailMessage['category']>(
    viewScope === 'hq_overview' ? 'hq_directive' : 'branch_ops'
  );
  const [composePriority, setComposePriority] = useState<EmailMessage['priority']>('normal');
  const [broadcastAllBranches, setBroadcastAllBranches] = useState<boolean>(false);
  const [sendStatusBanner, setSendStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setBranchFilter('all');
    setSearchQuery('');
    setSendStatusBanner(null);
    if (initialComposeTo || initialSubject) {
      setIsComposing(true);
      setComposeTo(initialComposeTo);
      setComposeSubject(initialSubject);
    } else {
      setIsComposing(false);
    }
  }, [isOpen, initialComposeTo, initialSubject, currentTenant.id, viewScope]);

  const filteredEmails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return emails.filter((e) => {
      if (folder === 'inbox' && e.folder !== 'inbox') return false;
      if (folder === 'sent' && e.folder !== 'sent') return false;
      if (folder === 'starred' && !e.starred) return false;
      if (viewScope === 'hq_overview' && branchFilter !== 'all' && e.branchId !== branchFilter) {
        return false;
      }
      if (!q) return true;
      return (
        e.subject.toLowerCase().includes(q) ||
        e.fromName.toLowerCase().includes(q) ||
        e.fromEmail.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        e.to.some((addr) => addr.toLowerCase().includes(q))
      );
    });
  }, [emails, folder, branchFilter, searchQuery, viewScope]);

  const selectedEmail = useMemo(() => {
    return (
      filteredEmails.find((e) => e.id === selectedEmailId) ||
      filteredEmails[0] ||
      null
    );
  }, [filteredEmails, selectedEmailId]);

  if (!isOpen) return null;

  const handleSelectEmail = (email: EmailMessage) => {
    setIsComposing(false);
    setSelectedEmailId(email.id);
    if (!email.read) {
      markEmailRead(email.id, email.branchId, true);
    }
  };

  const handleCopyMailbox = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeOperator.email).catch(() => {});
    }
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 1800);
  };

  const handleReply = (email: EmailMessage) => {
    setIsComposing(true);
    setBroadcastAllBranches(false);
    setComposeTo(email.fromEmail === activeOperator.email ? email.to.join(', ') : email.fromEmail);
    setComposeSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    setComposeBody(`\n\n--- On ${new Date(email.timestamp).toLocaleString()}, ${email.fromName} wrote ---\n${email.body}`);
    setComposeCategory(email.category);
  };

  const handleForward = (email: EmailMessage) => {
    setIsComposing(true);
    setBroadcastAllBranches(false);
    setComposeTo('');
    setComposeSubject(email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`);
    setComposeBody(`\n\n--- Forwarded message from ${email.fromName} <${email.fromEmail}> ---\n${email.body}`);
    setComposeCategory(email.category);
  };

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = composeTo
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!broadcastAllBranches && recipients.length === 0) return;
    if (!composeSubject.trim() || !composeBody.trim()) return;

    const sent = sendEmail({
      to: recipients,
      subject: composeSubject.trim(),
      body: composeBody.trim(),
      category: composeCategory,
      priority: composePriority,
      broadcastAllBranches,
    });

    setIsComposing(false);
    setFolder('sent');
    setSelectedEmailId(sent.id);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setBroadcastAllBranches(false);
    setSendStatusBanner(
      broadcastAllBranches
        ? `Broadcast sent to all ${tenants.length} branches in ${currentOrganization.name}.`
        : `Email dispatched to ${sent.to.join(', ')}.`
    );
    setTimeout(() => setSendStatusBanner(null), 4000);
  };

  const addRecipientChip = (emailAddr: string) => {
    const existing = composeTo
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!existing.includes(emailAddr)) {
      setComposeTo([...existing, emailAddr].join(', '));
    }
  };

  // Intra-tenant contact directory ONLY (strictly isolated from other SaaS tenants)
  const directoryContacts = [
    { label: `${currentOrganization.name} HQ`, email: currentOrganization.ownerEmail },
    ...tenants.map((b) => ({ label: `${b.branchCode} · ${b.name}`, email: b.email })),
    ...employees
      .filter((emp) => emp.email)
      .slice(0, 4)
      .map((emp) => ({ label: `${emp.name} (${emp.role})`, email: emp.email! })),
    ...waiters
      .filter((w) => w.email)
      .slice(0, 3)
      .map((w) => ({ label: `${w.name} (Waiter)`, email: w.email })),
  ].filter((item, index, arr) => arr.findIndex((x) => x.email === item.email) === index);

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const mailtoHref = `mailto:${encodeURIComponent(composeTo)}?subject=${encodeURIComponent(
    composeSubject
  )}&body=${encodeURIComponent(composeBody)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-6xl w-full h-[88vh] border border-neutral-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Mailbox Bar */}
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-neutral-900">
                  {currentOrganization.name} Mail Center
                </h2>
                <span className="text-neutral-300">·</span>
                <span className="text-xs font-mono font-semibold text-orange-700 truncate">
                  {activeOperator.email}
                </span>
                <button
                  type="button"
                  onClick={handleCopyMailbox}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-white border border-neutral-200 hover:bg-neutral-100 rounded-md text-neutral-700 cursor-pointer"
                  title="Copy active mailbox address"
                >
                  {copiedAddress ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 truncate">
                {viewScope === 'hq_overview'
                  ? `Main HQ All-Branch Mail Console · ${tenants.length} isolated branches under ${currentOrganization.domain}`
                  : `Branch Isolated Mailbox · ${currentTenant.branchCode} (${currentTenant.name})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`mailto:${activeOperator.email}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-xl"
              title="Open external email client"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>External Mail</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200/60 cursor-pointer"
              aria-label="Close Mail Center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {sendStatusBanner && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center justify-between">
            <span>{sendStatusBanner}</span>
            <button
              type="button"
              onClick={() => setSendStatusBanner(null)}
              className="text-emerald-700 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 3-Column Mail Workspace */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
          {/* Left Rail: Compose & Folders */}
          <div className="md:col-span-3 lg:col-span-2 border-b md:border-b-0 md:border-r border-neutral-200 p-3 bg-neutral-50/70 flex flex-col gap-3 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setIsComposing(true);
                setComposeTo('');
                setComposeSubject('');
                setComposeBody('');
              }}
              className="w-full py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Email</span>
            </button>

            <nav className="space-y-1 text-xs">
              {[
                { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadEmailCount },
                { id: 'sent', label: 'Sent', icon: Send, count: emails.filter((e) => e.folder === 'sent').length },
                { id: 'starred', label: 'Starred', icon: Star, count: emails.filter((e) => e.starred).length },
                { id: 'all', label: 'All Mail', icon: MailOpen, count: emails.length },
              ].map((item) => {
                const Icon = item.icon;
                const active = folder === item.id && !isComposing;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFolder(item.id as MailFolder);
                      setIsComposing(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-white text-neutral-900 border border-neutral-200 shadow-2xs'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-orange-600" />
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {viewScope === 'hq_overview' && (
              <div className="pt-3 border-t border-neutral-200 space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500 block px-1">
                  HQ Branch Filter
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-neutral-800"
                >
                  <option value="all">All Tenant Branches ({tenants.length})</option>
                  {tenants.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branchCode} · {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-neutral-200 text-[11px] text-neutral-500 space-y-1 px-1">
              <div className="font-bold text-neutral-700">Tenant Isolation</div>
              <p>
                Directory &amp; mail routing are scoped strictly to{' '}
                <strong className="text-neutral-800">{currentOrganization.name}</strong>.
              </p>
            </div>
          </div>

          {/* Middle Pane: Message List */}
          <div className="md:col-span-4 lg:col-span-4 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col min-h-0">
            <div className="p-3 border-b border-neutral-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subject, sender, ref..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {filteredEmails.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No emails match this view.
                </div>
              ) : (
                filteredEmails.map((em) => {
                  const isSelected = !isComposing && selectedEmail?.id === em.id;
                  return (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => handleSelectEmail(em)}
                      className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/70 border-l-2 border-l-orange-500'
                          : !em.read
                          ? 'bg-white hover:bg-neutral-50'
                          : 'bg-neutral-50/40 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs truncate ${
                            !em.read ? 'font-extrabold text-neutral-900' : 'font-semibold text-neutral-700'
                          }`}
                        >
                          {em.folder === 'sent' ? `To: ${em.to[0] || ''}` : em.fromName}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 shrink-0 tabular-nums">
                          {formatTimestamp(em.timestamp)}
                        </span>
                      </div>

                      <div
                        className={`text-xs mt-1 truncate ${
                          !em.read ? 'font-bold text-neutral-900' : 'font-medium text-neutral-700'
                        }`}
                      >
                        {em.priority === 'urgent' && (
                          <span className="text-red-600 font-bold mr-1">[URGENT]</span>
                        )}
                        {em.subject}
                      </div>

                      <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between gap-2">
                        <span className="truncate">{em.body.replace(/\s+/g, ' ')}</span>
                        {em.starred && <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                      </div>

                      {viewScope === 'hq_overview' && (
                        <div className="text-[10px] font-mono text-neutral-500 mt-1.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-neutral-400" />
                          <span className="truncate">{em.branchName}</span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Reader or Composer */}
          <div className="md:col-span-5 lg:col-span-6 flex flex-col min-h-0 bg-white">
            {isComposing ? (
              <form onSubmit={handleSendSubmit} className="flex-1 flex flex-col min-h-0 p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">New Email Message</h3>
                    <p className="text-[11px] text-neutral-500">
                      Sending from <span className="font-mono font-semibold">{activeOperator.email}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {viewScope === 'hq_overview' && tenants.length > 1 && (
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastAllBranches}
                      onChange={(e) => setBroadcastAllBranches(e.target.checked)}
                      className="rounded text-orange-600 w-4 h-4"
                    />
                    <Megaphone className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>
                      HQ Broadcast: Deliver to all {tenants.length} branches in {currentOrganization.name}
                    </span>
                  </label>
                )}

                {!broadcastAllBranches && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-700">To (comma-separated)</label>
                    <input
                      type="text"
                      required={!broadcastAllBranches}
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder={`e.g. ${tenants[0]?.email || 'supplier@example.com'}`}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {directoryContacts.map((c) => (
                        <button
                          key={c.email}
                          type="button"
                          onClick={() => addRecipientChip(c.email)}
                          className="px-2 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
                        >
                          + {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-neutral-700">Subject</label>
                    <input
                      type="text"
                      required
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="e.g. Stock Requisition Approval / Supplier Order"
                      className="w-full mt-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700">Priority</label>
                    <select
                      value={composePriority}
                      onChange={(e) => setComposePriority(e.target.value as EmailMessage['priority'])}
                      className="w-full mt-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-semibold"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700">Category</label>
                    <select
                      value={composeCategory}
                      onChange={(e) => setComposeCategory(e.target.value as EmailMessage['category'])}
                      className="w-full mt-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-semibold"
                    >
                      <option value="hq_directive">HQ Directive</option>
                      <option value="branch_ops">Branch Operations</option>
                      <option value="supplier">Supplier / Procurement</option>
                      <option value="catering">Catering Event</option>
                      <option value="customer">Customer Service</option>
                      <option value="payroll">HR &amp; Payroll</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-neutral-700">Message</label>
                  <textarea
                    required
                    rows={7}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Write your message..."
                    className="w-full mt-1 flex-1 p-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Draft in External Mail App</span>
                  </a>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-orange-400" />
                    <span>{broadcastAllBranches ? 'Broadcast to All Branches' : 'Send Email'}</span>
                  </button>
                </div>
              </form>
            ) : selectedEmail ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-5 border-b border-neutral-200 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-neutral-500 capitalize">
                        {selectedEmail.category.replace(/_/g, ' ')} · {selectedEmail.branchName}
                        {selectedEmail.relatedRef ? ` · Ref: ${selectedEmail.relatedRef}` : ''}
                      </div>
                      <h3 className="text-base font-bold text-neutral-900 mt-1">
                        {selectedEmail.subject}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleEmailStar(selectedEmail.id, selectedEmail.branchId)}
                        className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 cursor-pointer"
                        title="Toggle Star"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            selectedEmail.starred ? 'text-amber-500 fill-amber-400' : 'text-neutral-400'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => markEmailRead(selectedEmail.id, selectedEmail.branchId, !selectedEmail.read)}
                        className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 cursor-pointer"
                        title={selectedEmail.read ? 'Mark as Unread' : 'Mark as Read'}
                      >
                        <MailOpen className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteEmail(selectedEmail.id, selectedEmail.branchId);
                          setSelectedEmailId(null);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 cursor-pointer"
                        title="Delete Email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-bold text-neutral-900">{selectedEmail.fromName}</span>{' '}
                        <span className="font-mono text-neutral-500">&lt;{selectedEmail.fromEmail}&gt;</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        To: {selectedEmail.to.join(', ')}
                        {selectedEmail.cc && selectedEmail.cc.length > 0
                          ? ` · Cc: ${selectedEmail.cc.join(', ')}`
                          : ''}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500">
                      {new Date(selectedEmail.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-5 overflow-y-auto text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                  {selectedEmail.body}
                </div>

                <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReply(selectedEmail)}
                      className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleForward(selectedEmail)}
                      className="px-3.5 py-2 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Forward className="w-3.5 h-3.5" />
                      <span>Forward</span>
                    </button>
                  </div>

                  <a
                    href={`mailto:${encodeURIComponent(selectedEmail.fromEmail)}?subject=${encodeURIComponent(
                      `Re: ${selectedEmail.subject}`
                    )}`}
                    className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Reply via External Mail</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
                <AlertCircle className="w-8 h-8 text-neutral-300 mb-2" />
                <p className="text-xs font-semibold text-neutral-700">Select an email to read</p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Or click Compose Email to message branches, suppliers, or Main HQ.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
