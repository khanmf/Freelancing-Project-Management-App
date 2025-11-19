
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ProjectsView from './components/ProjectsView';
import SkillsView from './components/SkillsView';
import FinancesView from './components/FinancesView';
import TodosView from './components/TodosView';
import VoiceAssistant from './components/VoiceAssistant';
import { ToastProvider } from './hooks/useToast';
import { View } from './types';
import { CodeIcon, ChartBarIcon, BriefcaseIcon, CheckCircleIcon } from './components/icons/Icons';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.Projects);

  const renderView = () => {
    switch (activeView) {
      case View.Projects:
        return <ProjectsView />;
      case View.Skills:
        return <SkillsView />;
      case View.Finances:
        return <FinancesView />;
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
      case View.Todos:
        return { title: "To-Do List", subtitle: "Organize and prioritize your daily tasks.", icon: <CheckCircleIcon className="h-7 w-7 text-amber-400" /> };
      default:
        return { title: "Dashboard", subtitle: "Welcome to your freelance command center." };
    }
  };
  
  const { title, subtitle, icon } = getHeader();

  return (
    <ToastProvider>
      <div className="flex h-screen font-sans overflow-hidden selection:bg-indigo-500/30">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1 p-6 sm:p-10 overflow-y-auto relative scroll-smooth">
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
          <div className="w-full max-w-7xl mx-auto animate-fade-in-up">
            {renderView()}
          </div>
        </main>
        <VoiceAssistant />
      </div>
    </ToastProvider>
  );
};

export default App;
