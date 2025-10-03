import React from 'react';
import { View } from '../types';
import { BriefcaseIcon, CodeIcon, ChartBarIcon, DocumentTextIcon, CheckCircleIcon } from './icons/Icons';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const navItems = [
    { view: View.Projects, label: 'Projects', icon: <BriefcaseIcon className="h-6 w-6" /> },
    { view: View.Skills, label: 'Skills', icon: <CodeIcon className="h-6 w-6" /> },
    { view: View.Finances, label: 'Finances', icon: <ChartBarIcon className="h-6 w-6" /> },
    { view: View.Todos, label: 'To-Do List', icon: <CheckCircleIcon className="h-6 w-6" /> },
  ];

  return (
    <div className="w-16 hover:w-64 transition-all duration-300 bg-gray-800 border-r border-gray-700 flex flex-col group overflow-hidden">
      <div className="p-4 flex items-center space-x-3 border-b border-gray-700 h-[72px]">
        <DocumentTextIcon className="h-8 w-8 text-indigo-400 flex-shrink-0"/>
        <h1 className="text-xl font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">Freelance OS</h1>
      </div>
      <nav className="flex-1 p-2 space-y-2">
        {navItems.map((item) => (
          <li key={item.view} className="list-none">
            <button
              onClick={() => setActiveView(item.view)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200 ${
                activeView === item.view
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">{item.label}</span>
            </button>
          </li>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-xs text-gray-500">&copy; 2024 Your Dashboard</p>
      </div>
    </div>
  );
};

export default Sidebar;
