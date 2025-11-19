
import React, { useState, useEffect, useCallback } from 'react';
import { Skill, SkillCategory, SkillStatus, Skills, Database } from '../types';
import { supabase } from '../supabaseClient';
import { SKILL_CATEGORIES, SKILL_STATUSES } from '../constants';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, CodeIcon } from './icons/Icons';

type SkillInsert = Database['public']['Tables']['skills']['Insert'];
type SkillUpdate = Database['public']['Tables']['skills']['Update'];

const SkillForm: React.FC<{
  skill: Skill | null;
  onSave: (skill: Omit<SkillInsert, 'category'>) => void;
  onCancel: () => void;
}> = ({ skill, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: skill?.name || '',
    deadline: skill?.deadline || '',
    status: skill?.status as SkillStatus || SkillStatus.Learning,
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Skill Name</label>
        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field w-full" required />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Target Date</label>
        <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="input-field w-full" required />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SkillStatus })} className="input-field w-full">
          {SKILL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">Save Skill</button>
      </div>
    </form>
  );
};


const SkillCategoryAccordion: React.FC<{
  category: SkillCategory;
  skills: Skill[];
  onAdd: (category: SkillCategory) => void;
  onEdit: (category: SkillCategory, skill: Skill) => void;
  onDelete: (id: string) => void;
}> = ({ category, skills, onAdd, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);

  const getStatusStyles = (status: string) => {
    switch(status) {
      case SkillStatus.Learning: return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      case SkillStatus.Practicing: return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case SkillStatus.Mastered: return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      default: return 'bg-slate-700/30 text-slate-400 border-slate-600';
    }
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden transition-all hover:border-white/10 hover:shadow-2xl group/accordion">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-5 text-left bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center space-x-3">
            <h3 className="font-bold text-lg text-white tracking-tight">{category}</h3>
            <span className="bg-white/10 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">{skills.length}</span>
        </div>
        <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <div className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
        <div className="p-5 border-t border-white/5 bg-slate-900/30">
          <button onClick={() => onAdd(category)} className="w-full py-2.5 mb-4 border-2 border-dashed border-white/10 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex items-center justify-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Skill
          </button>
          
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {skills.length > 0 ? skills.map(skill => (
              <div key={skill.id} className="flex justify-between items-center bg-white/5 p-3.5 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group/item">
                <div>
                  <p className="font-semibold text-slate-100 text-sm">{skill.name}</p>
                  <div className="flex items-center space-x-2 mt-1.5">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${getStatusStyles(skill.status)}`}>
                          {skill.status}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Target: {skill.deadline}</span>
                  </div>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(category, skill)} className="text-slate-500 hover:text-indigo-400 p-1.5 hover:bg-white/10 rounded-lg transition-colors"><PencilIcon className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(skill.id)} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-white/10 rounded-lg transition-colors"><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 italic">No active skills.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const SkillsView: React.FC = () => {
    const [skills, setSkills] = useState<Skills>({} as Skills);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<{ category: SkillCategory; skill: Skill | null } | null>(null);
    const { addToast } = useToast();

    const fetchSkills = useCallback(async () => {
        const { data, error } = await supabase.from('skills').select('*').order('created_at', { ascending: true });

        if (error) {
            addToast('Error fetching skills', 'error');
        } else {
            const groupedSkills = (data || []).reduce((acc, skill) => {
                const typedSkill = skill as Skill;
                const category = typedSkill.category as SkillCategory;
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(typedSkill);
                return acc;
            }, {} as Skills);
            setSkills(groupedSkills);
        }
        setLoading(false);
    }, [addToast]);

    useEffect(() => {
        fetchSkills();
        const channel = supabase.channel('skills-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'skills' }, (payload) => {
                fetchSkills();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchSkills]);

    const handleAddSkill = (category: SkillCategory) => {
        setEditingSkill({ category, skill: null });
        setIsModalOpen(true);
    };

    const handleEditSkill = (category: SkillCategory, skill: Skill) => {
        setEditingSkill({ category, skill });
        setIsModalOpen(true);
    };

    const handleDeleteSkill = async (id: string) => {
        if(window.confirm('Delete this skill?')) {
            const { error } = await supabase.from('skills').delete().eq('id', id);
            if (error) {
                addToast('Error deleting skill', 'error');
            } else {
                addToast('Skill deleted', 'success');
            }
        }
    };

    const handleSaveSkill = async (skillData: Omit<SkillInsert, 'category'>) => {
        if (editingSkill) {
            const { category, skill } = editingSkill;
            if (skill) {
                const skillUpdate: SkillUpdate = skillData;
                const { error } = await supabase.from('skills').update(skillUpdate).eq('id', skill.id);
                if(error) {
                    addToast('Error updating skill', 'error');
                } else {
                    addToast('Skill updated', 'success');
                }
            } else {
                const skillInsert: SkillInsert = { ...skillData, category };
                const { error } = await supabase.from('skills').insert(skillInsert);
                if(error) {
                    addToast('Error adding skill', 'error');
                } else {
                    addToast('Skill added', 'success');
                }
            }
        }
        setIsModalOpen(false);
        setEditingSkill(null);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SKILL_CATEGORIES.map(category => (
                    <SkillCategoryAccordion 
                        key={category} 
                        category={category} 
                        skills={skills[category] || []}
                        onAdd={handleAddSkill}
                        onEdit={handleEditSkill}
                        onDelete={handleDeleteSkill}
                    />
                ))}
            </div>
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingSkill?.skill ? `Edit Skill` : `Add Skill`}
            >
                {editingSkill && (
                    <SkillForm 
                        skill={editingSkill.skill} 
                        onSave={handleSaveSkill} 
                        onCancel={() => setIsModalOpen(false)} 
                    />
                )}
            </Modal>
        </div>
    );
};

export default SkillsView;
