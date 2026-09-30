const express = require('express');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Model configuration - Qwen (හොඳම balance)
const MODEL = 'qwen/qwen3.8-27b';

const SYSTEM_PROMPT = `ඔබ "e-Akuru-AI" - ශ්‍රී ලංකාවේ "අකුරු මංසල" අධ්‍යාපනික වේදිකාවේ AI සහායකයා.

වැදගත් උපදෙස්:
- සිංහල භාෂාවෙන් පිළිතුරු දෙන්න
- කෙටි, පැහැදිලි සහ ප්‍රයෝජනවත් උත්තර දෙන්න
- ගණිත ගැටලු විසඳන්න
- අධ්‍යාපනික උපදෙස් දෙන්න
- සාමාන්‍ය දැනුම බෙදා ගන්න
- විභාග උපදෙස් දෙන්න (O/L, A/L)
- වෘත්තීය මාර්ගෝපදේශය දෙන්න
- ඉගෙනීමේ ක්‍රම කියා දෙන්න

ඔබේ උත්තර:
- දරුවන්ට තේරෙන සරල භාෂාවෙන්
- හැකි විට bullet points භාවිතා කරන්න
- අවශ්‍ය නම් emojis භාවිතා කරන්න (📚, 🧮, ✅)
- ගණිත ගණනය කරන විට කෙලින්ම උත්තරය දෙන්න

වැදගත්:
- හිංසනය, අපචාර ගැන උත්තර දෙන්න එපා
- හැම විටම ගෞරවනීය සහ උපකාරී වන්න
- ඔබට නොදන්නා දෙයක් නම් "මට ඒ ගැන තොරතුරු නැහැ" කියන්න`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'පණිවිඩය ලබා දෙන්න' });
        }
        
        if (!GROQ_API_KEY) {
            console.error('❌ GROQ_API_KEY not set');
            return res.status(500).json({ 
                error: 'AI සේවාව නොමැත. කරුණාකර පරිපාලක අමතන්න.' 
            });
        }
        
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-10),
            { role: 'user', content: message }
        ];
        
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048,
                top_p: 1,
                stream: false
            })
        });
        
        if (!response.ok) {
            const errData = await response.text();
            console.error('Groq API error:', response.status, errData);
            
            if (response.status === 429) {
                return res.status(429).json({ 
                    error: 'ඉතා බොහෝ ඉල්ලීම්. තත්පර කිහිපයකින් නැවත උත්සාහ කරන්න.' 
                });
            }
            
            return res.status(500).json({ 
                error: 'AI සේවා දෝෂයක්. නැවත උත්සාහ කරන්න.' 
            });
        }
        
        const data = await response.json();
        const msg = data.choices?.[0]?.message;
        
        let aiResponse = msg?.content || '';
        
        if (!aiResponse && msg?.reasoning) {
            aiResponse = msg.reasoning;
        }
        
        if (!aiResponse || aiResponse.trim() === '') {
            console.error('Empty AI response:', JSON.stringify(data, null, 2));
            aiResponse = 'මට උත්තර දෙන්න බැහැ. කරුණාකර නැවත උත්සාහ කරන්න.';
        }
        
        res.json({
            response: aiResponse,
            model: data.model,
            usage: data.usage
        });
        
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({ 
            error: 'සේවා දෝෂයක්. කරුණාකර නැවත උත්සාහ කරන්න.' 
        });
    }
});

// GET /api/ai/status
router.get('/status', (req, res) => {
    res.json({
        status: GROQ_API_KEY ? 'ready' : 'not_configured',
        model: MODEL,
        provider: 'Groq'
    });
});

module.exports = router;