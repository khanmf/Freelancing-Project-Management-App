
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ProjectsView from './components/ProjectsView';
import SkillsView from './components/SkillsView';
import FinancesView from './components/FinancesView';
import TodosView from './components/TodosView';
import TeamView from './components/TeamView';
import VoiceAssistant from './components/VoiceAssistant';
import Login from './components/Login';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { View } from './types';
import { CodeIcon, ChartBarIcon, BriefcaseIcon, CheckCircleIcon, UserGroupIcon, ArrowPathIcon } from './components/icons/Icons';

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.Projects);
  const { user, loading, isAdmin } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Reset view if access is revoked
  React.useEffect(() => {
    if (!loading && !isAdmin && (activeView === View.Finances || activeView === View.Skills || activeView === View.Team)) {
        setActiveView(View.Projects);
    }
  }, [isAdmin, activeView, loading]);

  const handleManualRefresh = () => {
      setRefreshKey(prev => prev + 1);
  };

  if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-4">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
             <p className="text-slate-400 text-sm animate-pulse">Loading your workspace...</p>
        </div>
      );
  }

  if (!user) {
    return <Login />;
  }

  // Key prop forces re-render of components when refresh button is clicked
  const renderView = () => {
    switch (activeView) {
      case View.Projects:
        return <ProjectsView key={refreshKey} />;
      case View.Skills:
        return isAdmin ? <SkillsView key={refreshKey} /> : <div className="p-8 text-center text-slate-400 border-2 border-dashed border-white/10 rounded-2xl">Access Restricted: Admin Only</div>;
      case View.Finances:
        return isAdmin ? <FinancesView key={refreshKey} /> : <div className="p-8 text-center text-slate-400 border-2 border-dashed border-white/10 rounded-2xl">Access Restricted: Admin Only</div>;
      case View.Team:
        return isAdmin ? <TeamView key={refreshKey} /> : <div className="p-8 text-center text-slate-400 border-2 border-dashed border-white/10 rounded-2xl">Access Restricted: Admin Only</div>;
      case View.Todos:
        return <TodosView key={refreshKey} />;
      default:
        return <ProjectsView key={refreshKey} />;
    }
  };

  const getHeader = () => {
    switch (activeView) {
      case View.Projects:
        return { title: "Client Projects", subtitle: "Track and manage your ongoing client work.", icon: <BriefcaseIcon className="h-7 w-7 text-indigo-400" /> };
      case View.Skills:
        return { title: "Skill Development", subtitle: "Plan and monitor your learning journey.", icon: <CodeIcon className="h-7 w-7 text-violet-400" /> };
      case View.Finances:
        return { title: "Financial Hub", subtitle: "Oversee your monthly income and expenses.", icon: <ChartBarIcon className="h-7 w-7 text-emerald-400" /> };
      case View.Team:
        return { title: "Team Overview", subtitle: "Review tasks and workload per team member.", icon: <UserGroupIcon className="h-7 w-7 text-pink-400" /> };
      case View.Todos:
        return { title: "To-Do List", subtitle: "Organize and prioritize your daily tasks.", icon: <CheckCircleIcon className="h-7 w-7 text-amber-400" /> };
      default:
        return { title: "Dashboard", subtitle: "Welcome to your freelance command center." };
    }
  };
  
  const { title, subtitle, icon } = getHeader();

  return (
    <div className="flex h-screen font-sans overflow-hidden selection:bg-indigo-500/30">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto relative scroll-smooth bg-slate-950">
        <header className="mb-10 fade-in flex justify-between items-start">
          <div className="flex items-center space-x-5">
            <div className="glass-panel p-3.5 rounded-2xl shadow-lg shadow-indigo-500/10">
              {icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
              <p className="text-slate-400 mt-1 text-lg">{subtitle}</p>
            </div>
          </div>
          <button 
            onClick={handleManualRefresh}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 active:scale-95"
            title="Sync / Refresh Data"
          >
            <ArrowPathIcon className="h-6 w-6" />
          </button>
        </header>
        <div className="w-full max-w-7xl mx-auto animate-fade-in-up pb-20">
          {renderView()}
        </div>
      </main>
      <VoiceAssistant />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
        <AuthProvider>
            <Dashboard />
        </AuthProvider>
    </ToastProvider>
  );
};

export default App;
