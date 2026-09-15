import { type ButtonHTMLAttributes, type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight, BookOpen, Check, ChevronRight, CircleAlert, Clipboard, CloudOff,
  FileText, KeyRound, Library, LoaderCircle, Menu, MessageSquareText, Plus,
  Scale, Search, Settings2, ShieldCheck, Sparkles, Upload, X,
} from 'lucide-react';
import {
  getGetDocumentQueryKey, getListChatMessagesQueryKey, getListDocumentsQueryKey,
  getGetOverviewQueryKey, useAnalyzeDocument, useAskDocumentQuestion,
  useCreateDocument, useGetDocument, useGetOverview, useListChatMessages,
  useListDocuments,
} from '@workspace/api-client-react';
import type { ChatMessage, Document } from '@workspace/api-client-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const DISCLAIMER = 'LegalLens provides AI-generated legal information, not professional legal advice. Always consult a licensed attorney.';

function cx(...parts: Array<string | false | null | undefined>) { return parts.filter(Boolean).join(' '); }
function formatDate(value: string | null | undefined) {
  if (!value) return 'Not yet analyzed';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
function useApiKey() {
  const [key, setKey] = useState(() => sessionStorage.getItem('legallens-gemini-key') ?? '');
  useEffect(() => {
    const sync = () => setKey(sessionStorage.getItem('legallens-gemini-key') ?? '');
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return key;
}

function Button({ children, className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' }) {
  return <button {...props} className={cx(
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45',
    variant === 'primary' && 'bg-primary text-primary-foreground shadow-[0_2px_0_hsl(var(--primary)/.28)] hover:-translate-y-0.5 hover:shadow-[0_4px_0_hsl(var(--primary)/.22)]',
    variant === 'outline' && 'border border-border bg-card/70 text-foreground hover:border-primary/50 hover:bg-secondary',
    variant === 'quiet' && 'text-muted-foreground hover:bg-secondary hover:text-foreground',
    className,
  )} />;
}

function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="min-h-[100dvh] bg-background">
    <div className="fixed inset-x-0 top-0 z-50 flex h-8 items-center justify-center bg-primary px-4 text-center text-[11px] tracking-wide text-primary-foreground">
      <span className="hidden sm:inline">{DISCLAIMER}</span><span className="sm:hidden">AI information only · Not legal advice</span>
    </div>
    <div className="mx-auto flex max-w-[1600px] pt-8">
      <aside className={cx('fixed inset-y-8 left-0 z-40 w-[252px] border-r border-border bg-card/90 px-5 py-6 backdrop-blur-xl transition-transform lg:sticky lg:top-8 lg:block lg:h-[calc(100dvh-2rem)] lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3 text-foreground">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Scale size={19} strokeWidth={1.8} /></span>
            <span><span className="block font-serif text-[22px] leading-none">LegalLens</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground">reading room</span></span>
          </Link>
          <button data-testid="button-close-mobile-nav" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary lg:hidden"><X size={18} /></button>
        </div>
        <div className="mt-12">
          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Workspace</p>
          <nav className="space-y-1">
            <NavItem href="/" icon={<Library size={17} />} label="My documents" onClick={() => setMobileOpen(false)} />
            <NavItem href="/settings" icon={<Settings2 size={17} />} label="Privacy & keys" onClick={() => setMobileOpen(false)} />
          </nav>
        </div>
        <div className="absolute bottom-6 left-5 right-5 rounded-xl border border-primary/15 bg-primary/[.06] p-4">
          <ShieldCheck size={18} className="text-primary" />
          <p className="mt-3 text-xs font-semibold">Your reading room is local-first.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Documents stay in your workspace. Your API key is used only for the request.</p>
          <Link href="/settings" data-testid="link-privacy-note" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Review privacy <ArrowUpRight size={12} /></Link>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close menu overlay" data-testid="button-close-overlay" onClick={() => setMobileOpen(false)} className="fixed inset-8 z-30 bg-foreground/10 backdrop-blur-[2px] lg:hidden" />}
      <main className="min-w-0 flex-1">
        <header className="sticky top-8 z-20 flex h-16 items-center justify-between border-b border-border bg-background/85 px-5 backdrop-blur-xl sm:px-8 lg:px-12">
          <button data-testid="button-open-mobile-nav" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"><Menu size={20} /></button>
          <div className="hidden text-xs text-muted-foreground sm:block">Private workspace <span className="mx-2 text-border">/</span> <span className="font-mono text-[10px]">NO CLOUD STORAGE</span></div>
          <Link href="/settings" data-testid="link-header-settings" className="ml-auto flex items-center gap-2 rounded-lg px-2.5 py-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"><span className="grid size-7 place-items-center rounded-full bg-secondary"><Settings2 size={14} /></span><span className="hidden text-sm sm:inline">Settings</span></Link>
        </header>
        <div className="px-5 py-8 sm:px-8 lg:px-12">{children}</div>
      </main>
    </div>
  </div>;
}

function NavItem({ href, icon, label, onClick }: { href: string; icon: ReactNode; label: string; onClick: () => void }) {
  const [location] = useLocation();
  const active = href === '/' ? location === '/' : location.startsWith(href);
  return <Link href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={onClick} className={cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition', active ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground')}>{icon}<span>{label}</span>{active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}</Link>;
}

function Stat({ label, value, note, accent }: { label: string; value: string | number; note: string; accent?: boolean }) {
  return <div className="border-l border-border pl-4">
    <p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">{label}</p>
    <p className={cx('mt-2 font-serif text-3xl', accent && 'text-destructive')}>{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{note}</p>
  </div>;
}

function Skeleton({ className = '' }: { className?: string }) { return <div className={cx('animate-pulse-soft rounded bg-secondary', className)} />; }

function EmptyDocuments({ onAdd }: { onAdd: () => void }) {
  return <div className="paper-grid rounded-2xl border border-dashed border-primary/25 px-6 py-16 text-center">
    <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-card text-primary"><FileText size={25} /></div>
    <h2 className="mt-5 font-serif text-2xl">Your reading room is ready.</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Bring a contract here to get a plain-language orientation, a careful risk review, and a place to ask grounded questions.</p>
    <Button data-testid="button-empty-add-document" onClick={onAdd} className="mt-6"><Plus size={16} /> Add your first contract</Button>
  </div>;
}

function Intake({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const create = useCreateDocument();
  const [, setLocation] = useLocation();
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setTitle(title || file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => setSourceText(String(reader.result ?? ''));
    reader.readAsText(file);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !sourceText.trim()) return;
    create.mutate({ data: { title: title.trim(), sourceText: sourceText.trim(), fileName: fileName || null } }, {
      onSuccess: (doc) => { queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetOverviewQueryKey() }); setLocation(`/documents/${doc.id}`); onClose(); },
    });
  };
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-6">
    <div role="dialog" aria-modal="true" className="animate-rise max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
      <div className="flex items-start justify-between border-b border-border px-6 py-5 sm:px-8">
        <div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">New document</p><h2 className="mt-1 font-serif text-2xl">Open a contract</h2><p className="mt-1 text-sm text-muted-foreground">Text stays in your browser until you choose to analyze it.</p></div>
        <button data-testid="button-close-intake" aria-label="Close intake" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="space-y-5 px-6 py-6 sm:px-8">
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document name</span><input data-testid="input-document-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Apartment lease — 2025" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/60" /></label>
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          <button type="button" data-testid="button-mode-paste" onClick={() => setMode('paste')} className={cx('flex-1 rounded-md py-2 text-sm font-semibold', mode === 'paste' ? 'bg-card shadow-sm' : 'text-muted-foreground')}>Paste text</button>
          <button type="button" data-testid="button-mode-file" onClick={() => setMode('file')} className={cx('flex-1 rounded-md py-2 text-sm font-semibold', mode === 'file' ? 'bg-card shadow-sm' : 'text-muted-foreground')}>Text file</button>
        </div>
        {mode === 'paste' ? <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contract text</span><textarea data-testid="textarea-source-text" value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste the full text of your contract here…" rows={10} className="w-full resize-y rounded-lg border border-input bg-background p-3 text-sm leading-relaxed placeholder:text-muted-foreground/60" /></label> :
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[.035] p-6 text-center hover:bg-primary/[.07]"><Upload size={22} className="text-primary" /><span className="mt-3 text-sm font-semibold">{fileName || 'Choose a .txt file'}</span><span className="mt-1 text-xs text-muted-foreground">Read locally in your browser</span><input data-testid="input-text-file" type="file" accept=".txt,text/plain" onChange={onFile} className="sr-only" /></label>}
        {create.isError && <p data-testid="status-create-error" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">We could not create that document. Please try again.</p>}
        <div className="flex justify-end gap-3 pt-1"><Button type="button" variant="quiet" data-testid="button-cancel-intake" onClick={onClose}>Cancel</Button><Button data-testid="button-create-document" type="submit" disabled={create.isPending || !title.trim() || !sourceText.trim()}>{create.isPending ? <><LoaderCircle size={16} className="animate-spin" /> Saving…</> : <><BookOpen size={16} /> Open document</>}</Button></div>
      </form>
    </div>
  </div>;
}

function Dashboard() {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const documents = useListDocuments();
  const overview = useGetOverview();
  const list = documents.data ?? [];
  return <Shell><div className="mx-auto max-w-[1240px]">
    <div className="animate-rise flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end">
      <div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Tuesday, your workspace</p><h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">Read the fine print<br /><span className="text-primary">with both eyes open.</span></h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">A quiet place to understand what your contracts say, what they might mean, and what deserves a second look from a lawyer.</p></div>
      <Button data-testid="button-add-document" onClick={() => setIntakeOpen(true)} className="self-start sm:self-auto"><Plus size={17} /> Add contract</Button>
    </div>
    <section className="grid gap-5 border-b border-border py-7 sm:grid-cols-3">
      {overview.isLoading ? <><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></> : <>
        <Stat label="Documents" value={overview.data?.documentCount ?? 0} note="in your reading room" />
        <Stat label="Oriented" value={overview.data?.analyzedCount ?? 0} note="with plain-language notes" />
        <Stat label="Open risks" value={overview.data?.openRiskCount ?? 0} note="worth a closer look" accent />
      </>}
    </section>
    <section className="mt-9">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-serif text-2xl">Recent documents</h2><p className="mt-1 text-sm text-muted-foreground">Your latest contract work, kept in one place.</p></div><span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{list.length} total</span></div>
      {documents.isLoading ? <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}</div> : documents.isError ? <div className="rounded-xl border border-destructive/25 bg-destructive/[.05] p-6"><CircleAlert size={20} className="text-destructive" /><p className="mt-3 font-semibold">Documents could not be loaded.</p><p className="mt-1 text-sm text-muted-foreground">Check your connection and give it another try.</p><Button variant="outline" data-testid="button-retry-documents" onClick={() => documents.refetch()} className="mt-4">Retry</Button></div> : list.length === 0 ? <EmptyDocuments onAdd={() => setIntakeOpen(true)} /> :
        <div className="overflow-hidden rounded-xl border border-border bg-card/55">{list.map((doc, index) => <DocumentRow key={doc.id} doc={doc} index={index} />)}</div>}
    </section>
    <div className="mt-10 grid gap-5 md:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl bg-primary p-6 text-primary-foreground"><div className="flex items-center justify-between"><Sparkles size={20} /><span className="font-mono text-[10px] uppercase tracking-widest opacity-70">A gentle reminder</span></div><p className="mt-8 max-w-sm font-serif text-2xl leading-tight">Clarity is useful. Certainty belongs to a licensed attorney.</p><p className="mt-3 max-w-md text-xs leading-relaxed opacity-75">LegalLens helps you prepare better questions and spot language worth discussing. It never replaces legal counsel.</p></div>
      <div className="paper-grid rounded-2xl border border-border p-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary">How this works</p><div className="mt-6 grid gap-5 sm:grid-cols-3">{[['01','Bring it in','Paste or upload a text file.'],['02','See the evidence','Read notes with their source in view.'],['03','Ask carefully','Get grounded answers about the text.']].map(([n,t,d]) => <div key={n}><span className="font-mono text-xs text-muted-foreground">{n}</span><h3 className="mt-2 text-sm font-semibold">{t}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</p></div>)}</div></div>
    </div>
    <Intake open={intakeOpen} onClose={() => setIntakeOpen(false)} />
  </div></Shell>;
}

function DocumentRow({ doc, index }: { doc: Document; index: number }) {
  return <Link href={`/documents/${doc.id}`} data-testid={`link-document-${doc.id}`} className="group flex items-center gap-4 border-b border-border px-4 py-4 transition last:border-0 hover:bg-secondary/65 sm:px-5">
    <span className="hidden w-7 font-mono text-[10px] text-muted-foreground sm:block">{String(index + 1).padStart(2, '0')}</span><span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-background text-primary"><FileText size={18} /></span><span className="min-w-0 flex-1"><span data-testid={`text-document-title-${doc.id}`} className="block truncate text-sm font-semibold">{doc.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{doc.fileName || 'Pasted contract'} <span className="mx-1">·</span> Added {formatDate(doc.createdAt)}</span></span><span className="hidden items-center gap-3 sm:flex"><StatusPill status={doc.status} /><span className={cx('font-mono text-xs', doc.riskCount > 0 ? 'text-destructive' : 'text-muted-foreground')}>{doc.status === 'ready' ? `${doc.riskCount} ${doc.riskCount === 1 ? 'risk' : 'risks'}` : 'Not reviewed'}</span></span><ChevronRight size={17} className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
  </Link>;
}

function StatusPill({ status }: { status: Document['status'] }) {
  const config = { ready: ['Analyzed', 'bg-primary/10 text-primary'], analyzing: ['Analyzing', 'bg-accent/25 text-foreground'], draft: ['Needs review', 'bg-secondary text-muted-foreground'] }[status];
  return <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide', config[1])}>{status === 'analyzing' && <LoaderCircle size={11} className="mr-1 inline animate-spin" />}{config[0]}</span>;
}

function Workspace() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const doc = useGetDocument(documentId, { query: { queryKey: getGetDocumentQueryKey(documentId) } });
  const chat = useListChatMessages(documentId, { query: { queryKey: getListChatMessagesQueryKey(documentId) } });
  const apiKey = useApiKey();
  const analyze = useAnalyzeDocument();
  const ask = useAskDocumentQuestion();
  const [question, setQuestion] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'risks' | 'chat'>('summary');
  const [model, setModel] = useState('gemini-2.0-flash');
  const messages = chat.data ?? [];
  const document = doc.data;
  const promptSuggestions = ['What can end this agreement?', 'Where could costs change?', 'What should I ask a lawyer?'];
  const runAnalysis = () => { if (!apiKey || !document) return; analyze.mutate({ documentId, data: { apiKey, model } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(documentId) }); queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetOverviewQueryKey() }); } }); };
  const askQuestion = (event: FormEvent) => { event.preventDefault(); const q = question.trim(); if (!q || !apiKey) return; setQuestion(''); ask.mutate({ documentId, data: { apiKey, question: q, model } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey(documentId) }) }); };
  if (doc.isLoading) return <Shell><div className="mx-auto max-w-[1240px] space-y-6"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-1/3" /><div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><Skeleton className="h-[520px]" /><Skeleton className="h-[520px]" /></div></div></Shell>;
  if (doc.isError || !document) return <Shell><div className="mx-auto max-w-xl py-20 text-center"><CircleAlert size={28} className="mx-auto text-destructive" /><h1 className="mt-4 font-serif text-3xl">This document is out of reach.</h1><p className="mt-2 text-sm text-muted-foreground">It may have been removed or the workspace is temporarily unavailable.</p><Link href="/" data-testid="link-back-documents" className="mt-6 inline-flex text-sm font-semibold text-primary hover:underline">Back to documents</Link></div></Shell>;
  return <Shell><div className="mx-auto max-w-[1240px]">
    <div className="animate-rise flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><Link href="/" data-testid="link-back-to-library" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"><ChevronRight size={14} className="rotate-180" /> All documents</Link><div className="flex items-center gap-3"><h1 data-testid="text-workspace-title" className="truncate font-serif text-3xl sm:text-4xl">{document.title}</h1><StatusPill status={document.status} /></div><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><FileText size={14} /> {document.fileName || 'Pasted contract'} <span>·</span> {document.sourceText.split(/\s+/).filter(Boolean).length.toLocaleString()} words</p></div><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Updated {formatDate(document.analyzedAt || document.createdAt)}</div></div>
    {document.status !== 'ready' && <div className="mt-6 flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/[.045] p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-primary" /> Ready for a careful first pass?</div><p className="mt-1 text-sm text-muted-foreground">Analysis uses your Gemini key for this request and is not stored by LegalLens.</p></div><Button data-testid="button-analyze-document" onClick={runAnalysis} disabled={!apiKey || analyze.isPending}>{analyze.isPending ? <><LoaderCircle size={16} className="animate-spin" /> Reading…</> : <><Sparkles size={16} /> Analyze contract</>}</Button></div>}
    {!apiKey && <div className="mt-4 flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/15 px-4 py-3 text-sm"><KeyRound size={16} className="shrink-0" /><span><strong>Connect your key to analyze.</strong> Your Gemini key stays in this browser and is sent only with your request.</span><Link href="/settings" data-testid="link-connect-key" className="ml-auto shrink-0 font-semibold text-primary hover:underline">Set up <ArrowUpRight size={13} className="inline" /></Link></div>}
    {analyze.isError && <p data-testid="status-analysis-error" className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">Analysis could not be completed. Check your key and try again.</p>}
     <div className="mt-7">
       <div role="tablist" aria-label="Document analysis" className="mb-5 flex w-full flex-wrap items-center gap-1 rounded-lg bg-secondary p-1 sm:w-fit">
         <button role="tab" aria-selected={activeTab === 'summary'} data-testid="button-tab-summary" onClick={() => setActiveTab('summary')} className={cx('rounded-md px-4 py-2 text-sm font-semibold', activeTab === 'summary' ? 'bg-card shadow-sm' : 'text-muted-foreground')}>TL;DR Summary</button>
         <button role="tab" aria-selected={activeTab === 'risks'} data-testid="button-tab-risks" onClick={() => setActiveTab('risks')} className={cx('rounded-md px-4 py-2 text-sm font-semibold', activeTab === 'risks' ? 'bg-card shadow-sm' : 'text-muted-foreground')}>Red Flags & Risks</button>
         <button role="tab" aria-selected={activeTab === 'chat'} data-testid="button-tab-chat" onClick={() => setActiveTab('chat')} className={cx('rounded-md px-4 py-2 text-sm font-semibold', activeTab === 'chat' ? 'bg-card shadow-sm' : 'text-muted-foreground')}>Q&A Chat</button>
       </div>
       {activeTab === 'summary' && <div className="grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]"><section className="min-w-0"><SummaryCard document={document} /><details className="mt-6 rounded-xl border border-border bg-card p-5"><summary className="cursor-pointer list-none font-semibold">View source text</summary><SourceText text={document.sourceText} /></details></section><aside className="min-w-0"><ChatPanel messages={messages} question={question} setQuestion={setQuestion} suggestions={promptSuggestions} onAsk={askQuestion} loading={ask.isPending} disabled={!apiKey || document.status !== 'ready'} /></aside></div>}
       {activeTab === 'risks' && <RiskReview risks={document.risks} status={document.status} />}
       {activeTab === 'chat' && <ChatPanel messages={messages} question={question} setQuestion={setQuestion} suggestions={promptSuggestions} onAsk={askQuestion} loading={ask.isPending} disabled={!apiKey || document.status !== 'ready'} />}
     </div>
  </div></Shell>;
}

