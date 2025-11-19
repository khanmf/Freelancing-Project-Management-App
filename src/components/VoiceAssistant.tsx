
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, Blob, FunctionDeclaration } from '@google/genai';
import { supabase } from '../supabaseClient';
import { PROJECT_CATEGORIES, SKILL_CATEGORIES, SKILL_STATUSES } from '../constants';
import { TransactionType, Database, ProjectStatus, SubtaskStatus } from '../types';
import { MicrophoneIcon, XMarkIcon } from './icons/Icons';

// --- Type aliases ---
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type SkillInsert = Database['public']['Tables']['skills']['Insert'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];


// --- Audio Utility Functions ---
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

interface LiveSession {
    sendRealtimeInput(input: { media: Blob }): void;
    sendToolResponse(response: { functionResponses: any }): void;
    close(): void;
}


const functionDeclarations: FunctionDeclaration[] = [
    {
        name: 'addProject',
        description: 'Adds a new client project. Infer status as "To Do" unless specified.',
        parameters: {
            type: Type.OBJECT, properties: {
                name: { type: Type.STRING, description: 'The name of the project.' },
                client: { type: Type.STRING, description: 'The name of the client.' },
                deadline: { type: Type.STRING, description: 'The project deadline in YYYY-MM-DD format. Infer from spoken dates like "next Friday".' },
                category: { type: Type.STRING, enum: PROJECT_CATEGORIES, description: 'The category of the project.' },
            }, required: ['name', 'client', 'deadline', 'category'],
        },
    },
    {
        name: 'addSkill',
        description: 'Adds a new skill to track. Infer status as "Learning" unless specified.',
        parameters: {
            type: Type.OBJECT, properties: {
                name: { type: Type.STRING, description: 'The name of the skill.' },
                deadline: { type: Type.STRING, description: 'The target date for the skill in YYYY-MM-DD format.' },
                status: { type: Type.STRING, enum: SKILL_STATUSES, description: 'The current status of the skill.' },
                category: { type: Type.STRING, enum: SKILL_CATEGORIES, description: 'The category of the skill.' },
            }, required: ['name', 'deadline', 'category', 'status'],
        },
    },
    {
        name: 'addTransaction',
        description: 'Adds a new financial transaction (income or expense).',
        parameters: {
            type: Type.OBJECT, properties: {
                description: { type: Type.STRING, description: 'A description of the transaction.' },
                amount: { type: Type.NUMBER, description: 'The amount of the transaction.' },
                date: { type: Type.STRING, description: 'The date of the transaction in YYYY-MM-DD format.' },
                type: { type: Type.STRING, enum: Object.values(TransactionType), description: 'The type of transaction.' },
            }, required: ['description', 'amount', 'date', 'type'],
        },
    },
    {
        name: 'addTodo',
        description: 'Adds a new task to a specified project. The task will appear in the main to-do list.',
        parameters: {
            type: Type.OBJECT, properties: {
                text: { type: Type.STRING, description: 'The content of the to-do task.' },
                project_name: { type: Type.STRING, description: 'The name of the project this task belongs to.' },
            }, required: ['text', 'project_name'],
        },
    },
];

