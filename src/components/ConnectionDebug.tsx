
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { CheckCircleIcon, XMarkIcon, ArrowPathIcon, DocumentTextIcon } from './icons/Icons';

interface ConnectionDebugProps {
  isOpen: boolean;
  onClose: () => void;
}

type CheckStatus = 'idle' | 'loading' | 'success' | 'error';

const ConnectionDebug: React.FC<ConnectionDebugProps> = ({ isOpen, onClose }) => {
  const [checks, setChecks] = useState<{
    auth: CheckStatus;
    profiles: CheckStatus;
    projects: CheckStatus;
  }>({ auth: 'idle', profiles: 'idle', projects: 'idle' });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [sqlNeeded, setSqlNeeded] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runDiagnostics = async () => {
    setChecks({ auth: 'loading', profiles: 'idle', projects: 'idle' });
    setLogs([]);
    setSqlNeeded(false);
    
    addLog("Starting system diagnostic...");

    // 1. Check Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        setChecks(prev => ({ ...prev, auth: 'success' }));
        addLog(`Authenticated as: ${session.user.email}`);
    } else {
        setChecks(prev => ({ ...prev, auth: 'error' }));
        addLog("Error: No active session found. Please log in.");
        return;
    }

    // 2. Check Profiles (Read Access)
    setChecks(prev => ({ ...prev, profiles: 'loading' }));
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').limit(1);
    
    if (profileError) {
        setChecks(prev => ({ ...prev, profiles: 'error' }));
        addLog(`Profiles Table Error: ${profileError.message}`);
        if (profileError.code === '42P01') addLog("CRITICAL: 'profiles' table does not exist.");
        else addLog("CRITICAL: RLS Policy likely blocking access.");
        setSqlNeeded(true);
    } else {
        setChecks(prev => ({ ...prev, profiles: 'success' }));
        addLog(`Profiles Table: Accessible (${profileData.length} rows found)`);
        if (profileData.length === 0) addLog("Warning: Profiles table is empty.");
    }

    // 3. Check Projects (Read Access)
    setChecks(prev => ({ ...prev, projects: 'loading' }));
    const { data: projectData, error: projectError } = await supabase.from('projects').select('*').limit(1);

    if (projectError) {
        setChecks(prev => ({ ...prev, projects: 'error' }));
        addLog(`Projects Table Error: ${projectError.message}`);
        setSqlNeeded(true);
    } else {
        setChecks(prev => ({ ...prev, projects: 'success' }));
        addLog(`Projects Table: Accessible (${projectData.length} rows found)`);
    }
    
    addLog("Diagnostic complete.");
  };

  useEffect(() => {
    if (isOpen) runDiagnostics();
  }, [isOpen]);

  const StatusIcon = ({ status }: { status: CheckStatus }) => {
    if (status === 'loading') return <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>;
    if (status === 'success') return <CheckCircleIcon className="h-5 w-5 text-emerald-400" />;
    if (status === 'error') return <XMarkIcon className="h-5 w-5 text-red-400" />;
    return <div className="h-5 w-5 rounded-full border-2 border-slate-700"></div>;
  };

  const sqlFix = `
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX PERMISSIONS

-- 1. Create Tables if missing
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'collaborator'
);

create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  client text,
  deadline date,
  status text,
  category text,
  budget numeric
);

create table if not exists public.subtasks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id uuid references public.projects on delete cascade not null,
  name text not null,
  status text default 'Not Started',
  assigned_to text,
  deadline date,
  position integer default 0
);

create table if not exists public.skills (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text,
  status text,
  deadline date
);

create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  description text not null,
  amount numeric not null,
  type text not null,
  date date
);

-- 2. ENABLE ROW LEVEL SECURITY
alter table profiles enable row level security;
alter table projects enable row level security;
alter table subtasks enable row level security;
alter table skills enable row level security;
alter table transactions enable row level security;

-- 3. PERMISSIVE POLICIES (Fixes "No Data" issue)
-- WARNING: This allows any logged-in user to read/write all data. 
-- Ideal for a single-user or small trusted team.

create policy "Enable all access for authenticated users" on profiles for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on projects for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on subtasks for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on skills for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on transactions for all using (auth.role() = 'authenticated');
`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="System Diagnostics">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-xl p-5 border border-white/10">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Connection Status</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-slate-300">Authentication</span>
                        <StatusIcon status={checks.auth} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-slate-300">Profiles Table</span>
                        <StatusIcon status={checks.profiles} />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-slate-300">Projects Table</span>
                        <StatusIcon status={checks.projects} />
                    </div>
                </div>
                <button onClick={runDiagnostics} className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center">
                    <ArrowPathIcon className="h-4 w-4 mr-2" /> Re-run Test
                </button>
            </div>
            <div className="bg-slate-950 rounded-xl p-5 border border-white/10 font-mono text-xs h-64 overflow-y-auto custom-scrollbar">
                <h3 className="text-slate-500 font-bold mb-2">System Logs</h3>
                {logs.length === 0 && <span className="text-slate-700 italic">Waiting to start...</span>}
                {logs.map((log, i) => (
                    <div key={i} className={`mb-1 ${log.includes("Error") || log.includes("CRITICAL") ? 'text-red-400' : 'text-emerald-500'}`}>
                        {log}
                    </div>
                ))}
            </div>
        </div>

        {sqlNeeded && (
            <div className="animate-fade-in-up">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg mb-4">
                    <p className="text-amber-200 text-sm font-medium flex items-center">
                        <DocumentTextIcon className="h-5 w-5 mr-2" />
                        Database Setup Required
                    </p>
                    <p className="text-amber-400/80 text-xs mt-1 ml-7">
                        Your app cannot see data because the tables don't exist or permission is denied. 
                        Run the code below in your Supabase SQL Editor to fix it immediately.
                    </p>
                </div>
                <div className="relative">
                    <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-300 overflow-x-auto border border-white/10 h-48 custom-scrollbar">
                        {sqlFix}
                    </pre>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(sqlFix); alert("SQL Copied! Paste this into Supabase SQL Editor."); }}
                        className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded shadow-lg"
                    >
                        Copy SQL
                    </button>
                </div>
            </div>
        )}
      </div>
    </Modal>
  );
};

export default ConnectionDebug;
