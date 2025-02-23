import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Maximize2, Minimize2, ChevronDown, ChevronRight, PlusCircle, Copy, MousePointerClick } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { stripJsonComments } from '@/lib/utils';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sections?: {
        thinking?: string;
        [key: string]: string | undefined;
    };
    collapsedSections?: {
        thinking?: boolean;
        [key: string]: boolean | undefined;
    };
    sectionData?: {
        [key: string]: any;
    };
}

interface AIAssistantProps {
    onSuggest: (data: any) => void;
    endpoint: string;
    storageKey: string;
    sections?: string[];
    includeHistory?: boolean;
}

interface ChatStore {
    messages: Message[];
    suggestionHistory: Array<{ section: string; data: any }>;
    addMessage: (message: Message) => void;
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
    clearMessages: () => void;
    addToHistory: (section: string, data: any) => void;
}

const createChatStore = (storageKey: string) => create<ChatStore>()(
    persist(
        (set, get) => ({
            messages: [],
            suggestionHistory: [],
            addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
            setMessages: (messages) => set({ messages: typeof messages === 'function' ? messages(get().messages) : messages }),
            clearMessages: () => set({ messages: [] }),
            addToHistory: (section: string, data: any) => set((state) => ({
                suggestionHistory: [...state.suggestionHistory, { section, data }]
            })),
        }),
        {
            name: storageKey,
        }
    )
);

