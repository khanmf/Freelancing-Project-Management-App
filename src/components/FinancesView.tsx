
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, amount: Number(formData.amount)});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
        <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field w-full" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount ($)</label>
            <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-field w-full" required />
          </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
        <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.Income})} className={`py-2 rounded-lg border font-medium transition-all ${formData.type === TransactionType.Income ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}>Income</button>
            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.Expense})} className={`py-2 rounded-lg border font-medium transition-all ${formData.type === TransactionType.Expense ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}>Expense</button>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">Save Transaction</button>
      </div>
    </form>
  );
};

const FinancesView: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
    const { addToast } = useToast();

    const fetchTransactions = useCallback(async () => {
        const { data, error } = await supabase.from('transactions').select('*');
        if (error) {
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
        <th onClick={() => requestSort(sortKey)} className={`p-3 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors ${className}`}>
          <div className="flex items-center gap-1">
            <span>{label}</span>
            {sortConfig?.key === sortKey && (
              sortConfig.direction === 'asc' ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />
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
                addToast('Error updating transaction', 'error');
            } else {
                addToast('Transaction updated', 'success');
            }
        } else {
            const { error } = await supabase.from('transactions').insert(transaction);
            if(error) {
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

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 h-24 w-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                <div className="flex items-center space-x-4 relative z-10">
                    <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-3.5 rounded-xl border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10">
                        <TrendingUpIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-400">Income</p>
                        <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalIncome)}</p>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                 <div className="absolute -right-6 -top-6 h-24 w-24 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-all duration-500"></div>
                <div className="flex items-center space-x-4 relative z-10">
                    <div className="bg-gradient-to-br from-red-500/20 to-rose-500/20 p-3.5 rounded-xl border border-red-500/20 text-red-400 shadow-lg shadow-red-500/10">
                        <TrendingDownIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-400">Expenses</p>
                        <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalExpenses)}</p>
                    </div>
                </div>
            </div>

             <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 h-24 w-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                <div className="flex items-center space-x-4 relative z-10">
                    <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-3.5 rounded-xl border border-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/10">
                        <ScaleIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-400">Net Balance</p>
                        <p className={`text-3xl font-bold tracking-tight ${netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(netBalance)}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button onClick={handleAddTransaction} className="primary-gradient px-5 py-2.5 rounded-xl text-sm font-medium flex items-center shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95">
                <PlusIcon className="h-5 w-5 mr-2"/> Add Transaction
            </button>
            <div className="flex items-center space-x-3 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                <span className="text-sm font-medium text-slate-400 ml-3">Month:</span>
                <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-transparent border-none text-white text-sm focus:ring-0 cursor-pointer"/>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[ {title: 'Income Stream', data: incomeTransactions, color: 'emerald'}, {title: 'Expense Log', data: expenseTransactions, color: 'red'} ].map(table => (
            <div key={table.title} className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                  <h3 className={`font-bold text-lg ${table.color === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>{table.title}</h3>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full bg-${table.color}-500/10 text-${table.color}-300 border border-${table.color}-500/20`}>
                      {table.data.length} entries
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 shadow-sm">
                    <tr>
                      <SortableHeader sortKey="description" label="Description" className="pl-5" />
                      <SortableHeader sortKey="date" label="Date" />
                      <SortableHeader sortKey="amount" label="Amount" className="text-right pr-5" />
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {table.data.map(t => (
                      <tr key={t.id} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="p-4 pl-5 text-slate-200 font-medium">{t.description}</td>
                        <td className="p-4 text-slate-400 text-sm whitespace-nowrap font-mono">{t.date}</td>
                        <td className={`p-4 pr-5 text-right font-mono font-semibold ${table.color === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(t.amount)}</td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditTransaction(t)} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"><PencilIcon className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteTransaction(t.id)} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-white/10 rounded-lg transition-colors"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        </td>
                      </tr>
                    ))}
                    {table.data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-500 italic">No records found for this month.</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction ? "Edit Transaction" : "New Transaction"}><TransactionForm transaction={editingTransaction} onSave={handleSaveTransaction} onCancel={() => setIsModalOpen(false)} /></Modal>
      </div>
    );
};

export default FinancesView;
