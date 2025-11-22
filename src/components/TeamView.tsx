
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { SubtaskWithProject } from './TodosView';
import { SubtaskStatus } from '../types';
import { UserGroupIcon, BriefcaseIcon, ClockIcon } from './icons/Icons';

const TeamView: React.FC = () => {
  const [tasks, setTasks] = useState<SubtaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamData = async () => {
      setLoading(true);
      // Fetch all subtasks and join with projects
      const { data, error } = await supabase
        .from('subtasks')
        .select('*, projects(*)')
        .not('assigned_to', 'is', null)
        .neq('assigned_to', '');

      if (!error && data) {
        setTasks(data as SubtaskWithProject[]);
      }
      setLoading(false);
    };

    fetchTeamData();
  }, []);

  // Group tasks by assigned_to
  const teamMembers = useMemo(() => {
    const members: Record<string, SubtaskWithProject[]> = {};
    tasks.forEach(task => {
      if (task.assigned_to) {
        const name = task.assigned_to;
        if (!members[name]) members[name] = [];
        members[name].push(task);
      }
    });
    return members;
  }, [tasks]);

  const memberNames = Object.keys(teamMembers);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      {memberNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-2xl border-dashed border-2 border-white/10">
            <UserGroupIcon className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white">No Team Members Found</h3>
            <p className="mt-2 text-slate-400">Assign tasks to people in the Projects view to see them here.</p>
        </div>
      ) : (
        <div className="flex gap-6 h-full">
          {/* Member List Sidebar */}
          <div className="w-1/3 min-w-[250px] glass-panel rounded-2xl overflow-hidden flex flex-col">
             <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                <h3 className="font-bold text-lg text-white flex items-center">
                    <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-400" />
                    Team Members
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {memberNames.map(name => {
                    const memberTasks = teamMembers[name];
                    const pending = memberTasks.filter(t => t.status !== SubtaskStatus.Completed).length;
                    return (
                        <button
                            key={name}
                            onClick={() => setSelectedMember(name)}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex justify-between items-center ${
                                selectedMember === name 
                                ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                                : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-300'
                            }`}
                        >
                            <div>
                                <p className={`font-bold ${selectedMember === name ? 'text-white' : 'text-slate-200'}`}>{name}</p>
                                <p className="text-xs text-slate-400 mt-1">{memberTasks.length} Assigned Tasks</p>
                            </div>
                            {pending > 0 && (
                                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded-full border border-amber-500/20">
                                    {pending} Active
                                </span>
                            )}
                        </button>
                    );
                })}
             </div>
          </div>

          {/* Detail View */}
          <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col">
            {selectedMember ? (
                <>
                    <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-900/20 to-slate-900/20 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{selectedMember}</h2>
                            <p className="text-slate-400 text-sm mt-1">Performance & Task Overview</p>
                        </div>
                        <div className="flex gap-4">
                             <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg border border-white/5">
                                <p className="text-xs text-slate-400 uppercase font-bold">Completed</p>
                                <p className="text-xl font-bold text-emerald-400">
                                    {teamMembers[selectedMember].filter(t => t.status === SubtaskStatus.Completed).length}
                                </p>
                             </div>
                             <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg border border-white/5">
                                <p className="text-xs text-slate-400 uppercase font-bold">Pending</p>
                                <p className="text-xl font-bold text-amber-400">
                                    {teamMembers[selectedMember].filter(t => t.status !== SubtaskStatus.Completed).length}
                                </p>
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Assigned Workload</h4>
                        <div className="space-y-3">
                            {teamMembers[selectedMember].map(task => (
                                <div key={task.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-start justify-between group hover:bg-white/[0.07] transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full ${task.status === SubtaskStatus.Completed ? 'bg-emerald-500' : task.status === SubtaskStatus.InProgress ? 'bg-blue-500' : 'bg-slate-500'}`}></span>
                                            <p className={`font-medium ${task.status === SubtaskStatus.Completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                {task.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 pl-4">
                                            <span className="flex items-center gap-1">
                                                <BriefcaseIcon className="h-3 w-3" /> {task.projects?.name || 'Unknown Project'}
                                            </span>
                                            {task.deadline && (
                                                <span className="flex items-center gap-1 text-indigo-300">
                                                    <ClockIcon className="h-3 w-3" /> Due: {task.deadline}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded border ${
                                        task.status === SubtaskStatus.Completed 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : 'bg-slate-700/30 text-slate-300 border-slate-600'
                                    }`}>
                                        {task.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                    <UserGroupIcon className="h-16 w-16 mb-4" />
                    <p className="text-lg font-medium">Select a team member to view details</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
    