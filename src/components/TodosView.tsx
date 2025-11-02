import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, Subtask, Database, SubtaskStatus, ProjectCategory } from '../types';
import { supabase } from '../supabaseClient';
import { useToast } from '../hooks/useToast';
import useLocalStorage from '../hooks/useLocalStorage';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, DragHandleIcon } from './icons/Icons';
import { SUBTASK_STATUSES } from '../constants';

type SubtaskWithProject = Subtask & {
    projects: Database['public']['Tables']['projects']['Row'] | null;
};
type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];
type SubtaskUpdate = Database['public']['Tables']['subtasks']['Update'];
type SortOrder = 'my-order' | 'project' | 'category';

const TaskForm: React.FC<{
    task: SubtaskWithProject | null;
    projects: Project[];
    onSave: (data: { 
        name: string; 
        project_id: string; 
        status: SubtaskStatus;
        assigned_to: string | null;
        deadline: string | null;
    }) => void;
    onCancel: () => void;
}> = ({ task, projects, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: task?.name || '',
        project_id: task?.project_id || (projects[0]?.id || ''),
        status: (task?.status as SubtaskStatus) || SubtaskStatus.NotStarted,
        assigned_to: task?.assigned_to || '',
        deadline: task?.deadline || '',
    });

    useEffect(() => {
        if (!task && projects.length > 0 && !formData.project_id) {
             setFormData(prev => ({...prev, project_id: projects[0].id}));
        }
    }, [projects, task, formData.project_id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() && formData.project_id) {
            onSave({
                name: formData.name,
                project_id: formData.project_id,
                status: formData.status,
                assigned_to: formData.assigned_to || null,
                deadline: formData.deadline || null,
            });
        }
    };

    const formInputClasses = "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">Task Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={formInputClasses} placeholder="Enter a task..." required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Project</label>
                <select name="project_id" value={formData.project_id} onChange={handleInputChange} className={formInputClasses} disabled={!!task} required>
                    {projects.length === 0 && <option>No projects available</option>}
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                {!!task && <p className="text-xs text-gray-500 mt-1">Cannot change the project of an existing task.</p>}
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Assigned To</label>
                <input type="text" name="assigned_to" value={formData.assigned_to || ''} onChange={handleInputChange} className={formInputClasses} placeholder="e.g., John Doe" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Deadline</label>
                <input type="date" name="deadline" value={formData.deadline || ''} onChange={handleInputChange} className={formInputClasses} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className={formInputClasses}>
                    {SUBTASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Save Task</button>
            </div>
        </form>
    );
};

