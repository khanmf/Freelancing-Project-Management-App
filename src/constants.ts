
import { SkillCategory, ProjectStatus, SkillStatus, ProjectCategory, SubtaskStatus } from './types';

export const SKILL_CATEGORIES: SkillCategory[] = [
  SkillCategory.AI,
  SkillCategory.AppDev,
  SkillCategory.Academic,
  SkillCategory.Marketing,
  SkillCategory.Chem,
  SkillCategory.Others,
];

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  ProjectCategory.AppDev,
  ProjectCategory.AI,
  ProjectCategory.Academic,
  ProjectCategory.Marketing,
  ProjectCategory.Chem,
  ProjectCategory.Others,
];


export const PROJECT_STATUSES: ProjectStatus[] = [
  ProjectStatus.Todo,
  ProjectStatus.InProgress,
  ProjectStatus.Done,
];

export const SUBTASK_STATUSES: SubtaskStatus[] = [
  SubtaskStatus.NotStarted,
  SubtaskStatus.InProgress,
  SubtaskStatus.Completed,
];

export const SKILL_STATUSES: SkillStatus[] = [
  SkillStatus.Learning,
  SkillStatus.Practicing,
  SkillStatus.Mastered,
];

export const CATEGORY_COLORS: Record<ProjectCategory, { border: string; bg: string; text: string; ring: string }> = {
  [ProjectCategory.AppDev]: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500/20' },
  [ProjectCategory.AI]: { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500/20' },
  [ProjectCategory.Academic]: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500/20' },
  [ProjectCategory.Marketing]: { border: 'border-pink-500/30', bg: 'bg-pink-500/10', text: 'text-pink-400', ring: 'ring-pink-500/20' },
  [ProjectCategory.Chem]: { border: 'border-teal-500/30', bg: 'bg-teal-500/10', text: 'text-teal-400', ring: 'ring-teal-500/20' },
  [ProjectCategory.Others]: { border: 'border-slate-500/30', bg: 'bg-slate-500/10', text: 'text-slate-400', ring: 'ring-slate-500/20' },
};

export const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; ring: string }> = {
  [ProjectStatus.Todo]: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', ring: 'ring-yellow-500/20' },
  [ProjectStatus.InProgress]: { bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500/20' },
  [ProjectStatus.Done]: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
};
