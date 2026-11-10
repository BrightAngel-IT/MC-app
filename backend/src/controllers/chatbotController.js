const SYSTEM_PROMPT = `You are the AI Healthcare Assistant for "Medical Care Super App" in Sri Lanka.
Your responsibilities:
1. Provide helpful, empathetic, initial health information and guidance based on user queries/symptoms.
2. Clearly advise users to book an in-person Doctor, Home Nurse, or call SOS Ambulance (via the app) for severe/critical emergencies (Chest pain, breathing difficulty, severe bleeding, etc.).
3. Assist users with App Features: explain how to search for nearby Doctors, Caregivers, Lab tests, Elderly Homes, and upload Prescriptions.
4. Language Support: Always reply in the SAME language the user asked (English, Sinhala, or Tamil). Keep Sinhala/Tamil natural and friendly.
5. Disclaimer: Remind that you are an AI assistant and not a replacement for emergency professional medical diagnosis.`;

exports.chatWithAi = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message is required" });
        }

        const apiKey = process.env.GROQ_API_KEY;

        // Fallback if no API Key is added
        if (!apiKey) {
            let fallbackReply = "Hello! I am your Medical Care Assistant. You can search and book nearby Doctors, Home Nurses, or request an Ambulance directly from this app. How can I help you today?";
            const lower = message.toLowerCase();
            if (lower.includes('doctor') || lower.includes('වෛද්‍යවරයෙක්') || lower.includes('දොස්තර')) {
                fallbackReply = "You can find certified doctors under the 'Doctors' search tab. Set your location to see the closest available doctors!";
            } else if (lower.includes('emergency') || lower.includes('ambulance') || lower.includes('හදිසි') || lower.includes('ඇම්බියුලන්ස්')) {
                fallbackReply = "🚨 For medical emergencies, please tap the red 'SOS EMERGENCY' button at the top of your Dashboard immediately to dispatch an ambulance!";
            }
            return res.status(200).json({ reply: fallbackReply });
        }

        const messagesPayload = [{ role: "system", content: SYSTEM_PROMPT }];

        if (Array.isArray(history) && history.length > 0) {
            history.slice(-6).forEach(h => {
                if (h.sender && h.text) {
                    messagesPayload.push({
                        role: h.sender === 'user' ? 'user' : 'assistant',
                        content: h.text
                    });
                }
            });
        }

        messagesPayload.push({ role: "user", content: message.trim() });

        // Use native Node.js fetch (built-in, no axios dependency issue)
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b',
                messages: messagesPayload,
                temperature: 0.6,
                max_tokens: 600
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Groq API returned error:", data.error);
            return res.status(500).json({ reply: "I am having trouble connecting to the medical AI service right now. Please try again shortly." });
        }

        const reply = data?.choices?.[0]?.message?.content || "Sorry, I could not generate a response. Please try again.";

        return res.status(200).json({ reply });

    } catch (error) {
        console.error("Chatbot Controller Error:", error.message);
        return res.status(500).json({ reply: "I am having trouble connecting to the medical AI service right now. Please try again shortly." });
    }
};
