import React, { useState } from 'react';
import { Todo } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from './icons/Icons';

const TodoForm: React.FC<{ todo: Todo | null; onSave: (text: string) => void; onCancel: () => void; }> = ({ todo, onSave, onCancel }) => {
    const [text, setText] = useState(todo?.text || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSave(text);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={text} onChange={e => setText(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter a task..." required />
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Save Task</button>
            </div>
        </form>
    );
};

const TodosView: React.FC = () => {
    const [todos, setTodos] = useLocalStorage<Todo[]>('todos', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

    const handleSaveTodo = (text: string) => {
        if (editingTodo) {
            setTodos(todos.map(t => t.id === editingTodo.id ? { ...t, text } : t));
        } else {
            setTodos([...todos, { id: Date.now().toString(), text, completed: false }]);
        }
        setIsModalOpen(false);
        setEditingTodo(null);
    };

    const toggleTodo = (id: string) => {
        setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTodo = (id: string) => {
        if(window.confirm('Delete this task?')) {
            setTodos(todos.filter(t => t.id !== id));
        }
    };

    const moveTodo = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === todos.length - 1) return;
        
        const newTodos = [...todos];
        const item = newTodos[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        newTodos[index] = newTodos[swapIndex];
        newTodos[swapIndex] = item;
        setTodos(newTodos);
    };

    return (
        <div className="space-y-6">
            <button onClick={() => { setEditingTodo(null); setIsModalOpen(true); }} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500">
                <PlusIcon className="h-5 w-5 mr-2" />
                Add New Task
            </button>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="space-y-3">
                    {todos.map((todo, index) => (
                        <div key={todo.id} className="flex items-center bg-gray-700 p-3 rounded-md hover:bg-gray-600/50 group">
                            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                            <span className={`ml-3 flex-1 text-white ${todo.completed ? 'line-through text-gray-500' : ''}`}>{todo.text}</span>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => moveTodo(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-white disabled:opacity-30"><ArrowUpIcon className="h-5 w-5" /></button>
                                <button onClick={() => moveTodo(index, 'down')} disabled={index === todos.length - 1} className="text-gray-400 hover:text-white disabled:opacity-30"><ArrowDownIcon className="h-5 w-5" /></button>
                                <button onClick={() => { setEditingTodo(todo); setIsModalOpen(true); }} className="text-gray-400 hover:text-white"><PencilIcon className="h-5 w-5" /></button>
                                <button onClick={() => deleteTodo(todo.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                    ))}
                    {todos.length === 0 && <p className="text-center text-gray-500 italic">No tasks yet. Add one!</p>}
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTodo ? 'Edit Task' : 'Add Task'}>
                <TodoForm todo={editingTodo} onSave={handleSaveTodo} onCancel={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default TodosView;
