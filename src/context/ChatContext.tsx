import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useOpenAI } from '../services/openai';
import useMobileDetection from '../hooks/useMobileDetection';

// Types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  isNearNPC: boolean;
  isLoading: boolean;
  error: string | null;
  showChat: boolean;
  chatShortcutText: string;
  setIsNearNPC: (isNear: boolean) => void;
  sendMessage: (message: string) => Promise<void>;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
}

// Default context values
const defaultContext: ChatContextType = {
  messages: [],
  isNearNPC: false,
  isLoading: false,
  error: null,
  showChat: false,
  chatShortcutText: "",
  setIsNearNPC: () => {},
  sendMessage: async () => {},
  toggleChat: () => {},
  openChat: () => {},
  closeChat: () => {}
};

// Create context
const ChatContext = createContext<ChatContextType>(defaultContext);

// Get canvas element (for requesting pointer lock)
const getCanvasElement = (): HTMLCanvasElement | null => {
  return document.querySelector('canvas');
};

// Provider component
export const ChatProvider = ({ children }: { children: ReactNode }) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isNearNPC, setIsNearNPC] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { isMobile } = useMobileDetection();
  
  // Use OpenAI API hook
  const { sendMessage: apiSendMessage, isLoading, error } = useOpenAI();
  
  // Get the chat shortcut text (only for desktop)
  const chatShortcutText = isMobile ? "" : "Press Command + C to chat";
  
  // Handle cursor visibility and camera locking when chat visibility changes
  useEffect(() => {
    if (showChat) {
      // Ensure cursor is visible and usable when chat is open
      document.body.style.cursor = 'url(/cursors/cursor-green.png), auto';
      
      // Exit pointer lock immediately to free the cursor
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
          
          // Force cursor visibility after a short delay
          // This helps ensure the cursor is definitely visible after pointer lock is released
          setTimeout(() => {
            document.body.style.cursor = 'url(/cursors/cursor-green.png), auto';
          }, 50);
        } catch (err) {
          console.error('Failed to exit pointer lock:', err);
        }
      }
    } else {
      // When closing chat, automatically request pointer lock to resume the game
      // This eliminates the need for a user click
      setTimeout(() => {
        // Only request pointer lock if chat is still closed and we're not already in pointer lock
        if (!showChat && !document.pointerLockElement && isNearNPC) {
          try {
            const canvas = getCanvasElement();
            if (canvas) {
              canvas.requestPointerLock();
            }
          } catch (err) {
            console.error('Failed to auto-request pointer lock:', err);
          }
        }
      }, 50);
    }
  }, [showChat, isNearNPC]);
  
  // Direct functions to open and close chat with proper cursor handling
  const openChat = useCallback(() => {
    // First ensure any pointer lock is released
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Force cursor to be visible with the custom green cursor
    document.body.style.cursor = 'url(/cursors/cursor-green.png), auto';
    
    // Then open the chat after a small delay to ensure smooth transition
    setTimeout(() => {
      setShowChat(true);
    }, 10);
  }, []);
  
  const closeChat = useCallback(() => {
    setShowChat(false);
    
    // Automatically request pointer lock after a short delay
    setTimeout(() => {
      if (isNearNPC) {
        const canvas = getCanvasElement();
        if (canvas && !document.pointerLockElement) {
          try {
            canvas.requestPointerLock();
          } catch (err) {
            console.error('Failed to request pointer lock on close:', err);
          }
        }
      }
    }, 100);
  }, [isNearNPC]);
  
  // Function to toggle chat visibility
  const toggleChat = useCallback(() => {
    if (showChat) {
      closeChat();
    } else {
      openChat();
    }
  }, [showChat, openChat, closeChat]);
  
  // Add keyboard event listener for "Cmd/Ctrl+C" key to toggle chat
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only toggle chat with "Cmd/Ctrl+C" if near NPC
      // event.metaKey is for Command (Mac), event.ctrlKey is for Control (Windows)
      if ((event.metaKey || event.ctrlKey) && (event.key === 'c' || event.key === 'C') && isNearNPC) {
        // Prevent default copy behavior
        event.preventDefault();
        toggleChat();
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [toggleChat, isNearNPC]);
  
  // Function to send a message
  const sendMessage = useCallback(async (message: string) => {
    // Create user message
    const userMessage: ChatMessage = { role: 'user', content: message };
    
    // Update messages with user message
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Send to API
    const response = await apiSendMessage(message, messages);
    
    // Create assistant message
    const assistantMessage: ChatMessage = { role: 'assistant', content: response.npcResponse };
    
    // Update messages with assistant response
    setMessages(prevMessages => [...prevMessages, assistantMessage]);
  }, [apiSendMessage, messages]);
  
  // Context value
  const value = {
    messages,
    isNearNPC,
    isLoading,
    error,
    showChat,
    chatShortcutText,
    setIsNearNPC,
    sendMessage,
    toggleChat,
    openChat,
    closeChat
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Hook for using the chat context
export const useChat = () => useContext(ChatContext); 