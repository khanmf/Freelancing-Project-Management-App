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
        return { title: "Client Projects", subtitle: "Track and manage your ongoing client work.", icon: <BriefcaseIcon className="h-8 w-8 text-indigo-400" /> };
      case View.Skills:
        return { title: "Skill Development", subtitle: "Plan and monitor your learning journey.", icon: <CodeIcon className="h-8 w-8 text-indigo-400" /> };
      case View.Finances:
        return { title: "Financial Hub", subtitle: "Oversee your monthly income and expenses.", icon: <ChartBarIcon className="h-8 w-8 text-indigo-400" /> };
      case View.Todos:
        return { title: "To-Do List", subtitle: "Organize and prioritize your daily tasks.", icon: <CheckCircleIcon className="h-8 w-8 text-indigo-400" /> };
      default:
        return { title: "Dashboard", subtitle: "Welcome to your freelance command center." };
    }
  };
  
  const { title, subtitle, icon } = getHeader();

  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto relative">
          <header className="mb-8">
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800 p-3 rounded-lg">
                {icon}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
                <p className="text-sm sm:text-base text-gray-400">{subtitle}</p>
              </div>
            </div>
          </header>
          <div className="w-full">
            {renderView()}
          </div>
        </main>
        <VoiceAssistant />
      </div>
    </ToastProvider>
  );
};

export default App;