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
  
  const formInputClasses = "mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Skill / Task Name</label>
        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={formInputClasses} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Target Date</label>
        <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className={formInputClasses} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Status</label>
        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SkillStatus })} className={formInputClasses}>
          {SKILL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">Save Skill</button>
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case SkillStatus.Learning: return 'border-l-4 border-blue-500';
      case SkillStatus.Practicing: return 'border-l-4 border-yellow-500';
      case SkillStatus.Mastered: return 'border-l-4 border-green-500';
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 transition-shadow hover:shadow-lg hover:border-gray-600">
      <button aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left rounded-t-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">
        <h3 className="font-bold text-lg text-white">{category}</h3>
        <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-700">
          <button onClick={() => onAdd(category)} className="mb-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-800">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Skill
          </button>
          <div className="space-y-3">
            {skills.length > 0 ? skills.map(skill => (
              <div key={skill.id} className={`flex justify-between items-center bg-gray-700 p-3 rounded ${getStatusColor(skill.status)}`}>
                <div>
                  <p className="font-semibold text-white">{skill.name}</p>
                  <p className="text-sm text-gray-400">Target: {skill.deadline} - <span className="font-medium">{skill.status}</span></p>
                </div>
                <div className="flex space-x-2">
                  <button aria-label={`Edit skill ${skill.name}`} onClick={() => onEdit(category, skill)} className="text-gray-400 hover:text-white p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><PencilIcon className="h-5 w-5" /></button>
                  <button aria-label={`Delete skill ${skill.name}`} onClick={() => onDelete(skill.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-gray-700"><TrashIcon className="h-5 w-5" /></button>
                </div>
              </div>
            )) : (
              <div className="text-center py-6">
                <CodeIcon className="mx-auto h-8 w-8 text-gray-500" />
                <p className="mt-2 text-sm text-gray-500">No skills added here yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
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
        const { data, error } = await supabase
            .from('skills')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching skills:', error);
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
        if(window.confirm('Are you sure you want to delete this skill?')) {
            const { error } = await supabase.from('skills').delete().eq('id', id);
            if (error) {
                console.error("Error deleting skill:", error);
                addToast('Error deleting skill', 'error');
            } else {
                addToast('Skill deleted', 'success');
            }
        }
    };

    const handleSaveSkill = async (skillData: Omit<SkillInsert, 'category'>) => {
        if (editingSkill) {
            const { category, skill } = editingSkill;
            if (skill) { // Editing existing
                const skillUpdate: SkillUpdate = skillData;
                const { error } = await supabase.from('skills').update(skillUpdate).eq('id', skill.id);
                if(error) {
                    console.error("Error updating skill:", error);
                    addToast('Error updating skill', 'error');
                } else {
                    addToast('Skill updated', 'success');
                }
            } else { // Adding new
                const skillInsert: SkillInsert = { ...skillData, category };
                const { error } = await supabase.from('skills').insert(skillInsert);
                if(error) {
                    console.error("Error adding skill:", error);
                    addToast('Error adding skill', 'error');
                } else {
                    addToast('Skill added', 'success');
                }
            }
        }
        setIsModalOpen(false);
        setEditingSkill(null);
    };

    if (loading) return <div className="text-center p-8">Loading skills...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                title={editingSkill?.skill ? `Edit Skill in ${editingSkill.category}` : `Add Skill to ${editingSkill?.category}`}
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