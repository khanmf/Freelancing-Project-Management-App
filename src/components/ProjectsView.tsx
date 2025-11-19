
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Subtask, Database, SubtaskStatus, ProjectCategory, ProjectStatus } from '../types';
import { PROJECT_STATUSES, PROJECT_CATEGORIES, SUBTASK_STATUSES, CATEGORY_COLORS, STATUS_COLORS } from '../constants';
import { supabase } from '../supabaseClient';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import AIProjectModal from './AIProjectModal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, SparklesIcon, BriefcaseIcon, ArrowUpIcon, ArrowDownIcon } from './icons/Icons';

type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];
type SubtaskUpdate = Database['public']['Tables']['subtasks']['Update'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

// Subtask Form
const SubtaskForm: React.FC<{ subtask: Subtask | null; onSave: (subtask: Omit<SubtaskInsert, 'project_id' | 'position'>) => void; onCancel: () => void; }> = ({ subtask, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: subtask?.name || '',
        status: subtask?.status as SubtaskStatus || SubtaskStatus.NotStarted,
        assigned_to: subtask?.assigned_to || '',
        deadline: subtask?.deadline || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Subtask Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field w-full" required />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Assigned To</label>
                    <input type="text" placeholder="e.g., John Doe" value={formData.assigned_to || ''} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} className="input-field w-full" />
                </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Deadline</label>
                    <input type="date" value={formData.deadline || ''} onChange={(e) => setFormData({...formData, deadline: e.target.value})} className="input-field w-full" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as SubtaskStatus})} className="input-field w-full">
                    {SUBTASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">Save</button>
            </div>
        </form>
    );
};


