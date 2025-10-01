
export enum View {
  Projects = 'projects',
  Skills = 'skills',
  Finances = 'finances',
  Todos = 'todos',
}

export enum ProjectStatus {
  Todo = 'To Do',
  InProgress = 'In Progress',
  Done = 'Done',
}

export interface Subtask {
  id: string;
  name: string;
  status: ProjectStatus;
}

export enum ProjectCategory {
  AppDev = 'App Development',
  AI = 'AI Automation',
  Academic = 'Academic Writing',
  Marketing = 'Digital Marketing',
  Chem = 'CADD/Computational Chemistry',
  Others = 'Others',
}

export interface Project {
  id: string;
  name: string;
  client: string;
  deadline: string;
  status: ProjectStatus;
  category: ProjectCategory;
  subtasks: Subtask[];
}

export enum SkillStatus {
  Learning = 'Learning',
  Practicing = 'Practicing',
  Mastered = 'Mastered',
}

export interface SubSkill {
  id: string;
  name: string;
  deadline: string;
  status: SkillStatus;
}

export enum SkillCategory {
  AI = 'AI Automation',
  AppDev = 'App Development & System Design',
  Academic = 'Academic Publishing',
  Marketing = 'Digital Marketing',
  Chem = 'CADD/Computational Chemistry',
  Others = 'Others',
}

export type Skills = Record<SkillCategory, SubSkill[]>;

export enum TransactionType {
    Income = 'income',
    Expense = 'expense',
}

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: TransactionType;
}

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
}
