import { useState, useCallback } from 'react';

// OpenAI API key - should be stored in environment variables in production
const OPENAI_API_KEY = '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';

// Types 
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  userMessage: string;
  npcResponse: string;
}

// We'll use a Walking animation for now as placeholder, you'll need to replace with Animation_Idle_withSkin.glb
const MODEL_PATH = '/models/biped 7/Animation_Walking_withSkin.glb';

// Hook for using OpenAI chat API
export const useOpenAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to send a message to the OpenAI API
  const sendMessage = useCallback(async (
    message: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare messages for the API
      const messages: ChatMessage[] = [
        // Add system message to set context for the NPC
        { 
          role: 'system', 
          content: 'You are a friendly NPC character in a 3D virtual environment. Keep responses concise and engaging. Your name is Biped.' 
        },
        ...conversationHistory,
        { role: 'user', content: message }
      ];
      
      // Make request to OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          max_tokens: 150,  // Keep responses concise
          temperature: 0.7  // Some creativity but not too random
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response from OpenAI');
      }
      
      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I couldn\'t process that.';
      
      return {
        userMessage: message,
        npcResponse: assistantMessage
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('OpenAI API Error:', errorMessage);
      
      // Return a fallback response
      return {
        userMessage: message,
        npcResponse: 'Sorry, I encountered an error processing your message. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    sendMessage,
    isLoading,
    error
  };
}; 