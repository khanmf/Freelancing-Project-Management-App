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

// New enum for detailed subtask statuses
export enum SubtaskStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Completed = 'Completed',
}

export enum ProjectCategory {
  AppDev = 'App Development',
  AI = 'AI Automation',
  Academic = 'Academic Writing',
  Marketing = 'Digital Marketing',
  Chem = 'CADD/Computational Chemistry',
  Others = 'Others',
}

export enum SkillStatus {
  Learning = 'Learning',
  Practicing = 'Practicing',
  Mastered = 'Mastered',
}

export enum SkillCategory {
  AI = 'AI Automation',
  AppDev = 'App Development & System Design',
  Academic = 'Academic Publishing',
  Marketing = 'Digital Marketing',
  Chem = 'CADD/Computational Chemistry',
  Others = 'Others',
}

export enum TransactionType {
    Income = 'income',
    Expense = 'expense',
}

// These types are generated from the Supabase schema.
// A good practice would be to use Supabase CLI to generate these automatically.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          client: string
          deadline: string
          status: string
          category: string
          created_at: string | null
          budget: number | null
        }
        Insert: {
          id?: string
          name: string
          client: string
          deadline: string
          status: string
          category: string
          created_at?: string | null
          budget?: number | null
        }
        Update: {
          id?: string
          name?: string
          client?: string
          deadline?: string
          status?: string
          category?: string
          created_at?: string | null
          budget?: number | null
        }
        // FIX: Add Relationships array to fix 'never' type inference issues.
        Relationships: []
      }
      subtasks: {
        Row: {
          id: string
          name: string
          status: string
          project_id: string
          created_at: string | null
          assigned_to: string | null
          deadline: string | null
          position: number
        }
        Insert: {
          id?: string
          name: string
          status: string
          project_id: string
          created_at?: string | null
          assigned_to?: string | null
          deadline?: string | null
          position: number
        }
        Update: {
          id?: string
          name?: string
          status?: string
          project_id?: string
          created_at?: string | null
          assigned_to?: string | null
          deadline?: string | null
          position?: number
        }
        // FIX: Add Relationships array to fix 'never' type inference issues.
        Relationships: [
          {
            foreignKeyName: "subtasks_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      skills: {
        Row: {
          id: string
          name: string
          deadline: string
          status: string
          category: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          deadline: string
          status: string
          category: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          deadline?: string
          status?: string
          category?: string
          created_at?: string | null
        }
        // FIX: Add Relationships array to fix 'never' type inference issues.
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          description: string
          amount: number
          date: string
          type: string
          created_at: string | null
        }
        Insert: {
          id?: string
          description: string
          amount: number
          date: string
          type: string
          created_at?: string | null
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          date?: string
          type?: string
          created_at?: string | null
        }
        // FIX: Add Relationships array to fix 'never' type inference issues.
        Relationships: []
      }
      todos: {
        Row: {
          id: string
          text: string
          completed: boolean
          position: number
          created_at: string | null
          category: string | null
        }
        Insert: {
          id?: string
          text: string
          completed?: boolean
          position: number
          created_at?: string | null
          category: string
        }
        Update: {
          id?: string
          text?: string
          completed?: boolean
          position?: number
          created_at?: string | null
          category?: string
        }
        // FIX: Add Relationships array to fix 'never' type inference issues.
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Custom application types that may extend or combine the DB types
export type Project = Database['public']['Tables']['projects']['Row'] & {
  subtasks: Subtask[];
};
export type Subtask = Database['public']['Tables']['subtasks']['Row'];
export type Skill = Database['public']['Tables']['skills']['Row'];
export type Skills = Record<SkillCategory, Skill[]>;
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type Todo = Database['public']['Tables']['todos']['Row'];

// --- UI Types ---

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ToastContextType {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}
