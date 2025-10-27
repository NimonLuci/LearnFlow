const axios = require('axios');

class FreeAIService {
    constructor() {
        console.log('🚀 INITIALIZING FREE AI SERVICE...');
        this.providers = [
            {
                name: 'groq',
                url: 'https://api.groq.com/openai/v1/chat/completions',
                model: 'llama-3.3-70b-versatile',
                apiKey: process.env.GROQ_API_KEY,
                priority: 1
            },
            {
                name: 'huggingface',
                url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
                model: 'mistralai/Mistral-7B-Instruct-v0.3',
                apiKey: process.env.HUGGINGFACE_API_KEY,
                priority: 2
            }
        ].filter(p => p.apiKey && p.apiKey.length > 10);

        console.log(`✅ FREE AI READY - ${this.providers.map(p => p.name).join(', ')}`);
    }

    async processQuery(userId, query, context = {}) {
        console.log(`\n📨 AI REQUEST from user ${userId}: "${query}"`);
        
        const sorted = this.providers.sort((a, b) => a.priority - b.priority);
        
        for (const provider of sorted) {
            try {
                console.log(`🔄 Trying ${provider.name}...`);
                let result;
                
                if (provider.name === 'groq') {
                    result = await this.callGroq(provider, query);
                } else if (provider.name === 'huggingface') {
                    result = await this.callHuggingFace(provider, query);
                }
                
                if (result) {
                    console.log(`✅ ${provider.name} Success!`);
                    return {
                        content: result,
                        type: 'ai_response',
                        metadata: { provider: provider.name, model: provider.model }
                    };
                }
            } catch (error) {
                const statusCode = error.response?.status || 'unknown';
                const errorMsg = error.response?.data?.error?.message || error.message;
                console.log(`❌ ${provider.name} failed [${statusCode}]:`, errorMsg);
                continue;
            }
        }
        
        console.log('🔄 All APIs failed, using fallback');
        return this.getPremiumFallbackResponse(query);
    }

    async callGroq(provider, query) {
        const response = await axios.post(
            provider.url,
            {
                model: provider.model,
                messages: [
                    { role: 'system', content: 'You are a helpful AI tutor who explains concepts clearly and concisely.' },
                    { role: 'user', content: query }
                ],
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${provider.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );
        
        return response.data.choices[0].message.content;
    }

    async callHuggingFace(provider, query) {
        const response = await axios.post(
            provider.url,
            {
                inputs: query,
                parameters: {
                    max_new_tokens: 512,
                    temperature: 0.8,
                    top_p: 0.95,
                    return_full_text: false
                },
                options: {
                    wait_for_model: true
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${provider.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        let text = '';
        if (Array.isArray(response.data)) {
            text = response.data[0]?.generated_text || '';
        } else if (response.data?.generated_text) {
            text = response.data.generated_text;
        } else if (typeof response.data === 'string') {
            text = response.data;
        }
        
        return text.trim() || "I'm here to help! What would you like to learn?";
    }

    getPremiumFallbackResponse(query) {
        const q = query.toLowerCase().trim();
        
        if (['hi', 'hello', 'hey', 'yo', 'hi there', 'bro', 'sup'].includes(q)) {
            return {
                content: '**👋 Hey there! Welcome to your AI Learning Companion!**\n\nI\'m your personal tutor, ready to help with anything. Ask me questions about any subject!\n\n💡 Try asking: "Explain quantum mechanics" or "Help me with JavaScript"',
                type: 'greeting',
                metadata: { provider: 'fallback', free: true }
            };
        }
        
        return {
            content: `**🎯 Your AI Companion**\n\nYou asked: "${query}"\n\n✨ I can help with:\n- Explaining complex concepts\n- Coding and programming\n- Study guides and learning plans\n- Career advice\n- And much more!\n\nWhat would you like to explore?`,
            type: 'general_help',
            metadata: { provider: 'fallback', free: true }
        };
    }

    getStatus() {
        return {
            status: 'READY',
            providers: this.providers.map(p => ({ 
                name: p.name, 
                model: p.model,
                hasKey: !!p.apiKey,
                keyPreview: p.apiKey ? `${p.apiKey.substring(0, 8)}...` : 'missing'
            })),
            message: 'Free AI Service Ready'
        };
    }

    getAISessions() {
        return [];
    }
}

module.exports = new FreeAIService();
