
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
import { CodeIcon, ChartBarIcon, BriefcaseIcon, CheckCircleIcon, UserGroupIcon } from './components/icons/Icons';

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.Projects);
  const { user, loading, isAdmin } = useAuth();

  // Reset view if access is revoked (e.g. switching users)
  React.useEffect(() => {
    if (!isAdmin && (activeView === View.Finances || activeView === View.Skills || activeView === View.Team)) {
        setActiveView(View.Projects);
    }
  }, [isAdmin, activeView]);

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    switch (activeView) {
      case View.Projects:
        return <ProjectsView />;
      case View.Skills:
        return isAdmin ? <SkillsView /> : <div className="text-white">Access Denied</div>;
      case View.Finances:
        return isAdmin ? <FinancesView /> : <div className="text-white">Access Denied</div>;
      case View.Team:
        return isAdmin ? <TeamView /> : <div className="text-white">Access Denied</div>;
      case View.Todos:
        return <TodosView />;
      default:
        return <ProjectsView />;
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
        <header className="mb-10 fade-in">
          <div className="flex items-center space-x-5">
            <div className="glass-panel p-3.5 rounded-2xl shadow-lg shadow-indigo-500/10">
              {icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
              <p className="text-slate-400 mt-1 text-lg">{subtitle}</p>
            </div>
          </div>
        </header>
        <div className="w-full max-w-7xl mx-auto animate-fade-in-up pb-20">
          {renderView()}
        </div>
      </main>
      {/* Only admin gets the AI assistant for now, or maybe everyone? Let's keep it for everyone but it uses their own key implicitly if not set */}
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