export function AIAssistant({ onSuggest, endpoint, storageKey, sections = [], includeHistory = true }: AIAssistantProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const useChatStore = useRef(createChatStore(storageKey));
    const { messages, setMessages, clearMessages } = useChatStore.current();
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isAtBottom = (container: HTMLElement) => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        return Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    };

    const scrollToBottom = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        if (shouldAutoScroll || isAtBottom(container)) {
            messagesEndRef.current?.scrollIntoView();
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isExpanded, shouldAutoScroll]);

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        setShouldAutoScroll(isAtBottom(container));
    };

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container && isAtBottom(container)) {
            scrollToBottom();
        }
    }, [messages, isExpanded]);

    const toggleSection = (messageIndex: number, section: string) => {
        setMessages(prev => prev.map((msg, idx) => {
            if (idx === messageIndex) {
                return {
                    ...msg,
                    collapsedSections: {
                        ...msg.collapsedSections,
                        [section]: !msg.collapsedSections?.[section]
                    }
                };
            }
            return msg;
        }));
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;
        if (!isExpanded) setIsExpanded(true);
        if (!shouldAutoScroll) setShouldAutoScroll(true);

        const userMessage = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: includeHistory
                        ? [...messages, userMessage].map(({ role, content }) => ({ role, content }))
                        : [userMessage].map(({ role, content }) => ({ role, content }))
                }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            if (!response.body) throw new Error('No response body');

            reader = response.body.getReader();
            let currentAssistantMessage = '';
            let currentThinking = '';
            let currentChatMessage = '';
            let currentSections: Record<string, string> = {};
            let dataFound = false;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '',
                sections: { thinking: '', ...sections.reduce((acc, section) => ({ ...acc, [section]: '' }), {}) },
                collapsedSections: {
                    thinking: true,
                    ...sections.reduce((acc, section) => ({ ...acc, [section]: true }), {})
                }
            }]);

            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value, { stream: true });
                    currentAssistantMessage += text;

                    // Process sections
                    sections.forEach(section => {
                        if (currentAssistantMessage.includes(`<${section}>`)) {
                            const parts = currentAssistantMessage.split(`<${section}>`);
                            if (parts[0].includes("</think>")) {
                                const thinkParts = parts[0].split("</think>");
                                currentThinking = thinkParts[0].replace("<think>", "").trim();
                                currentChatMessage = thinkParts[1].trim();
                            } else {
                                currentThinking = parts[0].replace("<think>", "").trim();
                                currentChatMessage = "";
                            }
                            currentSections[section] = parts[1] ? `<${section}>${parts[1]}` : '';
                        }
                    });

                    if (currentAssistantMessage.includes("</think>") && !sections.some(section => currentAssistantMessage.includes(`<${section}>`))) {
                        const parts = currentAssistantMessage.split("</think>");
                        currentThinking = parts[0].replace("<think>", "").trim();
                        currentChatMessage = parts[1].trim();
                    } else if (!sections.some(section => currentAssistantMessage.includes(`<${section}>`))) {
                        currentThinking = currentAssistantMessage.replace("<think>", "").trim();
                        currentChatMessage = "";
                    }

                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage?.role === 'assistant') {
                            lastMessage.content = currentChatMessage;
                            lastMessage.sections = {
                                thinking: currentThinking,
                                ...currentSections
                            };
                            if (!lastMessage.collapsedSections) {
                                lastMessage.collapsedSections = {
                                    thinking: true,
                                    ...sections.reduce((acc, section) => ({ ...acc, [section]: true }), {})
                                };
                            }
                        }
                        return newMessages;
                    });

                    if (!dataFound) {
                        for (const section of sections) {
                            const match = currentSections[section]?.match(new RegExp(`<${section}>\\n([\\s\\S]*?)\\n<\/${section}>`));
                            if (match) {
                                try {
                                    const data = JSON.parse(stripJsonComments(match[1]));
                                    onSuggest(data.elements);
                                    dataFound = true;
                                    break;
                                } catch (error) {
                                    console.debug('Incorrect JSON Data...');
                                    console.debug(match[1]);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Stream reading error:', error);
                throw error;
            } finally {
                reader.releaseLock();
            }

        } catch (error) {
            console.error('AI Assistant Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Error',
                sections: {
                    thinking: 'Error',
                    ...sections.reduce((acc, section) => ({ ...acc, [section]: '' }), {})
                },
                collapsedSections: {
                    thinking: false,
                    ...sections.reduce((acc, section) => ({ ...acc, [section]: false }), {})
                }
            }]);
        } finally {
            setIsLoading(false);
            if (reader) {
                try {
                    reader.releaseLock();
                } catch (e) {
                    console.debug('Error releasing reader lock:', e);
                }
            }
        }
    };

    const handleNewChat = () => {
        if (isLoading) return;
        clearMessages();
    };

    return (
        <>
            <Card
                className={cn(
                    "fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col shadow-lg transition-all duration-300 z-20 bg-[#1E1E1E] border-[#2D2D2D]",
                    isExpanded
                        ? "w-[800px] h-[400px]"
                        : "w-[800px] h-[100px]"
                )}
            >
                <div className="flex items-center justify-between px-4 py-1 border-b border-[#2D2D2D] bg-[#252526] text-[#0095FF]">
                    <h3 className="font-medium">AI Suggestions</h3>
                    <div className="flex items-center gap-2">
                        {isExpanded && (
                            <Button
                                className="bg-[#252526]"
                                size="icon"
                                onClick={handleNewChat}
                                disabled={isLoading}
                                title='New Chat'
                            >
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            className="bg-[#252526]"
                            size="icon"
                            onClick={() => setIsExpanded(!isExpanded)}
                            title={isExpanded ? 'Minimize' : 'Maximize'}
                        >
                            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {isExpanded && (
                    <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1E1E1E]"
                    >
                        {messages.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-[#0095FF]">
                                <p className="text-center text-sm">No Message</p>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div
                                        className={`rounded-lg px-3 py-2 max-w-[80%] ${message.role === 'assistant' ? 'bg-[#252526] text-[#0095FF]' : 'bg-[#0095FF] text-white text-sm'}`}
                                    >
                                        {message.role === 'assistant' && message.sections ? (
                                            <>
                                                {message.sections.thinking && (
                                                    <div className="space-y-1">
                                                        <Button
                                                            onClick={() => toggleSection(index, 'thinking')}
                                                            className="flex items-center gap-1 text-sm"
                                                        >
                                                            {message.collapsedSections?.thinking ?
                                                                <ChevronRight className="h-4 w-4" /> :
                                                                <ChevronDown className="h-4 w-4" />
                                                            }
                                                            Thinking
                                                        </Button>
                                                        {!message.collapsedSections?.thinking && (
                                                            <div className="text-sm">{message.sections.thinking}</div>
                                                        )}
                                                    </div>
                                                )}
                                                {message.content && (
                                                    <div className="py-2 text-md text-white">{message.content}</div>
                                                )}
                                                {sections.map(section => (
                                                    message.sections?.[section] && (
                                                        <div key={section} className="space-y-1">
                                                            <Button
                                                                onClick={() => toggleSection(index, section)}
                                                                className="flex items-center gap-1 text-sm"
                                                            >
                                                                {message.collapsedSections?.[section] ?
                                                                    <ChevronRight className="h-4 w-4" /> :
                                                                    <ChevronDown className="h-4 w-4" />
                                                                }
                                                                {section.charAt(0).toUpperCase() + section.slice(1)}
                                                            </Button>
                                                            {!message.collapsedSections?.[section] && (
                                                                <div className="space-y-2">
                                                                    <div className="pl-5 text-sm">{message.sections[section]}</div>
                                                                    <div className="flex gap-2 pl-5">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const content = message.sections?.[section]?.match(new RegExp(`<${section}>\\n([\\s\\S]*?)\\n<\/${section}>`))?.[1] || '';
                                                                                navigator.clipboard.writeText(content);
                                                                            }}
                                                                        >
                                                                            <Copy className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const match = message.sections?.[section]?.match(new RegExp(`<${section}>\\n([\\s\\S]*?)\\n<\/${section}>`));
                                                                                if (match) {
                                                                                    try {
                                                                                        const data = JSON.parse(stripJsonComments(match[1]));
                                                                                        onSuggest(data.elements);
                                                                                    } catch (error) {
                                                                                        console.error('Error parsing section data:', error);
                                                                                    }
                                                                                }
                                                                            }}
                                                                        >
                                                                            <MousePointerClick className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                            )}
                                                        </div>
                                                    )
                                                ))}
                                            </>
                                        ) : (
                                            message.content
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
                <div className="flex items-center gap-2 p-2 bg-[#252526] border-t border-[#2D2D2D]">
                    <Input
                        className="bg-[#1E1E1E] border-[#2D2D2D] text-white focus:border-[#0095FF] focus:ring-[#0095FF]"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Ask what you want ..."
                        disabled={isLoading}
                    />
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#0095FF]" />}
                </div>
            </Card>
        </>
    );
}