function SummaryCard({ document }: { document: Document }) {
  return <div className="rounded-xl border border-border bg-card p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Plain-language orientation</p><h2 className="mt-2 font-serif text-2xl">The short version</h2></div><span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"><BookOpen size={17} /></span></div>{document.summary ? <p data-testid="text-document-summary" className="prose-legal mt-6 max-w-2xl text-[15px] text-foreground/80">{document.summary}</p> : <div className="mt-6 rounded-lg bg-secondary/60 p-5 text-sm text-muted-foreground">This document has not been analyzed yet. Run an analysis to see a plain-language orientation.</div>}<div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Check size={14} className="text-primary" /> Grounded in document text</span><span className="flex items-center gap-1.5"><CloudOff size={14} className="text-primary" /> No document library sharing</span></div></div>;
}

function RiskReview({ risks, status }: { risks: Document['risks']; status: Document['status'] }) {
  return <div className="rounded-xl border border-border bg-card p-6 sm:p-7"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Evidence-first review</p><h2 className="mt-2 font-serif text-2xl">What deserves a closer look</h2></div>{status === 'ready' && <span data-testid="text-risk-count" className={cx('font-mono text-2xl', risks.length ? 'text-destructive' : 'text-primary')}>{String(risks.length).padStart(2, '0')}</span>}</div>{status !== 'ready' ? <div className="mt-6 flex gap-3 rounded-lg bg-secondary/65 p-4 text-sm text-muted-foreground"><Search size={18} className="mt-0.5 shrink-0" /><span>Risk review appears after analysis. We will show the concern and the relevant context, not a confidence score.</span></div> : risks.length === 0 ? <div className="mt-6 flex gap-3 rounded-lg bg-primary/[.07] p-4 text-sm text-muted-foreground"><Check size={18} className="mt-0.5 shrink-0 text-primary" /><span>No potential risk markers were returned in this first pass. That is not a guarantee that the contract is safe.</span></div> : <div className="mt-6 space-y-3">{risks.map((risk) => <div key={`${risk.title}-${risk.excerpt ?? ''}`} className="rounded-lg border border-border p-4"><div className="flex items-start gap-3"><span className={cx('mt-1 size-2.5 shrink-0 rounded-full', risk.severity === 'high' ? 'bg-destructive' : risk.severity === 'medium' ? 'bg-accent' : 'bg-primary')} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{risk.title}</p><span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{risk.severity} attention</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{risk.explanation}</p>{risk.excerpt && <blockquote className="mt-3 border-l-2 border-primary/30 pl-3 text-xs italic leading-relaxed text-foreground/65">“{risk.excerpt}”</blockquote>}</div></div></div>)}</div>}<p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">Risk framing is a starting point for your questions, not a legal conclusion. Review the highlighted language in the source and consult counsel.</p></div>;
}

