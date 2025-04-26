import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Ollama } from "ollama";

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const ollama = new Ollama({
    host: "http://localhost:11434",
});

const sessions = new Map();

const generateSessionId = () => {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
};

const getOrCreateSession = (sessionId) => {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            messages: [],
            lastActivity: Date.now(),
        });
    }
    return sessions.get(sessionId);
};

setInterval(() => {
    const now = Date.now();
    const expirationTime = 3600000;

    sessions.forEach((session, sessionId) => {
        if (now - session.lastActivity > expirationTime) {
            sessions.delete(sessionId);
            console.log(`Session ${sessionId} expired and deleted`);
        }
    });
}, 3600000);

let defaultSystemPrompt = "";

app.post("/api/chat", async (req, res) => {
    try {
        const {
            message,
            systemPrompt,
            sessionId = generateSessionId(),
        } = req.body;

        if (!message) {
            return res.status(400).json({ error: "A message is required" });
        }

        console.log("Message received:", message);
        console.log("Session ID:", sessionId);

        const modelName = process.env.OLLAMA_MODEL || "llama2-uncensored:7b";
        console.log(`Using model: ${modelName}`);

        const currentSystemPrompt = systemPrompt || defaultSystemPrompt;

        const session = getOrCreateSession(sessionId);
        session.lastActivity = Date.now();

        let messages = [{ role: "system", content: currentSystemPrompt }];

        if (session.messages.length > 0) {
            messages = messages.concat(session.messages);
        }

        messages.push({ role: "user", content: message });

        if (
            session.messages.length === 0 ||
            session.messages[session.messages.length - 1].role !== "user"
        ) {
            session.messages.push({ role: "user", content: message });
        } else {
            session.messages[session.messages.length - 1] = {
                role: "user",
                content: message,
            };
        }

        const response = await ollama.chat({
            model: modelName,
            messages: messages,
            options: {
                temperature: 0.7,
                num_predict: 1000,
            },
        });

        console.log("Response generated");

        session.messages.push({
            role: "assistant",
            content: response.message.content,
        });

        if (session.messages.length > 20) {
            session.messages = session.messages.slice(
                session.messages.length - 20
            );
        }

        return res.json({
            reply: response.message.content,
            sessionId: sessionId,
        });
    } catch (error) {
        console.error("Error processing message:", error);
        return res.status(500).json({
            error: "Error processing message",
            details: error.message,
        });
    }
});

app.get("/api/system-prompt", (req, res) => {
    res.json({
        systemPrompt: defaultSystemPrompt,
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "AI Server running correctly",
    });
});

app.post("/api/reset-conversation", (req, res) => {
    const { sessionId } = req.body;

    if (sessionId && sessions.has(sessionId)) {
        sessions.get(sessionId).messages = [];
        console.log(`Conversation reset for session: ${sessionId}`);
    }

    res.json({
        success: true,
        message: "Conversation successfully reset",
        sessionId: sessionId || generateSessionId(),
    });
});

app.listen(port, () => {
    console.log(`AI Server running at http://localhost:${port}`);
    console.log("Make sure Ollama is running locally");
});
