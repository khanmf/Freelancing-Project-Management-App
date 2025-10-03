import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: Remove LiveSession from import as it's no longer exported.
import { GoogleGenAI, LiveServerMessage, Modality, Type, Blob, FunctionDeclaration } from '@google/genai';
import { supabase } from '../supabaseClient';
import { PROJECT_CATEGORIES, SKILL_CATEGORIES, SKILL_STATUSES } from '../constants';
import { TransactionType, Database, ProjectStatus } from '../types';
import { MicrophoneIcon, XMarkIcon } from './icons/Icons';

// --- Type aliases for Supabase operations ---
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type SkillInsert = Database['public']['Tables']['skills']['Insert'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TodoInsert = Database['public']['Tables']['todos']['Insert'];
type TodoRow = Database['public']['Tables']['todos']['Row'];

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
// --- End Audio Utility Functions ---

// FIX: Define a local LiveSession interface since it's not exported from the SDK.
interface LiveSession {
    sendRealtimeInput(input: { media: Blob }): void;
    sendToolResponse(response: { functionResponses: any }): void;
    close(): void;
}


// --- Gemini Function Declarations ---
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
        description: 'Adds a new task to the to-do list.',
        parameters: {
            type: Type.OBJECT, properties: {
                text: { type: Type.STRING, description: 'The content of the to-do task.' },
            }, required: ['text'],
        },
    },
];
// --- End Gemini Function Declarations ---

