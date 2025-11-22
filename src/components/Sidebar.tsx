
import React from 'react';
import { View } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { BriefcaseIcon, CodeIcon, ChartBarIcon, DocumentTextIcon, CheckCircleIcon, LogoutIcon, UserGroupIcon, LockClosedIcon } from './icons/Icons';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const { signOut, isAdmin } = useAuth();

  const navItems = [
    { view: View.Projects, label: 'Projects', icon: <BriefcaseIcon className="h-5 w-5" />, allowed: true },
    { view: View.Skills, label: 'Skills', icon: <CodeIcon className="h-5 w-5" />, allowed: isAdmin },
    { view: View.Finances, label: 'Finances', icon: <ChartBarIcon className="h-5 w-5" />, allowed: isAdmin },
    { view: View.Team, label: 'Team', icon: <UserGroupIcon className="h-5 w-5" />, allowed: isAdmin },
    { view: View.Todos, label: 'To-Do List', icon: <CheckCircleIcon className="h-5 w-5" />, allowed: true },
  ];

  const handleAdminOverride = async () => {
    const code = window.prompt("Enter Admin Access Code:");
    if (code === "admin123") {
        // 1. Set local storage to unlock UI immediately
        window.localStorage.setItem('voice_dashboard_admin_override', 'true');
        
        // 2. Attempt to permanently fix the database
        try {
             const { data: { user } } = await supabase.auth.getUser();
             if (user) {
                 await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
             }
        } catch (e) {
            console.error("Could not auto-update profile:", e);
        }

        window.location.reload();
    } else if (code) {
        alert("Incorrect code.");
    }
  };

  return (
    <div className="w-20 hover:w-72 transition-all duration-300 ease-out bg-slate-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col group overflow-hidden z-20 shadow-2xl h-full">
      <div className="p-5 flex items-center space-x-4 h-20 border-b border-white/5">
        <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
             <DocumentTextIcon className="h-6 w-6 text-white"/>
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Freelance OS
        </h1>
      </div>
      
      <nav className="flex-1 p-3 space-y-2 mt-4">
        {navItems.filter(item => item.allowed).map((item) => {
          const isActive = activeView === item.view;
          return (
            <li key={item.view} className="list-none">
              <button
                onClick={() => setActiveView(item.view)}
                className={`w-full flex items-center space-x-4 p-3.5 rounded-xl text-left transition-all duration-200 group/btn relative overflow-hidden ${
                  isActive
                    ? 'bg-white/10 text-white shadow-lg shadow-indigo-500/10 border border-white/5'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white hover:border hover:border-white/5 border border-transparent'
                }`}
              >
                {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>
                )}
                <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover/btn:text-slate-200'}`}>
                    {item.icon}
                </div>
                <span className={`font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap ${isActive ? 'text-white' : ''}`}>
                    {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/5 space-y-1">
         {!isAdmin && (
            <button
                onClick={handleAdminOverride}
                className="w-full flex items-center space-x-4 p-3.5 rounded-xl text-left transition-all duration-200 text-slate-500 hover:bg-white/5 hover:text-indigo-400 border border-transparent"
                title="Claim Admin Access"
            >
                <div className="flex-shrink-0">
                    <LockClosedIcon className="h-5 w-5" />
                </div>
                <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap">
                    Admin Access
                </span>
            </button>
         )}
        <button
            onClick={signOut}
            className="w-full flex items-center space-x-4 p-3.5 rounded-xl text-left transition-all duration-200 text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20"
        >
            <div className="flex-shrink-0">
                <LogoutIcon className="h-5 w-5" />
            </div>
            <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap">
                Sign Out
            </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
