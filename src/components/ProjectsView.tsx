import React, { useState, useEffect, useCallback } from 'react';
import { Project, Subtask, Database, SubtaskStatus, ProjectCategory } from '../types';
import { PROJECT_STATUSES, PROJECT_CATEGORIES, SUBTASK_STATUSES, CATEGORY_COLORS } from '../constants';
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
    
    const formInputClasses = "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">Subtask Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={formInputClasses} required />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Assigned To</label>
                <input type="text" placeholder="e.g., John Doe" value={formData.assigned_to || ''} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} className={formInputClasses} />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Deadline</label>
                <input type="date" value={formData.deadline || ''} onChange={(e) => setFormData({...formData, deadline: e.target.value})} className={formInputClasses} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as SubtaskStatus})} className={formInputClasses}>
                    {SUBTASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Save</button>
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
        // This effect now ONLY runs when the modal is opened for a specific project
        // or when a new AI project is scaffolded. It won't re-run on every parent render
        // or keystroke, which fixes the "focus stealing" bug.
        setFormData({
            name: project?.name || '',
            client: project?.client || '',
            deadline: project?.deadline || '',
            status: project?.status || 'To Do',
            category: project?.category || 'Others',
            budget: project?.budget || null,
        });
        setSubtasks(project?.subtasks?.map(st => st.name) || prefilledSubtasks);
    }, [project?.id, JSON.stringify(prefilledSubtasks)]); // Depend on stable values

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

    const formInputClasses = "block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Project Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={formInputClasses} required />
            <input type="text" placeholder="Client" value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} className={formInputClasses} required />
            <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className={formInputClasses} required />
             <div>
                <label className="block text-sm font-medium text-gray-300">Budget ($)</label>
                <input type="number" placeholder="e.g., 1500" value={formData.budget || ''} onChange={(e) => setFormData({ ...formData, budget: e.target.value ? Number(e.target.value) : null })} className={formInputClasses} />
            </div>
             <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={formInputClasses}>
                {PROJECT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={formInputClasses}>
                {PROJECT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
            
            <div>
              <h4 className="text-md font-medium text-gray-300 mb-2">Subtasks</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {subtasks.map((name, index) => (
                    <div key={index} className="flex items-center bg-gray-600 p-2 rounded">
                        <span className="text-white flex-1">{name}</span>
                        <button type="button" onClick={() => handleDeleteSubtask(index)} aria-label={`Delete subtask: ${name}`} className="text-gray-400 hover:text-red-500 rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-600"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                ))}
              </div>
              <div className="flex mt-2 space-x-2">
                  <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="New subtask name" className={formInputClasses} />
                  <button type="button" onClick={handleAddSubtask} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Add</button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Save Project</button>
            </div>
        </form>
    );
};

