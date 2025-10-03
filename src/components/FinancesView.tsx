import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, TrendingUpIcon, TrendingDownIcon, ScaleIcon } from './icons/Icons';

const TransactionForm: React.FC<{
  transaction: Transaction | null;
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
}> = ({ transaction, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
    description: transaction?.description || '',
    amount: transaction?.amount || 0,
    date: transaction?.date || new Date().toISOString().split('T')[0],
    type: transaction?.type || TransactionType.Expense,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, amount: Number(formData.amount), id: transaction?.id || Date.now().toString() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Description</label>
        <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Amount</label>
        <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Date</label>
        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Type</label>
        <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
          <option value={TransactionType.Income}>Income</option>
          <option value={TransactionType.Expense}>Expense</option>
        </select>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Save Transaction</button>
      </div>
    </form>
  );
};

const FinancesView: React.FC = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>(null);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => t.date.startsWith(filterMonth));
    }, [transactions, filterMonth]);
    
    const sortedTransactions = useMemo(() => {
        let sortableItems = [...filteredTransactions];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredTransactions, sortConfig]);

    const { totalIncome, totalExpenses, netBalance } = useMemo(() => {
        const income = sortedTransactions.filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0);
        const expenses = sortedTransactions.filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + t.amount, 0);
        return { totalIncome: income, totalExpenses: expenses, netBalance: income - expenses };
    }, [sortedTransactions]);

    const requestSort = (key: keyof Transaction) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const handleAddTransaction = () => { setIsModalOpen(true); setEditingTransaction(null); };
    const handleEditTransaction = (transaction: Transaction) => { setIsModalOpen(true); setEditingTransaction(transaction); };
    const handleDeleteTransaction = (id: string) => { if(window.confirm('Delete this transaction?')) { setTransactions(transactions.filter(t => t.id !== id)); }};
    
    const handleSaveTransaction = (transaction: Transaction) => {
        if (editingTransaction) {
            setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
        } else {
            setTransactions([...transactions, transaction]);
        }
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    const incomeTransactions = sortedTransactions.filter(t => t.type === TransactionType.Income);
    const expenseTransactions = sortedTransactions.filter(t => t.type === TransactionType.Expense);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4 border border-gray-700"><div className="bg-green-500/20 p-3 rounded-full"><TrendingUpIcon className="h-6 w-6 text-green-400" /></div><div><p className="text-sm text-gray-400">Monthly Income</p><p className="text-2xl font-bold text-white">{formatCurrency(totalIncome)}</p></div></div>
            <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4 border border-gray-700"><div className="bg-red-500/20 p-3 rounded-full"><TrendingDownIcon className="h-6 w-6 text-red-400" /></div><div><p className="text-sm text-gray-400">Monthly Expenses</p><p className="text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</p></div></div>
            <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4 border border-gray-700"><div className="bg-indigo-500/20 p-3 rounded-full"><ScaleIcon className="h-6 w-6 text-indigo-400" /></div><div><p className="text-sm text-gray-400">Monthly Net</p><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(netBalance)}</p></div></div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button onClick={handleAddTransaction} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"><PlusIcon className="h-5 w-5 mr-2"/>Add Transaction</button>
            <div>
                <label htmlFor="month-filter" className="text-sm font-medium text-gray-300 mr-2">Filter by Month:</label>
                <input type="month" id="month-filter" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[ {title: 'Income', data: incomeTransactions, color: 'green'}, {title: 'Expenses', data: expenseTransactions, color: 'red'} ].map(table => (
            <div key={table.title} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="font-bold text-lg mb-4 text-white">{table.title}</h3>
              <div className="h-96 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr>
                      <th onClick={() => requestSort('description')} className="p-2 text-sm font-semibold text-gray-400 cursor-pointer">Description</th>
                      <th onClick={() => requestSort('date')} className="p-2 text-sm font-semibold text-gray-400 cursor-pointer">Date</th>
                      <th onClick={() => requestSort('amount')} className="p-2 text-sm font-semibold text-gray-400 text-right cursor-pointer">Amount</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {table.data.map(t => (
                      <tr key={t.id} className="hover:bg-gray-700/50">
                        <td className="p-2 text-white">{t.description}</td>
                        <td className="p-2 text-gray-400 whitespace-nowrap">{t.date}</td>
                        <td className={`p-2 text-${table.color}-400 text-right font-mono`}>{formatCurrency(t.amount)}</td>
                        <td className="p-2 flex justify-end space-x-2"><button onClick={() => handleEditTransaction(t)} className="text-gray-400 hover:text-white"><PencilIcon className="h-4 w-4" /></button><button onClick={() => handleDeleteTransaction(t.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction ? "Edit Transaction" : "Add Transaction"}><TransactionForm transaction={editingTransaction} onSave={handleSaveTransaction} onCancel={() => setIsModalOpen(false)} /></Modal>
      </div>
    );
};

export default FinancesView;
