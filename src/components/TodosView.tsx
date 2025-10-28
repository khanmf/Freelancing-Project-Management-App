import React, { useState, useEffect, useCallback } from 'react';
import { Project, Subtask, Database, SubtaskStatus, ProjectCategory } from '../types';
import { supabase } from '../supabaseClient';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon } from './icons/Icons';
import { CATEGORY_COLORS } from '../constants';

type SubtaskWithProject = Subtask & {
    projects: Database['public']['Tables']['projects']['Row'] | null;
};
type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];
type SubtaskUpdate = Database['public']['Tables']['subtasks']['Update'];

const TaskForm: React.FC<{ 
    task: SubtaskWithProject | null; 
    projects: Project[];
    onSave: (data: { name: string; project_id: string; status: SubtaskStatus }) => void; 
    onCancel: () => void; 
}> = ({ task, projects, onSave, onCancel }) => {
    const [name, setName] = useState(task?.name || '');
    const [projectId, setProjectId] = useState(task?.project_id || (projects[0]?.id || ''));

    useEffect(() => {
        if (!task && projects.length > 0 && !projectId) {
            setProjectId(projects[0].id);
        }
    }, [projects, task, projectId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && projectId) {
            onSave({ 
                name, 
                project_id: projectId, 
                status: (task?.status as SubtaskStatus) || SubtaskStatus.NotStarted 
            });
        }
    };

    const formInputClasses = "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">Task Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={formInputClasses} placeholder="Enter a task..." required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Project</label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)} className={formInputClasses} disabled={!!task} required>
                    {projects.length === 0 && <option>No projects available</option>}
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                {!!task && <p className="text-xs text-gray-500 mt-1">Cannot change the project of an existing task.</p>}
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Save Task</button>
            </div>
        </form>
    );
};

const TodosView: React.FC = () => {
    const [tasks, setTasks] = useState<SubtaskWithProject[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubtaskWithProject | null>(null);
    const { addToast } = useToast();

    const fetchData = useCallback(async () => {
        try {
            const { data: projectsData, error: projectsError } = await supabase.from('projects').select('*');
            if (projectsError) throw projectsError;
            setProjects(projectsData || []);

            const { data: subtasksData, error: subtasksError } = await supabase.from('subtasks').select('*, projects(*)').order('created_at', { ascending: false });
            if (subtasksError) throw subtasksError;
            setTasks(subtasksData as SubtaskWithProject[] || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            addToast('Error fetching tasks and projects', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('public-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const handleSaveTask = async (data: { name: string; project_id: string; status: SubtaskStatus }) => {
        if (editingTask) {
            const taskUpdate: SubtaskUpdate = { name: data.name };
            const { error } = await supabase.from('subtasks').update(taskUpdate).eq('id', editingTask.id);
            if(error) {
                addToast('Error updating task', 'error');
            } else {
                addToast('Task updated', 'success');
            }
        } else {
            const { data: subtasks, error: posError } = await supabase.from('subtasks').select('position').eq('project_id', data.project_id).order('position', { ascending: false }).limit(1);
            if (posError) {
                addToast('Error creating task', 'error');
                return;
            }
            const newPosition = (subtasks?.[0]?.position ?? -1) + 1;
            const taskInsert: SubtaskInsert = { ...data, position: newPosition };
            const { error } = await supabase.from('subtasks').insert(taskInsert);
            if(error) {
                addToast('Error adding task', 'error');
            } else {
                addToast('Task added', 'success');
            }
        }
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const toggleTaskStatus = async (task: SubtaskWithProject) => {
        const newStatus = task.status === SubtaskStatus.Completed ? SubtaskStatus.NotStarted : SubtaskStatus.Completed;
        const { error } = await supabase.from('subtasks').update({ status: newStatus }).eq('id', task.id);
        if(error) {
            addToast('Error changing task status', 'error');
        }
    };

    const deleteTask = async (id: string) => {
        if(window.confirm('Delete this task? This will remove it from its project.')) {
            const { error } = await supabase.from('subtasks').delete().eq('id', id);
            if(error) {
                addToast('Error deleting task', 'error');
            } else {
                addToast('Task deleted', 'success');
            }
        }
    };
    
    const getValidCategory = (cat: string | null): ProjectCategory => {
        if (cat && Object.values(ProjectCategory).includes(cat as ProjectCategory)) {
            return cat as ProjectCategory;
        }
        return ProjectCategory.Others;
    };

    if (loading) return <div className="text-center p-8">Loading tasks...</div>;

    return (
        <div className="space-y-6">
            <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-indigo-500" disabled={projects.length === 0}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Add New Task
            </button>
            {projects.length === 0 && !loading && (
                 <p className="text-center text-gray-500 italic">You must create a project before you can add tasks.</p>
            )}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="space-y-3">
                    {tasks.length > 0 ? tasks.map((task) => {
                        const projectCategory = getValidCategory(task.projects?.category || null);
                        const categoryColor = CATEGORY_COLORS[projectCategory];
                        const isCompleted = task.status === SubtaskStatus.Completed;

                        return (
                            <div key={task.id} className={`flex items-center bg-gray-700 p-3 rounded-md hover:bg-gray-600/50 group border-l-4 ${categoryColor.border}`} title={`Project: ${task.projects?.name}`}>
                                <input type="checkbox" checked={isCompleted} onChange={() => toggleTaskStatus(task)} className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0" aria-labelledby={`task-label-${task.id}`} />
                                <div className="ml-3 flex-1">
                                    <span id={`task-label-${task.id}`} className={`text-white ${isCompleted ? 'line-through text-gray-500' : ''}`}>{task.name}</span>
                                    <p className="text-xs text-gray-400">{task.projects?.name}</p>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button aria-label={`Edit task ${task.name}`} onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="text-gray-400 hover:text-white p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><PencilIcon className="h-5 w-5" /></button>
                                    <button aria-label={`Delete task ${task.name}`} onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="text-center py-10">
                            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-500" />
                            <h3 className="mt-2 text-lg font-medium text-white">All clear!</h3>
                            <p className="mt-1 text-sm text-gray-400">You have no tasks across all projects.</p>
                        </div>
                    )}
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'Edit Task' : 'Add Task'}>
                <TaskForm task={editingTask} projects={projects} onSave={handleSaveTask} onCancel={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default TodosView;