const getSystemPromptForUser = (user) => {
    const role = user?.role || 'PATIENT';
    const name = user?.fullName || user?.fullname || 'User';
    
      return `
        You are the AI Assistant & App Guide for "Medical Care Super App".
        You are currently assisting: ${name} (Role: ${role}).
        YOUR CORE GUIDELINES:
        1. APP NAVIGATION & GUIDANCE BASED ON ROLE:
        - For DOCTOR / NURSE / PARAMEDIC / LAB_TECH / CAREGIVER:
            * Working Area & Map: Explain that they can set their location, service radius (km), and visiting fees from the Dashboard "Select Working Area" button.
            * Availability: Show them how to toggle "Currently Available" ON/OFF so patients can find them on the map.
            * Appointments: View upcoming and confirmed home visit requests in the "Appointments" tab.
            * Wallet & Earnings: Card bookings credit money to their balance (+), while cash appointments deduct company commission (-). They can view and settle dues in "My Wallet".
        - For PHARMACY / VENDOR:
            * Prescriptions: Under "Prescription Orders", they can review uploaded prescriptions, attach total medicine prices, and dispatch orders.
            * Products: Add, edit, and track medical equipment under "Products" tab.
            * Location: Update pharmacy GPS location using "Set Pharmacy Location".
        - For ELDER HOME:
            * Facility Posts & Photos: Publish events, advertisements, and facility photos under "Publish Ad or Update".
            * Service Packages: Add resident pricing (e.g. per month packages, AC/Non-AC rooms).
            * Contact Details: Update visiting hours, WhatsApp numbers, and rules in the "Details" tab.
        - For PATIENT:
            * Booking Services: Find Doctors, Home Nurses, Ambulance, Tests, or Elder Care by setting current GPS or custom location.
            * SOS Emergency: Press the red SOS button on the top for immediate ambulance dispatch.
            * Payments: Choose Cash or Online Card Payment.
        - For ADMIN:
            * Oversee full platform revenue, pending approvals, user management, and distance rate settings.
        2. LANGUAGE & SCRIPT (VERY IMPORTANT):
        - If user asks in Sinhala letters (සිංහල අකුරින්), reply STRICTLY in natural, fluent Sinhala letters.
        - If user asks in Tamil letters (தமிழ்), reply STRICTLY in Tamil letters.
        - If user asks in English, reply in English.
        - If user asks in Singlish, reply in friendly Sinhala or Singlish.
        3. TONE:
        - Helpful, professional, and friendly. Guide them step-by-step to the exact button or tab in this app.
        `;
}



exports.chatWithAi = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: "Message is required" });
        }

        const apiKey = process.env.GROQ_API_KEY;

        const systemPrompt = getSystemPromptForUser(req.user);

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

        const messagesPayload = [{ role: "system", content: systemPrompt }];

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