const VoiceAssistant: React.FC = () => {
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Click microphone to start');
    const [conversation, setConversation] = useState<{ speaker: 'user' | 'model' | 'system', text: string }[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const ai = useRef<GoogleGenAI | null>(null);
    const sessionPromise = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
    const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const inputAudioContext = useRef<AudioContext | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const nextStartTime = useRef(0);
    const sources = useRef(new Set<AudioBufferSourceNode>());

    useEffect(() => {
        const apiKey = process.env.API_KEY;
        if (apiKey) {
            ai.current = new GoogleGenAI({ apiKey: apiKey });
        } else {
            setStatusMessage("API Key missing");
        }
        return () => { stopListening(); };
    }, []);
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation]);

    const addConversationTurn = (speaker: 'user' | 'model' | 'system', text: string) => {
        setConversation(prev => [...prev, { speaker, text }]);
    };

    const handleToolCall = async (fc: any, session: LiveSession) => {
        let result = 'An unknown error occurred.';
        try {
            addConversationTurn('system', `⚡ Executing: ${fc.name}...`);

            switch (fc.name) {
                case 'addProject':
                    const newProject: ProjectInsert = {...fc.args, status: ProjectStatus.Todo};
                    await supabase.from('projects').insert(newProject);
                    result = `Project "${fc.args.name}" added successfully.`;
                    break;
                case 'addSkill':
                    const newSkill: SkillInsert = fc.args;
                    await supabase.from('skills').insert(newSkill);
                    result = `Skill "${fc.args.name}" added successfully.`;
                    break;
                case 'addTransaction':
                    const newTransaction: TransactionInsert = fc.args;
                    await supabase.from('transactions').insert(newTransaction);
                    result = `Transaction "${fc.args.description}" logged.`;
                    break;
                case 'addTodo':
                    const { data: projectData, error: projectError } = await supabase
                        .from('projects')
                        .select('id')
                        .ilike('name', `%${fc.args.project_name}%`)
                        .single();

                    if (projectError || !projectData) {
                        result = `Could not find project "${fc.args.project_name}".`;
                        break;
                    }
                    
                    const projectId = projectData.id;

                    const { data: subtasks } = await supabase
                        .from('subtasks')
                        .select('position')
                        .eq('project_id', projectId)
                        .order('position', { ascending: false })
                        .limit(1);

                    const lastSubtask = subtasks?.[0];
                    const newPosition = lastSubtask ? lastSubtask.position + 1 : 0;
                    
                    const newSubtask: Omit<SubtaskInsert, 'id' | 'created_at'> = { 
                        name: fc.args.text, 
                        status: SubtaskStatus.NotStarted, 
                        project_id: projectId,
                        position: newPosition,
                    };

                    await supabase.from('subtasks').insert(newSubtask);
                    result = `Task "${fc.args.text}" added to "${fc.args.project_name}".`;
                    break;
                default:
                    result = `Function ${fc.name} not found.`;
            }
        } catch (e: any) {
            result = `Error: ${e.message}`;
        }

        addConversationTurn('system', result);
        session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: result } } });
    };

    const stopListening = useCallback(() => {
        setIsListening(prev => {
            if (!prev && !streamRef.current) return prev;
            
            setStatusMessage('Click microphone to start');
            
            sessionPromise.current?.then(session => session.close()).catch(e => console.error(e));
            sessionPromise.current = null;

            audioProcessorRef.current?.disconnect();
            audioProcessorRef.current = null;
            mediaStreamSource.current?.disconnect();
            mediaStreamSource.current = null;
            
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            
            if (outputAudioContext.current) {
                for (const source of sources.current.values()) {
                    try { source.stop(); } catch (e) { }
                }
                sources.current.clear();
                nextStartTime.current = 0;
            }

            return false;
        });
    }, []);

    const startListening = useCallback(async () => {
        if (isListening) return;
        if (!ai.current) return;

        setIsListening(true);
        setStatusMessage('Connecting...');
        setConversation([]);
        
        let currentInputTranscription = '';
        let currentOutputTranscription = '';
        
        try {
            if (!inputAudioContext.current) inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            if (!outputAudioContext.current) outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            if (inputAudioContext.current.state === 'suspended') await inputAudioContext.current.resume();
            if (outputAudioContext.current.state === 'suspended') await outputAudioContext.current.resume();
        } catch (e) {
            setStatusMessage("Audio Error");
            setIsListening(false);
            return;
        }

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            setStatusMessage("Microphone blocked");
            setIsListening(false);
            return;
        }

        sessionPromise.current = ai.current.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setStatusMessage('Listening...');
                    if (!inputAudioContext.current || !streamRef.current) return;
                    
                    mediaStreamSource.current = inputAudioContext.current.createMediaStreamSource(streamRef.current);
                    const scriptProcessor = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
                    audioProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    mediaStreamSource.current.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.current.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        currentInputTranscription += text;
                        setConversation(prev => {
                            const last = prev[prev.length -1];
                            if(last?.speaker === 'user') {
                                return [...prev.slice(0, -1), {...last, text: currentInputTranscription}];
                            }
                            return [...prev, {speaker: 'user', text: currentInputTranscription}];
                        });
                    } else if(message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        currentOutputTranscription += text;
                        setConversation(prev => {
                            const last = prev[prev.length -1];
                            if(last?.speaker === 'model') {
                                return [...prev.slice(0, -1), {...last, text: currentOutputTranscription}];
                            }
                            return [...prev, {speaker: 'model', text: currentOutputTranscription}];
                        });
                    }

                    if (message.toolCall) {
                        const session = await sessionPromise.current;
                        if(session) {
                            for (const fc of message.toolCall.functionCalls) {
                                handleToolCall(fc, session);
                            }
                        }
                    }

                    if (message.serverContent?.turnComplete) {
                        currentInputTranscription = '';
                        currentOutputTranscription = '';
                    }

                    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64EncodedAudioString) {
                        const ctx = outputAudioContext.current!;
                        nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), ctx, 24000, 1);
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(ctx.destination);
                        source.addEventListener('ended', () => { sources.current.delete(source); });
                        source.start(nextStartTime.current);
                        nextStartTime.current += audioBuffer.duration;
                        sources.current.add(source);
                    }
                },
                onerror: (e) => {
                    setStatusMessage('Connection Error');
                    stopListening();
                },
                onclose: (e) => {
                    stopListening();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                outputAudioTranscription: {},
                tools: [{ functionDeclarations }],
                systemInstruction: "You are an intelligent freelance dashboard assistant. Be brief, professional, and helpful. Today is " + new Date().toLocaleDateString('en-CA') + ".",
            },
        });
    }, [isListening, stopListening]);

    const toggleListening = () => {
        if (isListening) stopListening();
        else startListening();
    };
    
    const handleCloseModal = () => {
        stopListening();
        setIsAssistantOpen(false);
    }

    return (
        <>
            <button
                onClick={() => setIsAssistantOpen(true)}
                className="fixed bottom-8 right-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full p-4 shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all hover:scale-105 focus:outline-none z-50 border border-white/10"
                aria-label="Open Voice Assistant"
            >
                <MicrophoneIcon className="h-7 w-7" />
            </button>
            
            {isAssistantOpen && (
                 <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center items-center" onClick={handleCloseModal}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
                            <div className="flex items-center space-x-3">
                                <div className={`h-2 w-2 rounded-full ${isListening ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                                <h2 className="text-lg font-bold text-white tracking-tight">Gemini Voice Assistant</h2>
                            </div>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="h-5 w-5"/></button>
                        </div>
                        
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/50">
                            {conversation.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-60">
                                    <MicrophoneIcon className="h-12 w-12" />
                                    <p>Say "Add a task" or "Log an expense"</p>
                                </div>
                            )}
                            {conversation.map((turn, index) => (
                                <div key={index} className={`flex flex-col ${turn.speaker === 'user' ? 'items-end' : turn.speaker === 'model' ? 'items-start' : 'items-center'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
                                        turn.speaker === 'user' ? 'bg-indigo-600 text-white rounded-br-none' :
                                        turn.speaker === 'model' ? 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5' :
                                        'bg-transparent text-indigo-300 text-xs py-1 shadow-none'
                                    }`}>
                                        <p className="text-sm leading-relaxed">{turn.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-slate-900 flex flex-col items-center justify-center space-y-4">
                            <p className={`text-xs font-medium uppercase tracking-widest ${isListening ? 'text-indigo-400' : 'text-slate-500'}`}>{statusMessage}</p>
                            <button 
                                onClick={toggleListening} 
                                className={`p-5 rounded-full transition-all duration-300 shadow-lg ${
                                    isListening 
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:bg-red-500/30' 
                                    : 'bg-indigo-600 text-white border border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-105'
                                }`}
                            >
                                <MicrophoneIcon className="h-8 w-8" />
                            </button>
                        </div>
                    </div>
                 </div>
            )}
        </>
    );
};

export default VoiceAssistant;
