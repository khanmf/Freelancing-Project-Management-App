
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Modal from './Modal';
import { ProjectCategory } from '../types';
import { PROJECT_CATEGORIES } from '../constants';

interface AIProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectGenerated: (data: {
    name: string;
    client: string;
    deadline: string;
    category: ProjectCategory;
    subtasks: string[];
  }) => void;
}

const AIProjectModal: React.FC<AIProjectModalProps> = ({ isOpen, onClose, onProjectGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ai = useRef<GoogleGenAI | null>(null);

  if (!ai.current) {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      ai.current = new GoogleGenAI({ apiKey });
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || !ai.current) {
      setError('Please enter a project description.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The name of the project.' },
                client: { type: Type.STRING, description: 'The name of the client.' },
                deadline: { type: Type.STRING, description: 'The project deadline in YYYY-MM-DD format. Infer from spoken dates like "next Friday".' },
                category: { type: Type.STRING, enum: PROJECT_CATEGORIES, description: 'The category of the project.' },
                subtasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of 3-5 suggested subtasks for this project.'}
            },
            required: ['name', 'client', 'deadline', 'category', 'subtasks'],
        };
        
      const response = await ai.current.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Parse the following project description and extract the details. Today's date is ${new Date().toLocaleDateString('en-CA')}. Description: "${prompt}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      });
      
      const generatedText = response.text;
      const parsedData = JSON.parse(generatedText);
      
      if (parsedData.name && parsedData.client && parsedData.deadline && parsedData.category) {
          onProjectGenerated(parsedData);
      } else {
        throw new Error("AI response was missing required fields.");
      }

    } catch (e) {
      console.error('Error generating project with AI:', e);
      setError('Could not generate project details. Please try rephrasing.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Project with AI">
      <div className="space-y-5">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
            <p className="text-sm text-indigo-200">
            Describe your project, and Gemini will extract the details and suggest subtasks for you.
            </p>
        </div>
        
        <div>
            <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Build a marketing website for 'TechNova' due by next Friday..."
            className="input-field w-full h-32 resize-none"
            disabled={isLoading}
            />
            <p className="text-xs text-slate-500 mt-2 text-right">Be specific about dates and client names.</p>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors" disabled={isLoading}>
            Cancel
          </button>
          <button type="button" onClick={handleGenerate} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all flex items-center" disabled={isLoading}>
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Thinking...
              </>
            ) : 'Generate'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AIProjectModal;
