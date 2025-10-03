import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Transaction, TransactionType, Database } from '../types';
import { supabase } from '../supabaseClient';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, TrendingUpIcon, TrendingDownIcon, ScaleIcon, ArrowUpIcon, ArrowDownIcon } from './icons/Icons';

type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

const TransactionForm: React.FC<{
  transaction: Transaction | null;
  onSave: (transaction: TransactionInsert) => void;
  onCancel: () => void;
}> = ({ transaction, onSave, onCancel }) => {
  const [formData, setFormData] = useState<TransactionInsert>({
    description: transaction?.description || '',
    amount: transaction?.amount || 0,
    date: transaction?.date || new Date().toISOString().split('T')[0],
    type: transaction?.type || TransactionType.Expense,
  });

  const formInputClasses = "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, amount: Number(formData.amount)});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Description</label>
        <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={formInputClasses} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Amount</label>
        <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className={formInputClasses} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Date</label>
        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={formInputClasses} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Type</label>
        <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })} className={formInputClasses}>
          <option value={TransactionType.Income}>Income</option>
          <option value={TransactionType.Expense}>Expense</option>
        </select>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Save Transaction</button>
      </div>
    </form>
  );
};

const FinancesView: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
    const { addToast } = useToast();

    const fetchTransactions = useCallback(async () => {
        const { data, error } = await supabase
            .from('transactions')
            .select('*');

        if (error) {
            console.error("Error fetching transactions:", error);
            addToast('Error fetching transactions', 'error');
        } else {
            setTransactions(data || []);
        }
        setLoading(false);
    }, [addToast]);

    useEffect(() => {
        fetchTransactions();
        const channel = supabase.channel('transactions-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                fetchTransactions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTransactions]);

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

    const SortableHeader: React.FC<{ sortKey: keyof Transaction; label: string; className?: string; }> = ({ sortKey, label, className }) => (
        <th onClick={() => requestSort(sortKey)} className={`p-2 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white ${className}`}>
          <div className="flex items-center">
            <span>{label}</span>
            {sortConfig?.key === sortKey && (
              sortConfig.direction === 'asc' ? <ArrowUpIcon className="h-4 w-4 ml-1" /> : <ArrowDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
        </th>
    );
    
    const handleAddTransaction = () => { setIsModalOpen(true); setEditingTransaction(null); };
    const handleEditTransaction = (transaction: Transaction) => { setIsModalOpen(true); setEditingTransaction(transaction); };
    const handleDeleteTransaction = async (id: string) => { 
        if(window.confirm('Delete this transaction?')) { 
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) {
                console.error("Error deleting transaction", error);
                addToast('Error deleting transaction', 'error');
            } else {
                addToast('Transaction deleted', 'success');
            }
        }
    };
    
    const handleSaveTransaction = async (transaction: TransactionInsert) => {
        if (editingTransaction) {
            const transactionUpdate: TransactionUpdate = transaction;
            const { error } = await supabase.from('transactions').update(transactionUpdate).eq('id', editingTransaction.id);
            if(error) {
                console.error("Error updating transaction", error);
                addToast('Error updating transaction', 'error');
            } else {
                addToast('Transaction updated', 'success');
            }
        } else {
            const { error } = await supabase.from('transactions').insert(transaction);
            if(error) {
                console.error("Error adding transaction", error);
                addToast('Error adding transaction', 'error');
            } else {
                addToast('Transaction added', 'success');
            }
        }
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    const incomeTransactions = sortedTransactions.filter(t => t.type === TransactionType.Income);
    const expenseTransactions = sortedTransactions.filter(t => t.type === TransactionType.Expense);

    if (loading) return <div className="text-center p-8">Loading finances...</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4 border border-gray-700"><div className="bg-green-500/20 p-3 rounded-full"><TrendingUpIcon className="h-6 w-6 text-green-400" /></div><div><p className="text-sm text-gray-400">Monthly Income</p><p className="text-2xl font-bold text-white">{formatCurrency(totalIncome)}</p></div></div>
            <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4 border border-gray-700"><div className="bg-red-500/20 p-3 rounded-full"><TrendingDownIcon className="h-6 w-6 text-red-400" /></div><div><p className="text-sm text-gray-400">Monthly Expenses</p><p className="text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</p></div></div>
            <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4 border border-gray-700"><div className="bg-indigo-500/20 p-3 rounded-full"><ScaleIcon className="h-6 w-6 text-indigo-400" /></div><div><p className="text-sm text-gray-400">Monthly Net</p><p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(netBalance)}</p></div></div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button onClick={handleAddTransaction} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-indigo-500"><PlusIcon className="h-5 w-5 mr-2"/>Add Transaction</button>
            <div>
                <label htmlFor="month-filter" className="text-sm font-medium text-gray-300 mr-2">Filter by Month:</label>
                <input type="month" id="month-filter" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800"/>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[ {title: 'Income', data: incomeTransactions, color: 'green'}, {title: 'Expenses', data: expenseTransactions, color: 'red'} ].map(table => (
            <div key={table.title} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="font-bold text-lg mb-4 text-white">{table.title}</h3>
              <div className="h-96 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-gray-800 z-10">
                    <tr>
                      <SortableHeader sortKey="description" label="Description" />
                      <SortableHeader sortKey="date" label="Date" />
                      <SortableHeader sortKey="amount" label="Amount" className="text-right" />
                      <th className="p-2"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {table.data.map(t => (
                      <tr key={t.id} className="hover:bg-gray-700/50">
                        <td className="p-2 text-white">{t.description}</td>
                        <td className="p-2 text-gray-400 whitespace-nowrap">{t.date}</td>
                        <td className={`p-2 text-${table.color}-400 text-right font-mono`}>{formatCurrency(t.amount)}</td>
                        <td className="p-2 flex justify-end space-x-2">
                            <button aria-label={`Edit transaction ${t.description}`} onClick={() => handleEditTransaction(t)} className="text-gray-400 hover:text-white p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800"><PencilIcon className="h-4 w-4" /></button>
                            <button aria-label={`Delete transaction ${t.description}`} onClick={() => handleDeleteTransaction(t.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800"><TrashIcon className="h-4 w-4" /></button>
                        </td>
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