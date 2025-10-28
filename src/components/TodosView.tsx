import React, { useState, useEffect, useCallback } from 'react';
import { Todo, Database, ProjectCategory } from '../types';
import { supabase } from '../supabaseClient';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, CheckCircleIcon } from './icons/Icons';
import { PROJECT_CATEGORIES, CATEGORY_COLORS } from '../constants';


type TodoInsert = Database['public']['Tables']['todos']['Insert'];
type TodoUpdate = Database['public']['Tables']['todos']['Update'];

const TodoForm: React.FC<{ todo: Todo | null; onSave: (data: { text: string; category: ProjectCategory }) => void; onCancel: () => void; }> = ({ todo, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        text: todo?.text || '',
        category: (todo?.category as ProjectCategory) || ProjectCategory.Others
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.text.trim()) {
            onSave(formData);
        }
    };

    const formInputClasses = "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">Task</label>
                <input type="text" value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} className={formInputClasses} placeholder="Enter a task..." required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as ProjectCategory})} className={formInputClasses}>
                    {PROJECT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
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
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const { addToast } = useToast();

    const fetchTodos = useCallback(async () => {
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .order('position', { ascending: true });
        
        if (error) {
            console.error("Error fetching todos:", error);
            addToast('Error fetching tasks', 'error');
        } else {
            setTodos(data || []);
        }
        setLoading(false);
    }, [addToast]);

    useEffect(() => {
        fetchTodos();
        const channel = supabase.channel('todos-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
                fetchTodos();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTodos]);


    const handleSaveTodo = async (data: { text: string; category: ProjectCategory }) => {
        if (editingTodo) {
            const todoUpdate: TodoUpdate = data;
            const { error } = await supabase.from('todos').update(todoUpdate).eq('id', editingTodo.id);
            if(error) {
                console.error("Error updating todo:", error);
                addToast('Error updating task', 'error');
            } else {
                addToast('Task updated', 'success');
            }
        } else {
            const newPosition = todos.length > 0 ? Math.max(...todos.map(t => t.position)) + 1 : 0;
            const todoInsert: TodoInsert = { ...data, completed: false, position: newPosition };
            const { error } = await supabase.from('todos').insert(todoInsert);
            if(error) {
                console.error("Error adding todo:", error);
                addToast('Error adding task', 'error');
            } else {
                addToast('Task added', 'success');
            }
        }
        setIsModalOpen(false);
        setEditingTodo(null);
    };

    const toggleTodo = async (id: string, currentStatus: boolean) => {
        const todoUpdate: TodoUpdate = { completed: !currentStatus };
        const { error } = await supabase.from('todos').update(todoUpdate).eq('id', id);
        if(error) {
            console.error("Error toggling todo:", error);
            addToast('Error changing task status', 'error');
        }
    };

    const deleteTodo = async (id: string) => {
        if(window.confirm('Delete this task?')) {
            const { error } = await supabase.from('todos').delete().eq('id', id);
            if(error) {
                console.error("Error deleting todo:", error);
                addToast('Error deleting task', 'error');
            } else {
                addToast('Task deleted', 'success');
            }
        }
    };

    const moveTodo = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === todos.length - 1)) return;
        
        const newTodos = [...todos];
        const item = newTodos[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        
        newTodos[index] = newTodos[swapIndex];
        newTodos[swapIndex] = item;

        const updates = newTodos.map((todo, i) => ({
            ...todo,
            position: i
        }));

        setTodos(newTodos); // Optimistic update

        const { error } = await supabase.from('todos').upsert(updates);

        if (error) {
            console.error("Error reordering todos:", error);
            addToast('Error reordering tasks', 'error');
            fetchTodos(); // Revert on error
        }
    };

    if (loading) return <div className="text-center p-8">Loading tasks...</div>;

    return (
        <div className="space-y-6">
            <button onClick={() => { setEditingTodo(null); setIsModalOpen(true); }} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-indigo-500">
                <PlusIcon className="h-5 w-5 mr-2" />
                Add New Task
            </button>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="space-y-3">
                    {todos.length > 0 ? todos.map((todo, index) => {
                        const category = (todo.category as ProjectCategory) || ProjectCategory.Others;
                        const categoryColor = CATEGORY_COLORS[category];
                        return (
                            <div key={todo.id} className={`flex items-center bg-gray-700 p-3 rounded-md hover:bg-gray-600/50 group border-l-4 ${categoryColor.border}`}>
                                <input type="checkbox" checked={todo.completed || false} onChange={() => toggleTodo(todo.id, todo.completed || false)} className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer" aria-labelledby={`todo-label-${todo.id}`} />
                                <span id={`todo-label-${todo.id}`} className={`ml-3 flex-1 text-white ${todo.completed ? 'line-through text-gray-500' : ''}`}>{todo.text}</span>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button aria-label={`Move task ${todo.text} up`} onClick={() => moveTodo(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-white disabled:opacity-30 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><ArrowUpIcon className="h-5 w-5" /></button>
                                    <button aria-label={`Move task ${todo.text} down`} onClick={() => moveTodo(index, 'down')} disabled={index === todos.length - 1} className="text-gray-400 hover:text-white disabled:opacity-30 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><ArrowDownIcon className="h-5 w-5" /></button>
                                    <button aria-label={`Edit task ${todo.text}`} onClick={() => { setEditingTodo(todo); setIsModalOpen(true); }} className="text-gray-400 hover:text-white p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><PencilIcon className="h-5 w-5" /></button>
                                    <button aria-label={`Delete task ${todo.text}`} onClick={() => deleteTodo(todo.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="text-center py-10">
                            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-500" />
                            <h3 className="mt-2 text-lg font-medium text-white">All clear!</h3>
                            <p className="mt-1 text-sm text-gray-400">You have no tasks. Add one to get started.</p>
                        </div>
                    )}
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTodo ? 'Edit Task' : 'Add Task'}>
                <TodoForm todo={editingTodo} onSave={handleSaveTodo} onCancel={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default TodosView;
