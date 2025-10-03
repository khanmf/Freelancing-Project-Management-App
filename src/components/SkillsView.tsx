import React, { useState } from 'react';
import { SubSkill, SkillCategory, SkillStatus, Skills } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { SKILL_CATEGORIES, SKILL_STATUSES, INITIAL_SKILLS } from '../constants';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon } from './icons/Icons';

const SubSkillForm: React.FC<{
  subSkill: SubSkill | null;
  onSave: (subSkill: SubSkill) => void;
  onCancel: () => void;
}> = ({ subSkill, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<SubSkill, 'id'>>({
    name: subSkill?.name || '',
    deadline: subSkill?.deadline || '',
    status: subSkill?.status || SkillStatus.Learning,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: subSkill?.id || Date.now().toString() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Skill / Task Name</label>
        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Target Date</label>
        <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Status</label>
        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as SkillStatus })} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
          {SKILL_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Save Skill</button>
      </div>
    </form>
  );
};


const SkillCategoryAccordion: React.FC<{
  category: SkillCategory;
  subSkills: SubSkill[];
  onAdd: (category: SkillCategory) => void;
  onEdit: (category: SkillCategory, subSkill: SubSkill) => void;
  onDelete: (category: SkillCategory, id: string) => void;
}> = ({ category, subSkills, onAdd, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);

  const getStatusColor = (status: SkillStatus) => {
    switch(status) {
      case SkillStatus.Learning: return 'border-l-4 border-blue-500';
      case SkillStatus.Practicing: return 'border-l-4 border-yellow-500';
      case SkillStatus.Mastered: return 'border-l-4 border-green-500';
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left">
        <h3 className="font-bold text-lg text-white">{category}</h3>
        <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-700">
          <button onClick={() => onAdd(category)} className="mb-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Sub-Skill
          </button>
          <div className="space-y-3">
            {subSkills.length > 0 ? subSkills.map(subSkill => (
              <div key={subSkill.id} className={`flex justify-between items-center bg-gray-700 p-3 rounded ${getStatusColor(subSkill.status)}`}>
                <div>
                  <p className="font-semibold text-white">{subSkill.name}</p>
                  <p className="text-sm text-gray-400">Target: {subSkill.deadline} - <span className="font-medium">{subSkill.status}</span></p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => onEdit(category, subSkill)} className="text-gray-400 hover:text-white"><PencilIcon className="h-5 w-5" /></button>
                  <button onClick={() => onDelete(category, subSkill.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5" /></button>
                </div>
              </div>
            )) : <p className="text-gray-500 italic">No skills added yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
};


const SkillsView: React.FC = () => {
    const [skills, setSkills] = useLocalStorage<Skills>('skills', INITIAL_SKILLS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<{ category: SkillCategory; subSkill: SubSkill | null } | null>(null);

    const handleAddSubSkill = (category: SkillCategory) => {
        setEditingSkill({ category, subSkill: null });
        setIsModalOpen(true);
    };

    const handleEditSubSkill = (category: SkillCategory, subSkill: SubSkill) => {
        setEditingSkill({ category, subSkill });
        setIsModalOpen(true);
    };

    const handleDeleteSubSkill = (category: SkillCategory, id: string) => {
        if(window.confirm('Are you sure you want to delete this skill?')) {
            const updatedSkills = {
                ...skills,
                [category]: skills[category].filter(s => s.id !== id),
            };
            setSkills(updatedSkills);
        }
    };

    const handleSaveSubSkill = (subSkill: SubSkill) => {
        if (editingSkill) {
            const { category } = editingSkill;
            let updatedSubSkills;
            if (editingSkill.subSkill) { // Editing existing
                updatedSubSkills = skills[category].map(s => s.id === subSkill.id ? subSkill : s);
            } else { // Adding new
                updatedSubSkills = [...skills[category], subSkill];
            }
            setSkills({ ...skills, [category]: updatedSubSkills });
        }
        setIsModalOpen(false);
        setEditingSkill(null);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {SKILL_CATEGORIES.map(category => (
                    <SkillCategoryAccordion 
                        key={category} 
                        category={category} 
                        subSkills={skills[category] || []}
                        onAdd={handleAddSubSkill}
                        onEdit={handleEditSubSkill}
                        onDelete={handleDeleteSubSkill}
                    />
                ))}
            </div>
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingSkill?.subSkill ? `Edit Skill in ${editingSkill.category}` : `Add Skill to ${editingSkill?.category}`}
            >
                {editingSkill && (
                    <SubSkillForm 
                        subSkill={editingSkill.subSkill} 
                        onSave={handleSaveSubSkill} 
                        onCancel={() => setIsModalOpen(false)} 
                    />
                )}
            </Modal>
        </div>
    );
};

export default SkillsView;
