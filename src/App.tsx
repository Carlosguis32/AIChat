import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Send, RefreshCw } from "lucide-react";

type Message = {
    id: string;
    text: string;
    isUser: boolean;
};

function App() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            text: "Hello! How can I help you today?",
            isUser: false,
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        const savedSessionId = localStorage.getItem("chat_session_id");
        if (savedSessionId) {
            setSessionId(savedSessionId);
            console.log("Session recovered:", savedSessionId);
        }
    }, []);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: input,
            isUser: true,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:3001/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: input,
                    sessionId: sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.sessionId) {
                setSessionId(data.sessionId);
                localStorage.setItem("chat_session_id", data.sessionId);
                console.log("New session established:", data.sessionId);
            }

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.reply || "Sorry, I couldn't generate a response.",
                isUser: false,
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error communicating with server:", error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Connection error. Please verify that the server is running.",
                isUser: false,
            };

            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetConversation = async () => {
        setIsLoading(true);

        try {
            const response = await fetch(
                "http://localhost:3001/api/reset-conversation",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ sessionId }),
                }
            );

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.sessionId) {
                setSessionId(data.sessionId);
                localStorage.setItem("chat_session_id", data.sessionId);
            }

            setMessages([
                {
                    id: Date.now().toString(),
                    text: "Conversation reset. How can I help you?",
                    isUser: false,
                },
            ]);

            console.log("Conversation successfully reset");
        } catch (error) {
            console.error("Error resetting conversation:", error);

            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    text: "Error resetting conversation. Please try again.",
                    isUser: false,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-gray-900 text-gray-100">
            <header className="flex justify-between items-center py-4 px-6 border-b border-gray-700">
                <h1 className="text-2xl font-bold text-cyan-400">
                    Ollama Chat
                </h1>
                <Button
                    onClick={handleResetConversation}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                    <RefreshCw size={16} className="mr-2" />
                    New Conversation
                </Button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
                <div className="max-w-5xl mx-auto">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`mb-4 ${
                                message.isUser ? "text-right" : "text-left"
                            }`}
                        >
                            <div
                                className={`inline-block p-3 rounded-lg max-w-[80%] ${
                                    message.isUser
                                        ? "bg-cyan-600 text-white rounded-br-none"
                                        : "bg-gray-700 text-gray-100 rounded-bl-none"
                                }`}
                            >
                                {message.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="text-left">
                            <div className="inline-block p-3 rounded-lg bg-gray-700 text-gray-100 rounded-bl-none">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                                    <div
                                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                                        style={{ animationDelay: "0.2s" }}
                                    />
                                    <div
                                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                                        style={{ animationDelay: "0.4s" }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900">
                <div className="flex gap-2 max-w-5xl mx-auto">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Type a message..."
                        disabled={isLoading}
                        className="flex-1 bg-gray-800 border-gray-700 text-gray-100 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-500"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                        className="bg-cyan-600 hover:bg-cyan-700"
                    >
                        <Send size={18} />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default App;
