
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { SubtaskWithProject } from './TodosView';
import { SubtaskStatus, Profile, UserRole } from '../types';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { UserGroupIcon, BriefcaseIcon, ClockIcon, ShieldCheckIcon, ChevronDownIcon, ArrowDownIcon } from './icons/Icons';

const TeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workload' | 'members'>('workload');
  const [tasks, setTasks] = useState<SubtaskWithProject[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const { addToast } = useToast();
  const { profile: currentUserProfile } = useAuth();

  const fetchData = useCallback(async () => {
      setLoading(true);
      try {
        // Fetch Tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('subtasks')
          .select('*, projects(*)')
          .not('assigned_to', 'is', null)
          .neq('assigned_to', '');
        
        if (tasksError) throw tasksError;
        setTasks(tasksData as SubtaskWithProject[] || []);

        // Fetch Profiles (for Members tab)
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');
            
        if (profilesError) throw profilesError;
        setProfiles(profilesData as Profile[] || []);

      } catch (error: any) {
        console.error('Error fetching team data:', error);
        addToast('Error loading team data. ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
      if (userId === currentUserProfile?.id) {
          addToast("You cannot change your own role here.", "error");
          return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
          addToast("Failed to update role. Ensure database policies allow admins to update profiles.", "error");
      } else {
          addToast("User role updated successfully.", "success");
          setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
      }
  };

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
      {/* Tab Navigation */}
      <div className="flex justify-between items-end border-b border-white/5 pb-1">
        <div className="flex space-x-4">
            <button
                onClick={() => setActiveTab('workload')}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg border-b-2 ${activeTab === 'workload' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                Workload Overview
            </button>
            <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg border-b-2 ${activeTab === 'members' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                Manage Members
            </button>
        </div>
        <button onClick={fetchData} className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20 transition-colors mb-2">
            Sync Data
        </button>
      </div>

      {activeTab === 'members' ? (
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col flex-1">
             <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <h3 className="font-bold text-lg text-white flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 mr-2 text-emerald-400" />
                    Registered Users & Roles
                </h3>
                <p className="text-slate-400 text-sm mt-1">Manage access levels for your workspace.</p>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/5">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {profiles.map(profile => (
                            <tr key={profile.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold mr-3 border border-indigo-500/30">
                                            {profile.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="text-sm font-medium text-white">{profile.full_name || 'Unknown'}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                    {profile.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="relative inline-block w-40">
                                        <select 
                                            value={profile.role}
                                            onChange={(e) => handleUpdateRole(profile.id, e.target.value as UserRole)}
                                            className={`w-full appearance-none bg-slate-800 border px-3 py-1.5 pr-8 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer ${
                                                profile.role === 'admin' 
                                                ? 'border-purple-500/30 text-purple-300' 
                                                : 'border-slate-600 text-slate-300'
                                            }`}
                                            disabled={profile.id === currentUserProfile?.id}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="collaborator">Collaborator</option>
                                        </select>
                                        <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none"/>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <span className="flex items-center">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2"></div>
                                        Active
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
      ) : (
        // Workload Tab Content
        memberNames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-2xl border-dashed border-2 border-white/10 flex-1">
                <UserGroupIcon className="h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white">No Workload Data</h3>
                <p className="mt-2 text-slate-400">Assign tasks to team members in Projects to view stats here.</p>
            </div>
        ) : (
            <div className="flex gap-6 h-full">
            {/* Member List Sidebar */}
            <div className="w-1/3 min-w-[250px] glass-panel rounded-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="font-bold text-lg text-white flex items-center">
                        <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-400" />
                        Team Workload
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
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
            <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col transition-all">
                {selectedMember ? (
                    <>
                        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-900/20 to-slate-900/20 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{selectedMember}</h2>
                                <p className="text-slate-400 text-sm mt-1">Task Performance Report</p>
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
                        
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Assigned Tasks</h4>
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
        )
      )}
    </div>
  );
};

export default TeamView;