function SourceText({ text }: { text: string }) {
  const sections = text.split(/\n{2,}/).filter(Boolean);
  return <div className="rounded-xl border border-border bg-card p-6 sm:p-8"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Document provenance</p><h2 className="mt-2 font-serif text-2xl">Source text</h2></div><Clipboard size={17} className="text-muted-foreground" /></div><div className="prose-legal mt-7 font-serif text-[15px] text-foreground/80">{sections.map((section, index) => <p key={index}><span className="mr-3 select-none font-mono text-[10px] text-muted-foreground/70">{String(index + 1).padStart(2, '0')}</span>{section}</p>)}</div></div>;
}

function ChatPanel({ messages, question, setQuestion, suggestions, onAsk, loading, disabled }: { messages: ChatMessage[]; question: string; setQuestion: (v: string) => void; suggestions: string[]; onAsk: (e: FormEvent) => void; loading: boolean; disabled: boolean }) {
  return <div className="flex min-h-[500px] flex-col rounded-xl border border-border bg-card"><div className="border-b border-border px-5 py-5"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary"><MessageSquareText size={17} /></span><div><h2 className="font-serif text-xl">Ask about this contract</h2><p className="text-[11px] text-muted-foreground">Answers point back to the text.</p></div></div></div><div className="flex-1 space-y-4 overflow-y-auto p-5">{messages.length === 0 && <div className="py-8 text-center"><div className="mx-auto grid size-10 place-items-center rounded-full bg-secondary text-primary"><MessageSquareText size={18} /></div><p className="mt-4 text-sm font-semibold">Start with a grounded question.</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Try asking about ending the agreement, money, or a phrase that feels unclear.</p><div className="mt-5 space-y-2">{suggestions.map((s) => <button key={s} type="button" data-testid={`button-suggestion-${s.slice(0,8).replaceAll(' ','-')}`} disabled={disabled} onClick={() => setQuestion(s)} className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50">{s}<ArrowUpRight size={13} className="float-right mt-0.5" /></button>)}</div></div>}{messages.map((message) => <div key={message.id} data-testid={`message-${message.id}`} className={cx('max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed', message.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary text-foreground')}>{message.content}</div>)}{loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle size={14} className="animate-spin" /> Reading the relevant passages…</div>}</div><form onSubmit={onAsk} className="border-t border-border p-4"><div className="flex items-end gap-2 rounded-lg border border-input bg-background p-2 focus-within:border-primary"><textarea data-testid="textarea-chat-question" value={question} onChange={(e) => setQuestion(e.target.value)} disabled={disabled || loading} rows={2} placeholder={disabled ? 'Add your API key to ask a question' : 'Ask a question about the contract…'} className="min-h-10 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/60" /><button data-testid="button-ask-question" disabled={disabled || loading || !question.trim()} aria-label="Ask question" className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"><ArrowUpRight size={17} /></button></div><p className="mt-2 text-[10px] text-muted-foreground">Do not include sensitive personal details in questions.</p></form></div>;
}

function Settings() {
  const [key, setKey] = useState(() => sessionStorage.getItem('legallens-gemini-key') ?? '');
  const [draft, setDraft] = useState(key);
  const [saved, setSaved] = useState(false);
  const save = (event: FormEvent) => { event.preventDefault(); sessionStorage.setItem('legallens-gemini-key', draft.trim()); setKey(draft.trim()); setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  const clear = () => { sessionStorage.removeItem('legallens-gemini-key'); setKey(''); setDraft(''); };
  return <Shell><div className="mx-auto max-w-[900px]"><div className="animate-rise border-b border-border pb-8"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Workspace settings</p><h1 className="mt-3 font-serif text-4xl">Privacy, by design.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">LegalLens is a reading aid, not a document vault. Keep control of the model connection and understand what leaves your browser.</p></div><div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-xl border border-border bg-card p-6 sm:p-8"><div className="flex items-start gap-4"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><KeyRound size={19} /></span><div><h2 className="font-serif text-2xl">Bring your own key</h2><p className="mt-1 text-sm text-muted-foreground">Connect a Gemini API key when you want analysis or Q&A.</p></div></div><form onSubmit={save} className="mt-8"><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gemini API key</label><div className="mt-2 flex gap-2"><input data-testid="input-api-key" type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="AIza…" className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm" /><Button data-testid="button-save-api-key" type="submit" disabled={!draft.trim()}>{saved ? <><Check size={16} /> Saved</> : 'Save key'}</Button></div></form>{key && <div className="mt-5 flex items-center justify-between rounded-lg bg-primary/[.07] px-3 py-2.5 text-xs"><span className="flex items-center gap-2 text-primary"><Check size={14} /> Key saved in this session only</span><button data-testid="button-clear-api-key" onClick={clear} className="font-semibold text-muted-foreground underline hover:text-foreground">Remove</button></div>}<div className="mt-8 space-y-3 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground"><p className="flex gap-3"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" /><span>Your key is stored in session storage and cleared when this browser session ends. LegalLens does not store, share, or display it after you save it.</span></p><p className="flex gap-3"><CloudOff size={15} className="mt-0.5 shrink-0 text-primary" /><span>When you analyze or ask a question, the key and request are sent to the workspace server to call Gemini. Clear it any time.</span></p></div></section><aside className="space-y-4"><div className="paper-grid rounded-xl border border-border p-6"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">A note on privacy</p><h3 className="mt-3 font-serif text-xl">Keep the sensitive bits out.</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Redact account numbers, addresses, signatures, and other personal details before pasting. A good analysis starts with a careful input.</p></div><div className="rounded-xl border border-border bg-secondary/50 p-6"><p className="text-sm font-semibold">What LegalLens is for</p><ul className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground"><li className="flex gap-2"><span className="text-primary">—</span> Finding language worth a second look</li><li className="flex gap-2"><span className="text-primary">—</span> Preparing focused questions for counsel</li><li className="flex gap-2"><span className="text-primary">—</span> Building a plain-language orientation</li></ul></div></aside></div></div></Shell>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Dashboard} /><Route path="/documents/:documentId" component={Workspace} /><Route path="/settings" component={Settings} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></QueryClientProvider>;
}

export default App;