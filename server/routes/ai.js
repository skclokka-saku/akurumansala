const express = require('express');
const router = express.Router();

// ============================================
// SYSTEM PROMPT
// ============================================
const SYSTEM_PROMPT = `ඔබ "අකුරු AI" - ශ්‍රී ලංකාවේ දරුවන්ට උපකාර කරන අධ්‍යාපනික AI උදව්කරුවෙකි.

ඔබේ ලක්ෂණ:
- සිංහල භාෂාවෙන් පිළිතුරු දෙන්න (දරුවන්ට තේරුම් ගත හැකි ලෙස)
- සරල, පැහැදිලි භාෂාවක් භාවිතා කරන්න
- ගණිතය, විද්‍යාව, භාෂාව, ඉතිහාසය ආදී විෂයයන් සඳහා උදව් කරන්න
- 1 සිට 13 ශ්‍රේණිය දක්වා සිසුන්ට ගැලපෙන ලෙස පිළිතුරු දෙන්න
- ළමයින්ට ආදර්ශවත්, ධනාත්මක, දිරිගන්වන ලෙස කතා කරන්න
- හානිකර, අනුචිත, හෝ නුසුදුසු කරුණු ගැන කතා නොකරන්න
- සැක සහිත ප්‍රශ්න ඇත්නම්, වැඩිහිටියෙකුගෙන් උදව් ගන්න යැයි කියන්න

ඔබ හැම විටම කෙටි, පැහැදිලි පිළිතුරු දෙන්න. උදාහරණ සමඟ පැහැදිලි කරන්න.`;

// ============================================
// POST /api/ai/chat
// ============================================
router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'පණිවිඩය අවශ්‍යයි' });
        }

        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_API_KEY) {
            console.error('GROQ_API_KEY is not set');
            return res.status(500).json({ 
                error: 'AI සේවාව නිසි ලෙස වින්‍යාස කර නැත' 
            });
        }

        // Build messages array
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];

        // Add conversation history (last 10 messages)
        if (history && Array.isArray(history)) {
            const recentHistory = history.slice(-10);
            recentHistory.forEach(msg => {
                if (msg.role && msg.content) {
                    messages.push({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    });
                }
            });
        }

        // Add current message
        messages.push({ role: 'user', content: message });

        console.log('📤 Sending to Groq:', message.substring(0, 50));

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 0.9,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Groq API error:', errorData);
            throw new Error(errorData.error?.message || 'AI සේවාවේ දෝෂයක්');
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content;

        if (!aiResponse) {
            throw new Error('AI ප්‍රතිචාරය හිස්');
        }

        console.log('✅ Groq response received');

        res.json({ 
            response: aiResponse.trim(),
            model: data.model
        });

    } catch (error) {
        console.error('AI chat error:', error.message);
        res.status(500).json({ 
            error: 'AI සේවාවේ දෝෂයක්: ' + error.message 
        });
    }
});

module.exports = router;