// Project Form
const ProjectForm: React.FC<{ project: Project | null; onSave: (project: Project, newSubtasks: Pick<Subtask, 'name'| 'status'>[]) => void; onCancel: () => void; prefilledSubtasks?: string[] }> = ({ project, onSave, onCancel, prefilledSubtasks = [] }) => {
    const [formData, setFormData] = useState<Omit<Project, 'id' | 'subtasks' | 'created_at'>>({
        name: '', client: '', deadline: '', status: 'To Do', category: 'Others', budget: null,
    });
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');

    useEffect(() => {
        setFormData({
            name: project?.name || '',
            client: project?.client || '',
            deadline: project?.deadline || '',
            status: project?.status || 'To Do',
            category: project?.category || 'Others',
            budget: project?.budget || null,
        });
        setSubtasks(project?.subtasks?.map(st => st.name) || prefilledSubtasks);
    }, [project?.id, JSON.stringify(prefilledSubtasks)]);

    const handleAddSubtask = () => {
        if (newSubtask.trim()) {
            setSubtasks([...subtasks, newSubtask.trim()]);
            setNewSubtask('');
        }
    };
    
    const handleDeleteSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalProject = { ...formData, id: project?.id || '', created_at: project?.created_at || null, subtasks: [] };
        const newSubtaskObjects = subtasks.map(name => ({ name, status: SubtaskStatus.NotStarted as any }));
        onSave(finalProject, newSubtaskObjects);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Project Details</label>
                <div className="space-y-3">
                    <input type="text" placeholder="Project Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field w-full" required />
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Client" value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} className="input-field w-full" required />
                        <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="input-field w-full" required />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                     <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Budget ($)</label>
                     <input type="number" placeholder="1500" value={formData.budget || ''} onChange={(e) => setFormData({ ...formData, budget: e.target.value ? Number(e.target.value) : null })} className="input-field w-full" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-field w-full">
                        {PROJECT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field w-full">
                        {PROJECT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subtasks</label>
              <div className="bg-slate-900/50 rounded-lg border border-white/5 p-3 space-y-2 max-h-48 overflow-y-auto">
                {subtasks.map((name, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-md group">
                        <span className="text-slate-200 text-sm">{name}</span>
                        <button type="button" onClick={() => handleDeleteSubtask(index)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                ))}
                {subtasks.length === 0 && <p className="text-xs text-slate-500 italic text-center py-2">No subtasks added yet.</p>}
              </div>
              <div className="flex mt-3 space-x-2">
                  <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Enter new subtask..." className="input-field flex-1 text-sm" />
                  <button type="button" onClick={handleAddSubtask} className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg hover:bg-white/20 border border-white/5 transition-colors">Add</button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">Save Project</button>
            </div>
        </form>
    );
};

// Project Row
const ProjectRow: React.FC<{ project: Project; onEdit: (project: Project) => void; onDelete: (id: string) => void; onSubtasksReordered: () => void; }> = ({ project, onEdit, onDelete, onSubtasksReordered }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
    const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
    const { addToast } = useToast();

    const handleSaveSubtask = async (subtaskData: Omit<SubtaskInsert, 'project_id' | 'position'>) => {
        if (editingSubtask) {
            const subtaskUpdate: SubtaskUpdate = subtaskData;
            const { error } = await supabase.from('subtasks').update(subtaskUpdate).eq('id', editingSubtask.id);
            if(error) {
                addToast('Error updating subtask', 'error');
            } else {
                addToast('Subtask updated', 'success');
            }
        } else {
            const newPosition = project.subtasks.length > 0 ? Math.max(...project.subtasks.map(st => st.position)) + 1 : 0;
            const subtaskInsert: SubtaskInsert = { ...subtaskData, project_id: project.id, position: newPosition };
            const { error } = await supabase.from('subtasks').insert(subtaskInsert);
             if(error) {
                addToast('Error creating subtask', 'error');
            } else {
                addToast('Subtask added', 'success');
            }
        }
        setIsSubtaskModalOpen(false);
        setEditingSubtask(null);
    };

    const handleDeleteSubtask = async (subtaskId: string) => {
        if(window.confirm('Delete this subtask?')) {
            const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
            if(error) {
                addToast('Error deleting subtask', 'error');
            } else {
                addToast('Subtask deleted', 'success');
            }
        }
    };
    
    const handleMoveSubtask = async (subtaskId: string, direction: 'up' | 'down') => {
        const sortedSubtasks = [...project.subtasks].sort((a,b) => a.position - b.position);
        const currentIndex = sortedSubtasks.findIndex(st => st.id === subtaskId);

        if ((direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === sortedSubtasks.length - 1)) {
            return;
        }

        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        const subtaskA = sortedSubtasks[currentIndex];
        const subtaskB = sortedSubtasks[swapIndex];
        
        const updates = [
            { ...subtaskA, position: subtaskB.position },
            { ...subtaskB, position: subtaskA.position },
        ];

        const { error } = await supabase.from('subtasks').upsert(updates);
        if (error) {
            addToast('Error reordering subtasks', 'error');
        } else {
            onSubtasksReordered();
        }
    };
        
    const getSubtaskStatusColor = (status: string) => {
      switch(status) {
        case SubtaskStatus.NotStarted: return 'bg-slate-700 text-slate-300 border-slate-600';
        case SubtaskStatus.InProgress: return 'bg-blue-900/40 text-blue-300 border-blue-800';
        case SubtaskStatus.Completed: return 'bg-emerald-900/40 text-emerald-300 border-emerald-800';
        default: return 'bg-slate-700 text-slate-300';
      }
    };

    const getValidCategory = (cat: string | null): ProjectCategory => {
        if (cat && Object.values(ProjectCategory).includes(cat as ProjectCategory)) {
            return cat as ProjectCategory;
        }
        return ProjectCategory.Others;
    };
    
    const getValidStatus = (status: string | null): ProjectStatus => {
        if (status && Object.values(ProjectStatus).includes(status as ProjectStatus)) {
            return status as ProjectStatus;
        }
        return ProjectStatus.Todo;
    }

    const category = getValidCategory(project.category);
    const categoryColor = CATEGORY_COLORS[category];
    const status = getValidStatus(project.status);
    const statusColor = STATUS_COLORS[status];

    return (
        <div className={`group transition-all duration-300 border-b border-white/5 last:border-0 hover:bg-white/[0.02] ${isExpanded ? 'bg-white/[0.02]' : ''}`}>
             <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1.5fr)_auto] items-center gap-x-6 p-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center space-x-3 overflow-hidden">
                     <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px] ${status === ProjectStatus.Done ? 'bg-emerald-400 shadow-emerald-500/50' : status === ProjectStatus.InProgress ? 'bg-blue-400 shadow-blue-500/50' : 'bg-amber-400 shadow-amber-500/50'}`}></div>
                    <p className="font-semibold text-slate-100 truncate text-base" title={project.name}>{project.name}</p>
                </div>
                <div className="text-sm text-slate-400 truncate font-medium" title={project.client}>{project.client}</div>
                <div className="text-sm text-slate-400 font-mono">{project.deadline}</div>
                <div>
                     <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap border backdrop-blur-sm ${categoryColor.bg} ${categoryColor.text} ${categoryColor.border} shadow-sm`}>
                        {category}
                    </span>
                </div>
                <div>
                     <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap border backdrop-blur-sm ${statusColor.bg} ${statusColor.text} border-transparent ${statusColor.ring}`}>
                        {status}
                    </span>
                </div>
                <div className="flex items-center justify-end space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="text-slate-400 hover:text-indigo-400 p-2 hover:bg-white/5 rounded-lg transition-colors"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-slate-400 hover:text-red-400 p-2 hover:bg-white/5 rounded-lg transition-colors"><TrashIcon className="h-4 w-4" /></button>
                    <button onClick={() => setIsExpanded(!isExpanded)} className={`text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-all duration-300 ${isExpanded ? 'rotate-180 bg-white/5' : ''}`}>
                        <ChevronDownIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            
            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="px-5 pb-5 pt-2 bg-black/20 border-t border-white/5 space-y-3 inset-shadow-y">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subtasks & Milestones</h5>
                            <button onClick={() => { setEditingSubtask(null); setIsSubtaskModalOpen(true);}} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors">
                                <PlusIcon className="h-3 w-3 mr-1" /> Add Subtask
                            </button>
                        </div>
                        
                        <div className="grid gap-2">
                        {[...project.subtasks].sort((a,b) => a.position - b.position).map((st, index) => (
                            <div key={st.id} className="flex items-center justify-between bg-slate-800/40 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all group/subtask">
                               <div className="flex items-center space-x-3 flex-1 min-w-0">
                                   <span className={`w-2 h-2 rounded-full ${st.status === SubtaskStatus.Completed ? 'bg-emerald-500/50' : st.status === SubtaskStatus.InProgress ? 'bg-blue-500/50' : 'bg-slate-600'}`}></span>
                                   <div className="flex flex-col min-w-0">
                                       <p className={`text-sm font-medium truncate ${st.status === SubtaskStatus.Completed ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}>{st.name}</p>
                                       <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                                          {st.assigned_to && <span>@{st.assigned_to}</span>}
                                          {st.deadline && <span>Due {st.deadline}</span>}
                                       </div>
                                   </div>
                               </div>
                               
                               <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${getSubtaskStatusColor(st.status)}`}>{st.status}</span>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover/subtask:opacity-100 transition-opacity px-2 border-l border-white/5 ml-2">
                                        <button onClick={() => handleMoveSubtask(st.id, 'up')} disabled={index === 0} className="text-slate-500 hover:text-white disabled:opacity-20 p-1"><ArrowUpIcon className="h-3 w-3" /></button>
                                        <button onClick={() => handleMoveSubtask(st.id, 'down')} disabled={index === project.subtasks.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20 p-1"><ArrowDownIcon className="h-3 w-3" /></button>
                                        <button onClick={() => { setEditingSubtask(st); setIsSubtaskModalOpen(true); }} className="text-slate-500 hover:text-indigo-400 p-1"><PencilIcon className="h-3 w-3" /></button>
                                        <button onClick={() => handleDeleteSubtask(st.id)} className="text-slate-500 hover:text-red-400 p-1"><TrashIcon className="h-3 w-3" /></button>
                                    </div>
                               </div>
                            </div>
                        ))}
                        </div>
                        
                         {project.subtasks.length === 0 && (
                             <div className="text-center py-4 border-2 border-dashed border-white/5 rounded-lg">
                                 <p className="text-slate-500 text-sm">No subtasks defined yet.</p>
                             </div>
                         )}
                    </div>
                </div>
            </div>
            <Modal isOpen={isSubtaskModalOpen} onClose={() => setIsSubtaskModalOpen(false)} title={editingSubtask ? 'Edit Subtask' : 'Add Subtask'}>
                <SubtaskForm subtask={editingSubtask} onSave={handleSaveSubtask} onCancel={() => setIsSubtaskModalOpen(false)} />
            </Modal>
        </div>
    );
};

// Main View
const ProjectsView: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [prefilledSubtasks, setPrefilledSubtasks] = useState<string[]>([]);
    const { addToast } = useToast();

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .order('deadline', { ascending: true });
    
            if (projectsError) throw projectsError;
    
            const { data: subtasksData, error: subtasksError } = await supabase
                .from('subtasks')
                .select('*');
    
            if (subtasksError) throw subtasksError;
            
            const projectsWithSubtasks = projectsData.map(p => {
                const relatedSubtasks = subtasksData
                    .filter(s => s.project_id === p.id)
                    .sort((a, b) => a.position - b.position);
                return { ...p, subtasks: relatedSubtasks };
            });
    
            setProjects(projectsWithSubtasks as Project[]);
    
        } catch (error) {
            console.error('Error fetching project data:', error);
            addToast('Error fetching project data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchProjects();
        const channel = supabase.channel('projects-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
            fetchProjects();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, (payload) => {
            fetchProjects();
          })
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchProjects]);


    const handleSaveProject = async (projectData: Project, newSubtasks: Pick<Subtask, 'name'| 'status'>[]) => {
        const projectPayload: ProjectInsert & ProjectUpdate = {
            name: projectData.name,
            client: projectData.client,
            deadline: projectData.deadline,
            status: projectData.status,
            category: projectData.category,
            budget: projectData.budget,
        };

        const isEditing = editingProject && editingProject.id;

        if (isEditing) {
            const { error } = await supabase.from('projects').update(projectPayload).eq('id', editingProject.id);
            if (error) {
                addToast('Error updating project', 'error');
            } else {
                addToast('Project updated successfully', 'success');
            }
        } else {
            const { data, error } = await supabase.from('projects').insert(projectPayload).select().single();
            if (error) {
                 addToast('Error creating project', 'error');
            } else if (data) {
                addToast('Project created successfully', 'success');
                if (newSubtasks.length > 0) {
                    const subtasksToInsert = newSubtasks.map((st, index) => ({...st, project_id: data.id, position: index}));
                    const { error: subtaskError } = await supabase.from('subtasks').insert(subtasksToInsert);
                    if (subtaskError) {
                        addToast('Project saved, but failed to add subtasks', 'error');
                    }
                }
            }
        }
        
        setIsProjectModalOpen(false);
        setEditingProject(null);
        setPrefilledSubtasks([]);
    };

    const handleDeleteProject = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            const { error } = await supabase.from('projects').delete().eq('id', id);
            if (error) {
                addToast('Error deleting project', 'error');
            } else {
                addToast('Project deleted', 'success');
            }
        }
    };

    const handleOpenManualAdd = () => {
        setEditingProject(null);
        setPrefilledSubtasks([]);
        setIsProjectModalOpen(true);
    }

    const handleAIProjectGenerated = (data: { name: string, client: string, deadline: string, category: any, subtasks: string[] }) => {
        setEditingProject({
            id: '',
            name: data.name,
            client: data.client,
            deadline: data.deadline,
            category: data.category,
            status: 'To Do',
            created_at: null,
            subtasks: [],
            budget: null
        });
        setPrefilledSubtasks(data.subtasks);
        setIsAIModalOpen(false);
        setIsProjectModalOpen(true);
    };


    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );

    const noProjectsExist = projects.length === 0;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap gap-4">
                 <button onClick={handleOpenManualAdd} className="primary-gradient px-5 py-2.5 rounded-xl text-sm font-medium flex items-center transition-transform hover:-translate-y-0.5 active:scale-95">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Project
                </button>
                 <button onClick={() => setIsAIModalOpen(true)} className="glass-button px-5 py-2.5 rounded-xl text-sm font-medium text-indigo-300 flex items-center border-indigo-500/20 hover:bg-indigo-500/10">
                    <SparklesIcon className="h-5 w-5 mr-2 text-indigo-400" />
                    Generate with AI
                </button>
            </div>

            {noProjectsExist ? (
                 <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-2xl border-dashed border-2 border-white/10">
                    <div className="bg-slate-800 p-4 rounded-full mb-4">
                        <BriefcaseIcon className="h-10 w-10 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white">No projects yet</h3>
                    <p className="mt-2 text-slate-400">Kickstart your workflow by adding your first client project.</p>
                 </div>
            ) : (
                <div className="space-y-10">
                    {PROJECT_CATEGORIES.map(category => {
                        const categoryProjects = projects.filter(p => p.category === category);
                        if (categoryProjects.length === 0) return null;
                        return (
                            <div key={category} className="animate-fade-in-up">
                                <div className="flex items-center space-x-3 mb-4 px-1">
                                    <h3 className="text-lg font-bold text-white">{category}</h3>
                                    <span className="bg-white/10 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono">{categoryProjects.length}</span>
                                </div>
                                <div className="glass-panel rounded-2xl overflow-hidden">
                                    <div className="hidden lg:grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1.5fr)_auto] items-center gap-x-6 px-6 py-3 bg-white/5 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <div className="text-left">Project</div>
                                        <div className="text-left">Client</div>
                                        <div className="text-left">Deadline</div>
                                        <div className="text-left">Category</div>
                                        <div className="text-left">Status</div>
                                        <div className="text-right">Actions</div>
                                    </div>
                                    <div>
                                        {categoryProjects.map(project => (
                                            <ProjectRow key={project.id} project={project} onEdit={() => {setEditingProject(project); setIsProjectModalOpen(true);}} onDelete={handleDeleteProject} onSubtasksReordered={fetchProjects} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title={editingProject?.id ? "Edit Project" : "Add Project"}>
                <ProjectForm project={editingProject} onSave={handleSaveProject} onCancel={() => setIsProjectModalOpen(false)} prefilledSubtasks={prefilledSubtasks} />
            </Modal>

            <AIProjectModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} onProjectGenerated={handleAIProjectGenerated}/>

        </div>
    );
};

export default ProjectsView;