// Project Card (Collapsible)
const ProjectCard: React.FC<{ project: Project; onEdit: (project: Project) => void; onDelete: (id: string) => void; onSubtasksReordered: () => void; }> = ({ project, onEdit, onDelete, onSubtasksReordered }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
    const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
    const { addToast } = useToast();

    const handleSaveSubtask = async (subtaskData: Omit<SubtaskInsert, 'project_id' | 'position'>) => {
        if (editingSubtask) {
            const subtaskUpdate: SubtaskUpdate = subtaskData;
            const { error } = await supabase.from('subtasks').update(subtaskUpdate).eq('id', editingSubtask.id);
            if(error) {
                console.error("Error updating subtask", error);
                addToast('Error updating subtask', 'error');
            } else {
                addToast('Subtask updated', 'success');
            }
        } else {
            const newPosition = project.subtasks.length > 0 ? Math.max(...project.subtasks.map(st => st.position)) + 1 : 0;
            const subtaskInsert: SubtaskInsert = { ...subtaskData, project_id: project.id, position: newPosition };
            const { error } = await supabase.from('subtasks').insert(subtaskInsert);
             if(error) {
                console.error("Error creating subtask", error);
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
                console.error("Error deleting subtask", error);
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
            console.error("Error reordering subtasks:", error);
            addToast('Error reordering subtasks', 'error');
        } else {
            onSubtasksReordered();
        }
    };
    
    const getStatusColor = (status: string) => {
        switch (status) {
          case 'To Do': return 'border-yellow-500';
          case 'In Progress': return 'border-blue-500';
          case 'Done': return 'border-green-500';
        }
    };
    
    const getSubtaskStatusColor = (status: string) => {
      switch(status) {
        case SubtaskStatus.NotStarted: return 'bg-gray-600';
        case SubtaskStatus.InProgress: return 'bg-blue-600';
        case SubtaskStatus.Completed: return 'bg-green-600';
        default: return 'bg-gray-600';
      }
    };

    const getValidCategory = (cat: string | null): ProjectCategory => {
        if (cat && Object.values(ProjectCategory).includes(cat as ProjectCategory)) {
            return cat as ProjectCategory;
        }
        return ProjectCategory.Others;
    };

    const category = getValidCategory(project.category);
    const categoryColor = CATEGORY_COLORS[category];

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 transition-shadow hover:shadow-lg hover:border-gray-600">
            <button aria-expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center p-4 text-left rounded-t-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">
                <div className={`w-2 h-10 rounded-full mr-4 flex-shrink-0 ${getStatusColor(project.status)}`}></div>
                <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                        <h4 className="font-bold text-white">{project.name}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColor.bg} ${categoryColor.text}`}>
                            {category}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Client: {project.client} | Deadline: {project.deadline} {project.budget && ` - Budget: $${project.budget.toLocaleString()}`}</p>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-4 border-t border-gray-700 space-y-3">
                     <div className="flex justify-end space-x-2 mb-4">
                        <button aria-label={`Edit project ${project.name}`} onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="text-gray-400 hover:text-white p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800"><PencilIcon className="h-5 w-5" /></button>
                        <button aria-label={`Delete project ${project.name}`} onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-gray-400 hover:text-red-500 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                    <h5 className="font-semibold text-gray-300">Subtasks</h5>
                    {[...project.subtasks].sort((a,b) => a.position - b.position).map((st, index) => (
                        <div key={st.id} className="flex flex-col sm:flex-row sm:items-center bg-gray-700 p-2.5 rounded-md group">
                           <div className="flex-1 mb-2 sm:mb-0">
                               <p className={`text-sm font-medium ${st.status === SubtaskStatus.Completed ? 'line-through text-gray-500' : 'text-white'}`}>{st.name}</p>
                               <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                                  <span className={`px-2 py-0.5 rounded-full text-white ${getSubtaskStatusColor(st.status)}`}>{st.status}</span>
                                  {st.assigned_to && <span>To: {st.assigned_to}</span>}
                                  {st.deadline && <span>Due: {st.deadline}</span>}
                               </div>
                           </div>
                           <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button aria-label={`Move subtask ${st.name} up`} onClick={() => handleMoveSubtask(st.id, 'up')} disabled={index === 0} className="text-gray-400 hover:text-white disabled:opacity-30 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><ArrowUpIcon className="h-4 w-4" /></button>
                                <button aria-label={`Move subtask ${st.name} down`} onClick={() => handleMoveSubtask(st.id, 'down')} disabled={index === project.subtasks.length - 1} className="text-gray-400 hover:text-white disabled:opacity-30 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><ArrowDownIcon className="h-4 w-4" /></button>
                                <button aria-label={`Edit subtask ${st.name}`} onClick={() => { setEditingSubtask(st); setIsSubtaskModalOpen(true); }} className="text-gray-400 hover:text-white p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><PencilIcon className="h-4 w-4" /></button>
                                <button aria-label={`Delete subtask ${st.name}`} onClick={() => handleDeleteSubtask(st.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><TrashIcon className="h-4 w-4" /></button>
                           </div>
                        </div>
                    ))}
                     {project.subtasks.length === 0 && <p className="text-gray-500 italic text-sm">No subtasks yet.</p>}
                    <button onClick={() => { setEditingSubtask(null); setIsSubtaskModalOpen(true);}} className="text-indigo-400 text-sm hover:text-indigo-300 pt-2 font-medium focus:outline-none focus-visible:underline">
                        + Add Subtask
                    </button>
                </div>
            )}
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
                console.error('Error updating project:', error);
                addToast('Error updating project', 'error');
            } else {
                addToast('Project updated successfully', 'success');
            }
        } else {
            const { data, error } = await supabase.from('projects').insert(projectPayload).select().single();
            if (error) {
                 console.error('Error creating project:', error);
                 addToast('Error creating project', 'error');
            } else if (data) {
                addToast('Project created successfully', 'success');
                if (newSubtasks.length > 0) {
                    const subtasksToInsert = newSubtasks.map((st, index) => ({...st, project_id: data.id, position: index}));
                    const { error: subtaskError } = await supabase.from('subtasks').insert(subtasksToInsert);
                    if (subtaskError) {
                        console.error('Error adding subtasks:', subtaskError);
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
        if (window.confirm('Are you sure you want to delete this project and all its subtasks?')) {
            const { error } = await supabase.from('projects').delete().eq('id', id);
            if (error) {
                console.error('Error deleting project:', error);
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


    if (loading) return <div className="text-center p-8">Loading projects...</div>;

    const noProjectsExist = projects.length === 0;

    return (
        <div className="space-y-6">
            <div className="flex space-x-2">
                 <button onClick={handleOpenManualAdd} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-indigo-500">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add New Project
                </button>
                 <button onClick={() => setIsAIModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-indigo-500">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Add with AI
                </button>
            </div>

            {noProjectsExist ? (
                 <div className="text-center py-16 px-4 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700">
                    <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-2 text-xl font-medium text-white">No projects yet</h3>
                    <p className="mt-1 text-sm text-gray-400">Get started by adding your first client project.</p>
                 </div>
            ) : (
                <div className="space-y-8">
                    {PROJECT_CATEGORIES.map(category => {
                        const categoryProjects = projects.filter(p => p.category === category);
                        if (categoryProjects.length === 0) return null;
                        return (
                            <div key={category}>
                                <h3 className="text-xl font-bold mb-4 text-white border-b-2 border-gray-700 pb-2">{category}</h3>
                                <div className="space-y-4">
                                    {categoryProjects.map(project => (
                                        <ProjectCard key={project.id} project={project} onEdit={() => {setEditingProject(project); setIsProjectModalOpen(true);}} onDelete={handleDeleteProject} onSubtasksReordered={fetchProjects} />
                                    ))}
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
