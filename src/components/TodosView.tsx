
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

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Task Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="input-field w-full" placeholder="Enter a task..." required />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Project</label>
                <select name="project_id" value={formData.project_id} onChange={handleInputChange} className="input-field w-full" disabled={!!task} required>
                    {projects.length === 0 && <option>No projects available</option>}
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                {!!task && <p className="text-xs text-slate-500 mt-1 italic">Cannot change the project of an existing task.</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Assigned To</label>
                    <input type="text" name="assigned_to" value={formData.assigned_to || ''} onChange={handleInputChange} className="input-field w-full" placeholder="Optional" />
                </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Deadline</label>
                    <input type="date" name="deadline" value={formData.deadline || ''} onChange={handleInputChange} className="input-field w-full" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="input-field w-full">
                    {SUBTASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">Save Task</button>
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
            addToast('Error fetching tasks', 'error');
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

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="primary-gradient px-5 py-2.5 rounded-xl text-sm font-medium flex items-center shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" disabled={projects.length === 0}>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    New Task
                </button>
                <div className="flex items-center space-x-3 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                    <label htmlFor="sort-order" className="text-sm font-medium text-slate-400 ml-3">Sort by:</label>
                    <select id="sort-order" value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)} className="bg-transparent border-none text-white text-sm focus:ring-0 cursor-pointer">
                        <option value="my-order">My Order</option>
                        <option value="project">Project</option>
                        <option value="category">Category</option>
                    </select>
                </div>
            </div>

            {projects.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-500 italic border-2 border-dashed border-white/5 rounded-xl">
                    You must create a project before you can add tasks.
                </div>
            )}
            
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[auto_auto_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_auto] items-center gap-6 px-6 py-3 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white/[0.02]">
                    <div className="w-5"></div>
                    <div className="w-5"></div>
                    <div>Task</div>
                    <div>Project</div>
                    <div>Assigned To</div>
                    <div>Deadline</div>
                    <div className="w-20 text-right">Actions</div>
                </div>
                <div className="divide-y divide-white/5">
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
                                className={`grid grid-cols-[auto_auto_minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_auto] items-center gap-6 px-6 py-4 hover:bg-white/[0.03] transition-colors group ${draggedId === task.id ? 'opacity-30 bg-indigo-900/20' : ''}`}
                            >
                                <div className="flex items-center justify-center">
                                    {sortOrder === 'my-order' ? (
                                        <DragHandleIcon className="h-5 w-5 text-slate-600 cursor-grab hover:text-slate-400" />
                                    ) : (
                                        <div className="h-5 w-5"></div>
                                    )}
                                </div>
                                <div>
                                     <button 
                                        onClick={() => toggleTaskStatus(task)} 
                                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600 hover:border-indigo-500'}`}
                                    >
                                        {isCompleted && <CheckCircleIcon className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                                <span className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-slate-500 decoration-slate-600' : 'text-slate-200'}`}>{task.name}</span>
                                <p className="text-sm text-slate-400 truncate">{task.projects?.name}</p>
                                <p className="text-sm text-slate-400 truncate">{task.assigned_to || '-'}</p>
                                <p className="text-sm text-slate-400 truncate font-mono">{task.deadline || '-'}</p>
                                <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"><PencilIcon className="h-4 w-4" /></button>
                                    <button onClick={() => deleteTask(task.id)} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-white/10 rounded-lg transition-colors"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
                                <CheckCircleIcon className="h-8 w-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white">All clear!</h3>
                            <p className="mt-1 text-sm text-slate-500">You have no active tasks at the moment.</p>
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
