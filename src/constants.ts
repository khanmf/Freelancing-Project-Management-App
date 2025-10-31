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

export const CATEGORY_COLORS: Record<ProjectCategory, { border: string; bg: string; text: string; }> = {
  [ProjectCategory.AppDev]: { border: 'border-blue-400', bg: 'bg-blue-500/20', text: 'text-blue-300' },
  [ProjectCategory.AI]: { border: 'border-purple-400', bg: 'bg-purple-500/20', text: 'text-purple-300' },
  [ProjectCategory.Academic]: { border: 'border-amber-400', bg: 'bg-amber-500/20', text: 'text-amber-300' },
  [ProjectCategory.Marketing]: { border: 'border-pink-400', bg: 'bg-pink-500/20', text: 'text-pink-300' },
  [ProjectCategory.Chem]: { border: 'border-teal-400', bg: 'bg-teal-500/20', text: 'text-teal-300' },
  [ProjectCategory.Others]: { border: 'border-gray-400', bg: 'bg-gray-500/20', text: 'text-gray-300' },
};

export const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; }> = {
  [ProjectStatus.Todo]: { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  [ProjectStatus.InProgress]: { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  [ProjectStatus.Done]: { bg: 'bg-green-500/20', text: 'text-green-300' },
};