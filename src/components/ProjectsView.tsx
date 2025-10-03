import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectStatus, ProjectCategory, Subtask, Database } from '../types';
import { PROJECT_STATUSES, PROJECT_CATEGORIES } from '../constants';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import AIProjectModal from './AIProjectModal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, SparklesIcon } from './icons/Icons';

type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];
type SubtaskUpdate = Database['public']['Tables']['subtasks']['Update'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

// Subtask Form
const SubtaskForm: React.FC<{ subtask: Subtask | null; onSave: (subtask: Pick<SubtaskInsert, 'name' | 'status'>) => void; onCancel: () => void; }> = ({ subtask, onSave, onCancel }) => {
    const [name, setName] = useState(subtask?.name || '');
    const [status, setStatus] = useState(subtask?.status as ProjectStatus || ProjectStatus.Todo);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, status });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">Subtask Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                    {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Save</button>
            </div>
        </form>
    );
};


// Project Form
const ProjectForm: React.FC<{ project: Project | null; onSave: (project: Project, newSubtasks: Pick<Subtask, 'name'| 'status'>[]) => void; onCancel: () => void; prefilledSubtasks?: string[] }> = ({ project, onSave, onCancel, prefilledSubtasks = [] }) => {
    const [formData, setFormData] = useState<Omit<Project, 'id' | 'subtasks' | 'created_at'>>({
        name: project?.name || '',
        client: project?.client || '',
        deadline: project?.deadline || '',
        status: project?.status as ProjectStatus || ProjectStatus.Todo,
        category: project?.category as ProjectCategory || ProjectCategory.Others,
    });
    const [subtasks, setSubtasks] = useState<string[]>(project?.subtasks.map(st => st.name) || prefilledSubtasks);
    const [newSubtask, setNewSubtask] = useState('');

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
        const newSubtaskObjects = subtasks.map(name => ({ name, status: ProjectStatus.Todo }));
        onSave(finalProject, newSubtaskObjects);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Project Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" required />
            <input type="text" placeholder="Client" value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" required />
            <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" required />
             <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as ProjectCategory })} className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white">
                {PROJECT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })} className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white">
                {PROJECT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
            
            <div>
              <h4 className="text-md font-medium text-gray-300 mb-2">Subtasks</h4>
              <div className="space-y-2">
                {subtasks.map((name, index) => (
                    <div key={index} className="flex items-center bg-gray-600 p-2 rounded">
                        <span className="text-white flex-1">{name}</span>
                        <button type="button" onClick={() => handleDeleteSubtask(index)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                ))}
              </div>
              <div className="flex mt-2 space-x-2">
                  <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="New subtask name" className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                  <button type="button" onClick={handleAddSubtask} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Add</button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Save Project</button>
            </div>
        </form>
    );
};