const VoiceAssistant: React.FC = () => {
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Click the mic to start');
    const [conversation, setConversation] = useState<{ speaker: 'user' | 'model' | 'system', text: string }[]>([]);
    
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
            console.error("API_KEY environment variable not set.");
            setStatusMessage("API Key not found.");
        }

        return () => {
            stopListening(); // Cleanup on unmount
        };
    }, []);

    const addConversationTurn = (speaker: 'user' | 'model' | 'system', text: string) => {
        setConversation(prev => [...prev, { speaker, text }]);
    };

    const handleToolCall = async (fc: any, session: LiveSession) => {
        let result = 'An unknown error occurred.';
        try {
            console.log('Executing tool call:', fc.name, fc.args);
            addConversationTurn('system', `Executing: ${fc.name}(${JSON.stringify(fc.args)})`);

            switch (fc.name) {
                case 'addProject':
                    const newProject: ProjectInsert = {...fc.args, status: ProjectStatus.Todo};
                    await supabase.from('projects').insert(newProject);
                    result = `Successfully added project: ${fc.args.name}`;
                    break;
                case 'addSkill':
                    const newSkill: SkillInsert = fc.args;
                    await supabase.from('skills').insert(newSkill);
                    result = `Successfully added skill: ${fc.args.name}`;
                    break;
                case 'addTransaction':
                    const newTransaction: TransactionInsert = fc.args;
                    await supabase.from('transactions').insert(newTransaction);
                    result = `Successfully logged transaction: ${fc.args.description}`;
                    break;
                case 'addTodo':
                    const { data: todos } = await supabase.from('todos').select('position').order('position', { ascending: false }).limit(1);
                    const lastTodo = todos?.[0] as TodoRow | undefined;
                    const newPosition = lastTodo ? lastTodo.position + 1 : 0;
                    const newTodo: TodoInsert = { text: fc.args.text, completed: false, position: newPosition };
                    await supabase.from('todos').insert(newTodo);
                    result = `Successfully added to-do: ${fc.args.text}`;
                    break;
                default:
                    result = `Function ${fc.name} is not implemented.`;
            }
        } catch (e: any) {
            console.error("Error executing tool call:", e);
            result = `Error executing ${fc.name}: ${e.message}`;
        }

        addConversationTurn('system', result);
        session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: result } } });
    };

    const stopListening = useCallback(() => {
        setIsListening(prev => {
            if (!prev && !streamRef.current) return prev;
            
            setStatusMessage('Click the mic to start');
            
            sessionPromise.current?.then(session => session.close()).catch(e => console.error("Error closing session:", e));
            sessionPromise.current = null;

            audioProcessorRef.current?.disconnect();
            audioProcessorRef.current = null;
            mediaStreamSource.current?.disconnect();
            mediaStreamSource.current = null;
            
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            
            if (outputAudioContext.current) {
                for (const source of sources.current.values()) {
                    try { source.stop(); } catch (e) { /* ignore error */ }
                }
                sources.current.clear();
                nextStartTime.current = 0;
            }

            return false;
        });
    }, []);

    const startListening = useCallback(async () => {
        if (isListening) return;

        if (!ai.current) {
            setStatusMessage("AI Client not initialized.");
            addConversationTurn('system', 'Error: AI Client is not ready. Check API Key.');
            return;
        }

        setIsListening(true);
        setStatusMessage('Initializing session...');
        setConversation([]);
        addConversationTurn('system', 'Starting voice session...');
        
        let currentInputTranscription = '';
        let currentOutputTranscription = '';
        
        try {
            if (!inputAudioContext.current) inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            if (!outputAudioContext.current) outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            if (inputAudioContext.current.state === 'suspended') await inputAudioContext.current.resume();
            if (outputAudioContext.current.state === 'suspended') await outputAudioContext.current.resume();
        } catch (e: any) {
            console.error("Error with AudioContext:", e);
            setStatusMessage("Audio system error.");
            addConversationTurn('system', `Error: Could not initialize audio system. ${e.message}`);
            setIsListening(false);
            return;
        }

        try {
            setStatusMessage('Accessing microphone...');
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStatusMessage('Microphone connected.');
        } catch (err: any) {
            console.error("Error getting microphone access:", err);
            setStatusMessage("Microphone access denied.");
            addConversationTurn('system', "Error: Could not access microphone. Please check browser permissions.");
            setIsListening(false);
            return;
        }

        setStatusMessage('Connecting to assistant...');
        sessionPromise.current = ai.current.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setStatusMessage('Listening... Speak now.');
                    if (!inputAudioContext.current || !streamRef.current) {
                        console.error("Audio context or stream is missing in onopen.");
                        stopListening();
                        return;
                    }
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
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setStatusMessage('Session Error.');
                    addConversationTurn('system', `Error: ${e.message}`);
                    stopListening();
                },
                onclose: (e: CloseEvent) => {
                    console.debug('Session closed.');
                    stopListening();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                outputAudioTranscription: {},
                tools: [{ functionDeclarations }],
                systemInstruction: "You are a helpful assistant for a freelancer's dashboard. Your goal is to help the user manage their projects, skills, finances, and tasks. Be concise and clear. When a date is mentioned like 'next Friday' or 'end of the month', convert it to a YYYY-MM-DD format based on the current date. Today's date is " + new Date().toLocaleDateString('en-CA') + ".",
            },
        });
        
        sessionPromise.current.catch(err => {
            console.error("Failed to connect to Gemini Live session:", err);
            setStatusMessage("Connection failed.");
            addConversationTurn('system', `Error: Could not connect to the voice assistant. ${err.message}`);
            stopListening();
        });
    }, [isListening, stopListening]);

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };
    
    const handleCloseModal = () => {
        stopListening();
        setIsAssistantOpen(false);
    }

    return (
        <>
            <button
                onClick={() => setIsAssistantOpen(true)}
                className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 z-50"
                aria-label="Open Voice Assistant"
            >
                <MicrophoneIcon className="h-8 w-8" />
            </button>
            {isAssistantOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={handleCloseModal}>
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col border border-gray-700 p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-3">
                            <h2 className="text-xl font-bold text-white">Voice Assistant</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {conversation.map((turn, index) => (
                                <div key={index} className={`flex flex-col ${turn.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                        turn.speaker === 'user' ? 'bg-indigo-600 text-white' :
                                        turn.speaker === 'model' ? 'bg-gray-700 text-gray-200' :
                                        'bg-gray-900 text-yellow-400 text-xs italic'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap">{turn.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-700 pt-4 flex flex-col items-center">
                             <p className="text-sm text-gray-400 mb-4 h-5">{statusMessage}</p>
                            <button onClick={toggleListening} className={`p-4 rounded-full transition-colors ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                <MicrophoneIcon className="h-8 w-8 text-white"/>
                            </button>
                        </div>
                    </div>
                 </div>
            )}
        </>
    );
};

export default VoiceAssistant;