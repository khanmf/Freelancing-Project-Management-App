
import { SkillCategory, ProjectStatus, SkillStatus, Skills, ProjectCategory } from './types';

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

export const SKILL_STATUSES: SkillStatus[] = [
  SkillStatus.Learning,
  SkillStatus.Practicing,
  SkillStatus.Mastered,
];


export const INITIAL_SKILLS: Skills = {
    [SkillCategory.AI]: [],
    [SkillCategory.AppDev]: [],
    [SkillCategory.Academic]: [],
    [SkillCategory.Marketing]: [],
    [SkillCategory.Chem]: [],
    [SkillCategory.Others]: [],
};