// Project Card (Collapsible)
const ProjectCard: React.FC<{ project: Project; onEdit: (project: Project) => void; onDelete: (id: string) => void; onSubtaskChange: () => void; }> = ({ project, onEdit, onDelete, onSubtaskChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
    const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);

    const handleSaveSubtask = async (subtaskData: Pick<SubtaskInsert, 'name' | 'status'>) => {
        if (editingSubtask) {
            const subtaskUpdate: SubtaskUpdate = subtaskData;
            const { error } = await supabase.from('subtasks').update(subtaskUpdate).eq('id', editingSubtask.id);
            if(error) console.error("Error updating subtask", error);
        } else {
            const subtaskInsert: SubtaskInsert = { ...subtaskData, project_id: project.id };
            const { error } = await supabase.from('subtasks').insert(subtaskInsert);
            if(error) console.error("Error creating subtask", error);
        }
        setIsSubtaskModalOpen(false);
        setEditingSubtask(null);
    };

    const handleDeleteSubtask = async (subtaskId: string) => {
        if(window.confirm('Delete this subtask?')) {
            const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
            if(error) console.error("Error deleting subtask", error);
        }
    };
    
    const getStatusColor = (status: string) => {
        switch (status) {
          case ProjectStatus.Todo: return 'border-yellow-500';
          case ProjectStatus.InProgress: return 'border-blue-500';
          case ProjectStatus.Done: return 'border-green-500';
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
            <button aria-expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center p-4 text-left">
                <div className={`w-2 h-10 rounded-full mr-4 ${getStatusColor(project.status)}`}></div>
                <div className="flex-1">
                    <h4 className="font-bold text-white">{project.name}</h4>
                    <p className="text-sm text-gray-400">{project.client} - Deadline: {project.deadline}</p>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="p-4 border-t border-gray-700 space-y-3">
                     <div className="flex justify-end space-x-2 mb-4">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="text-gray-400 hover:text-white"><PencilIcon className="h-5 w-5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                    <h5 className="font-semibold text-gray-300">Subtasks</h5>
                    {project.subtasks.map(st => (
                        <div key={st.id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                           <span className={`text-sm ${st.status === ProjectStatus.Done ? 'line-through text-gray-500' : 'text-white'}`}>{st.name} ({st.status})</span>
                           <div className="flex space-x-2">
                                <button onClick={() => { setEditingSubtask(st); setIsSubtaskModalOpen(true); }} className="text-gray-400 hover:text-white"><PencilIcon className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteSubtask(st.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                           </div>
                        </div>
                    ))}
                     {project.subtasks.length === 0 && <p className="text-gray-500 italic text-sm">No subtasks yet.</p>}
                    <button onClick={() => { setEditingSubtask(null); setIsSubtaskModalOpen(true);}} className="text-indigo-400 text-sm hover:text-indigo-300 pt-2">+ Add Subtask</button>
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

    const fetchProjects = useCallback(async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*, subtasks(*)')
            .order('deadline', { ascending: true });

        if (error) {
            console.error('Error fetching projects:', error);
        } else {
            setProjects(data as Project[] || []);
        }
        setLoading(false);
    }, []);

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
        const projectPayload: ProjectInsert = {
            name: projectData.name,
            client: projectData.client,
            deadline: projectData.deadline,
            status: projectData.status,
            category: projectData.category,
        };

        if (editingProject && editingProject.id) {
            const { error } = await supabase.from('projects').update(projectPayload).eq('id', editingProject.id);
            if (error) console.error('Error updating project:', error);
        } else {
            const { data, error } = await supabase.from('projects').insert(projectPayload).select().single();
            if (error) {
                 console.error('Error creating project:', error);
            } else if (data && newSubtasks.length > 0) {
                const subtasksToInsert = newSubtasks.map(st => ({...st, project_id: data.id}));
                const { error: subtaskError } = await supabase.from('subtasks').insert(subtasksToInsert);
                if (subtaskError) console.error('Error adding subtasks:', subtaskError);
            }
        }
        
        // Explicitly refetch to ensure UI is up-to-date, making the app more robust.
        await fetchProjects();

        setIsProjectModalOpen(false);
        setEditingProject(null);
        setPrefilledSubtasks([]);
    };

    const handleDeleteProject = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this project and all its subtasks?')) {
            // Supabase is configured with cascading delete, so this is sufficient.
            const { error } = await supabase.from('projects').delete().eq('id', id);
            if (error) console.error('Error deleting project:', error);
        }
    };

    const handleOpenManualAdd = () => {
        setEditingProject(null);
        setPrefilledSubtasks([]);
        setIsProjectModalOpen(true);
    }

    const handleAIProjectGenerated = (data: { name: string, client: string, deadline: string, category: ProjectCategory, subtasks: string[] }) => {
        setEditingProject({
            id: '',
            name: data.name,
            client: data.client,
            deadline: data.deadline,
            category: data.category,
            status: ProjectStatus.Todo,
            created_at: null,
            subtasks: [],
        });
        setPrefilledSubtasks(data.subtasks);
        setIsAIModalOpen(false);
        setIsProjectModalOpen(true);
    };


    if (loading) return <div className="text-center p-8">Loading projects...</div>;

    return (
        <div className="space-y-6">
            <div className="flex space-x-2">
                 <button onClick={handleOpenManualAdd} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add New Project
                </button>
                 <button onClick={() => setIsAIModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Add with AI
                </button>
            </div>
            <div className="space-y-8">
                {PROJECT_CATEGORIES.map(category => {
                    const categoryProjects = projects.filter(p => p.category === category);
                    if (categoryProjects.length === 0) return null;
                    return (
                        <div key={category}>
                            <h3 className="text-xl font-bold mb-4 text-white border-b-2 border-gray-700 pb-2">{category}</h3>
                            <div className="space-y-4">
                                {categoryProjects.map(project => (
                                    <ProjectCard key={project.id} project={project} onEdit={() => {setEditingProject(project); setIsProjectModalOpen(true);}} onDelete={handleDeleteProject} onSubtaskChange={fetchProjects}/>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title={editingProject?.id ? "Edit Project" : "Add Project"}>
                <ProjectForm project={editingProject} onSave={handleSaveProject} onCancel={() => setIsProjectModalOpen(false)} prefilledSubtasks={prefilledSubtasks} />
            </Modal>

            <AIProjectModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} onProjectGenerated={handleAIProjectGenerated}/>

        </div>
    );
};

export default ProjectsView;