const TodosView: React.FC = () => {
    const [apiTasks, setApiTasks] = useState<SubtaskWithProject[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<SubtaskWithProject | null>(null);
    const { addToast } = useToast();
    const [orderedTaskIds, setOrderedTaskIds] = useLocalStorage<string[]>('todo-view-order', []);
    const [sortOrder, setSortOrder] = useState<SortOrder>('my-order');
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const { data: projectsData, error: projectsError } = await supabase.from('projects').select('*');
            if (projectsError) throw projectsError;
            setProjects(projectsData || []);

            const { data: subtasksData, error: subtasksError } = await supabase.from('subtasks').select('*, projects(*)').order('created_at', { ascending: false });
            if (subtasksError) throw subtasksError;
            setApiTasks(subtasksData as SubtaskWithProject[] || []);
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
        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const manuallySortedTasks = useMemo(() => {
        if (apiTasks.length === 0) return [];
        const taskMap = new Map(apiTasks.map(task => [task.id, task]));
        const currentApiTaskIds = new Set(apiTasks.map(task => task.id));
        const validOrderedIds = orderedTaskIds.filter(id => currentApiTaskIds.has(id));
        const newApiTasks = apiTasks.filter(task => !validOrderedIds.includes(task.id));
        const newFullOrder = [...validOrderedIds, ...newApiTasks.map(t => t.id)];

        if (JSON.stringify(newFullOrder) !== JSON.stringify(orderedTaskIds)) {
            setOrderedTaskIds(newFullOrder);
        }

        return newFullOrder.map(id => taskMap.get(id)).filter(Boolean) as SubtaskWithProject[];
    }, [apiTasks, orderedTaskIds, setOrderedTaskIds]);

    const displayedTasks = useMemo(() => {
        const tasksToSort = [...apiTasks];
        if (sortOrder === 'project') {
            return tasksToSort.sort((a, b) => (a.projects?.name || '').localeCompare(b.projects?.name || ''));
        }
        if (sortOrder === 'category') {
             return tasksToSort.sort((a, b) => (a.projects?.category || '').localeCompare(b.projects?.category || ''));
        }
        return manuallySortedTasks;
    }, [apiTasks, sortOrder, manuallySortedTasks]);
    
    const handleSaveTask = async (data: { name: string; project_id: string; status: SubtaskStatus; assigned_to: string | null; deadline: string | null; }) => {
        if (editingTask) {
            const taskUpdate: SubtaskUpdate = { 
                name: data.name,
                status: data.status,
                assigned_to: data.assigned_to,
                deadline: data.deadline
            };
            const { error } = await supabase.from('subtasks').update(taskUpdate).eq('id', editingTask.id);
            if(error) addToast('Error updating task', 'error');
            else addToast('Task updated', 'success');
        } else {
            const { data: subtasks, error: posError } = await supabase.from('subtasks').select('position').eq('project_id', data.project_id).order('position', { ascending: false }).limit(1);
            if (posError) { addToast('Error creating task', 'error'); return; }
            const newPosition = (subtasks?.[0]?.position ?? -1) + 1;
            const taskInsert: SubtaskInsert = { ...data, position: newPosition };
            const { error } = await supabase.from('subtasks').insert(taskInsert);
            if(error) addToast('Error adding task', 'error');
            else addToast('Task added', 'success');
        }
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const toggleTaskStatus = async (task: SubtaskWithProject) => {
        const newStatus = task.status === SubtaskStatus.Completed ? SubtaskStatus.NotStarted : SubtaskStatus.Completed;
        const { error } = await supabase.from('subtasks').update({ status: newStatus }).eq('id', task.id);
        if(error) addToast('Error changing task status', 'error');
    };

    const deleteTask = async (id: string) => {
        if(window.confirm('Delete this task? This will remove it from its project.')) {
            const { error } = await supabase.from('subtasks').delete().eq('id', id);
            if(error) addToast('Error deleting task', 'error');
            else addToast('Task deleted', 'success');
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        setDraggedId(taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => setDraggedId(null);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetTaskId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === dropTargetTaskId) {
            handleDragEnd();
            return;
        }
        const currentTaskIds = [...orderedTaskIds];
        const dragIndex = currentTaskIds.indexOf(draggedId);
        const dropIndex = currentTaskIds.indexOf(dropTargetTaskId);
        const [draggedItem] = currentTaskIds.splice(dragIndex, 1);
        currentTaskIds.splice(dropIndex, 0, draggedItem);
        setOrderedTaskIds(currentTaskIds);
        handleDragEnd();
    };

    if (loading) return <div className="text-center p-8">Loading tasks...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-indigo-500" disabled={projects.length === 0}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add New Task
                </button>
                <div>
                    <label htmlFor="sort-order" className="text-sm font-medium text-gray-300 mr-2">Sort by:</label>
                    <select id="sort-order" value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)} className="bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">
                        <option value="my-order">My Order</option>
                        <option value="project">Project</option>
                        <option value="category">Category</option>
                    </select>
                </div>
            </div>

            {projects.length === 0 && !loading && <p className="text-center text-gray-500 italic">You must create a project before you can add tasks.</p>}
            
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="grid grid-cols-[auto_auto_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_auto] items-center gap-4 px-3 pb-2 border-b border-gray-700 text-sm font-semibold text-gray-400">
                    <div className="w-5" aria-hidden="true"></div>
                    <div className="w-5" aria-hidden="true"></div>
                    <div>Task</div>
                    <div>Project</div>
                    <div>Assigned To</div>
                    <div>Deadline</div>
                    <div className="w-20 text-right">Actions</div>
                </div>
                <div className="space-y-2 mt-2">
                    {displayedTasks.length > 0 ? displayedTasks.map((task) => {
                        const isCompleted = task.status === SubtaskStatus.Completed;

                        return (
                            <div
                                key={task.id}
                                draggable={sortOrder === 'my-order'}
                                onDragStart={sortOrder === 'my-order' ? (e) => handleDragStart(e, task.id) : undefined}
                                onDragEnd={sortOrder === 'my-order' ? handleDragEnd : undefined}
                                onDragOver={sortOrder === 'my-order' ? (e) => e.preventDefault() : undefined}
                                onDrop={sortOrder === 'my-order' ? (e) => handleDrop(e, task.id) : undefined}
                                className={`grid grid-cols-[auto_auto_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_auto] items-center gap-4 bg-gray-700 p-3 rounded-md hover:bg-gray-600/50 group transition-opacity ${draggedId === task.id ? 'opacity-30' : 'opacity-100'}`}
                                title={`Project: ${task.projects?.name}`}
                            >
                                <div className="flex items-center justify-center">
                                    {sortOrder === 'my-order' ? (
                                        <DragHandleIcon className="h-5 w-5 text-gray-500 cursor-grab" />
                                    ) : (
                                        <div className="h-5 w-5" aria-hidden="true"></div>
                                    )}
                                </div>
                                <input type="checkbox" checked={isCompleted} onChange={() => toggleTaskStatus(task)} className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer" aria-labelledby={`task-label-${task.id}`} />
                                <span id={`task-label-${task.id}`} className={`text-white truncate ${isCompleted ? 'line-through text-gray-500' : ''}`}>{task.name}</span>
                                <p className="text-sm text-gray-400 truncate">{task.projects?.name}</p>
                                <p className="text-sm text-gray-400 truncate">{task.assigned_to || '-'}</p>
                                <p className="text-sm text-gray-400 truncate">{task.deadline || '-'}</p>
                                <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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