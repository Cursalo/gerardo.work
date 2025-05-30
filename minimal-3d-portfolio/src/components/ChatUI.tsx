import { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';

// Styles for chat components
const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '0',
    left: '0',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '20px',
    pointerEvents: 'none' as const,
    zIndex: 1000,
  },
  chatToggle: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    backgroundColor: '#4dffaa',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    pointerEvents: 'auto' as const,
    zIndex: 1001,
  },
  keyboardContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
    maxWidth: '80%',
    width: '600px',
    pointerEvents: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '5px',
    border: '1px solid #555',
    backgroundColor: '#222',
    color: 'white',
    fontSize: '16px',
    marginBottom: '10px',
  },
  button: {
    backgroundColor: '#4dffaa',
    color: '#000',
    padding: '10px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    alignSelf: 'flex-end' as const,
  },
  messagesContainer: {
    position: 'fixed' as const,
    left: '50%',
    top: '200px',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    maxHeight: '40vh',
    overflowY: 'auto' as const,
    padding: '10px',
    width: '80%',
    maxWidth: '800px',
    zIndex: 1000,
  },
  message: {
    margin: '10px 0',
    padding: '12px 16px',
    borderRadius: '20px',
    maxWidth: '80%',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    wordBreak: 'break-word' as const,
  },
  userMessage: {
    backgroundColor: '#4c7cef',
    color: 'white',
    alignSelf: 'flex-end' as const,
    borderBottomRightRadius: '4px',
  },
  npcMessage: {
    backgroundColor: '#4dffaa',
    color: 'black',
    alignSelf: 'flex-start' as const,
    borderBottomLeftRadius: '4px',
  },
  predefinedPrompts: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    marginBottom: '15px',
  },
  promptButton: {
    backgroundColor: '#333',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  }
};

// Predefined prompts for quick interactions
const PREDEFINED_PROMPTS = [
  "Hola, ¿quién eres?",
  "¿Qué puedes hacer?",
  "Cuéntame sobre este lugar",
  "¿Algún consejo para mí?",
];

const ChatUI = () => {
  // State
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Chat context
  const {
    messages,
    isNearNPC,
    isLoading,
    sendMessage,
    showChat,
    toggleChat
  } = useChat();
  
  // Auto-scroll messages to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() && !isLoading) {
      await sendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  // Handle predefined prompt click
  const handlePromptClick = async (prompt: string) => {
    if (!isLoading) {
      await sendMessage(prompt);
    }
  };
  
  // Only show toggle button if near NPC
  return (
    <>
      {/* Messages display */}
      {messages.length > 0 && (
        <div style={styles.messagesContainer}>
          {messages.map((message, index) => (
            <div 
              key={index}
              style={{
                ...styles.message,
                ...(message.role === 'user' ? styles.userMessage : styles.npcMessage),
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {message.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
      
      {/* Chat interaction section */}
      <div style={styles.container}>
        {/* Only show keyboard when chat is active */}
        {showChat && (
          <form style={styles.keyboardContainer} onSubmit={handleSubmit}>
            {/* Predefined prompts */}
            <div style={styles.predefinedPrompts}>
              {PREDEFINED_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  type="button"
                  style={styles.promptButton}
                  onClick={() => handlePromptClick(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
            
            {/* Text input */}
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Escribe tu mensaje aquí..."
              style={styles.input}
              disabled={isLoading}
            />
            
            {/* Send button */}
            <button 
              type="submit" 
              style={styles.button}
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        )}
      </div>
      
      {/* Toggle button - only show when near NPC */}
      {isNearNPC && (
        <button 
          style={styles.chatToggle} 
          onClick={toggleChat}
        >
          {showChat ? 'Cerrar Chat' : 'Hablar con NPC'}
        </button>
      )}
    </>
  );
};

export default ChatUI; 