import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import useMobileDetection from '../hooks/useMobileDetection';

// Making the chat container ID a consistent value for CSS targeting
const CHAT_CONTAINER_ID = "chat-container";

// Styles for chat components
const styles = {
  chatContainer: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '15px',
    width: '420px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(77, 255, 170, 0.1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
    pointerEvents: 'auto' as const,
    color: '#333',
    border: '1px solid rgba(77, 255, 170, 0.2)',
    backdropFilter: 'blur(10px)',
    transition: 'opacity 0.3s, transform 0.3s',
    animation: 'fadeInModal 0.3s forwards',
    maxHeight: '60vh',
    overflow: 'hidden',
    cursor: 'default',
  },
  mobileChatContainer: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '85vw',
    maxWidth: '380px',
    maxHeight: '70vh',
    padding: '12px',
    borderRadius: '12px',
    zIndex: 2000,
    transformOrigin: 'center center',
    scale: '1',
    WebkitTransform: 'translate(-50%, -50%) scale(1)',
    WebkitTransformOrigin: 'center center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    padding: '0 5px 10px',
    borderBottom: '1px solid rgba(77, 255, 170, 0.2)',
    cursor: 'move',
  },
  mobileHeader: {
    cursor: 'default',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#007a4d',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  mobileTitle: {
    fontSize: '16px',
  },
  titleIcon: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#4dffaa',
    display: 'inline-block',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#333',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '0 5px',
    transition: 'color 0.2s',
  },
  closeButtonHover: {
    color: '#ff4d4d',
  },
  messagesContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxHeight: '320px',
    overflowY: 'auto' as const,
    marginBottom: '15px',
    padding: '5px 3px',
    scrollBehavior: 'smooth' as const,
    msOverflowStyle: 'none' as const,
    scrollbarWidth: 'thin' as const,
  },
  mobileMessagesContainer: {
    maxHeight: '50vh',
  },
  message: {
    padding: '12px 14px',
    borderRadius: '18px',
    maxWidth: '85%',
    wordBreak: 'break-word' as const,
    lineHeight: '1.5',
    position: 'relative' as const,
    transition: 'transform 0.3s',
    animation: 'messageIn 0.3s forwards',
  },
  mobileMessage: {
    padding: '10px 12px',
    fontSize: '14px',
  },
  userMessage: {
    backgroundColor: 'rgba(77, 124, 239, 0.1)',
    color: '#1a3b8f',
    alignSelf: 'flex-end' as const,
    borderBottomRightRadius: '4px',
    boxShadow: '0 2px 10px rgba(76, 124, 239, 0.1)',
    border: '1px solid rgba(76, 124, 239, 0.3)',
  },
  npcMessage: {
    backgroundColor: 'rgba(77, 255, 170, 0.1)',
    color: '#007a4d',
    alignSelf: 'flex-start' as const,
    borderBottomLeftRadius: '4px',
    borderLeft: '3px solid #4dffaa',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(77, 255, 170, 0.3)',
  },
  inputArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  predefinedPrompts: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginBottom: '10px',
  },
  mobilePredefinedPrompts: {
    gap: '6px',
    marginBottom: '8px',
  },
  promptButton: {
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    color: '#e0e0e0',
    padding: '8px 12px',
    borderRadius: '15px',
    border: '1px solid rgba(77, 255, 170, 0.2)',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  mobilePromptButton: {
    padding: '6px 10px',
    fontSize: '12px',
  },
  promptButtonHover: {
    backgroundColor: 'rgba(77, 255, 170, 0.2)',
    borderColor: 'rgba(77, 255, 170, 0.4)',
    transform: 'translateY(-2px)',
  },
  inputContainer: {
    display: 'flex',
    gap: '10px',
    position: 'relative' as const,
  },
  input: {
    flex: 1,
    padding: '12px 14px',
    paddingRight: '40px',
    borderRadius: '20px',
    border: '1px solid rgba(77, 255, 170, 0.2)',
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  mobileInput: {
    padding: '10px 12px',
    fontSize: '14px',
  },
  inputActive: {
    borderColor: 'rgba(77, 255, 170, 0.5)',
    boxShadow: '0 0 0 2px rgba(77, 255, 170, 0.1)',
  },
  sendButton: {
    backgroundColor: '#4dffaa',
    color: '#000',
    padding: '10px 15px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    fontSize: '14px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSendButton: {
    padding: '8px 12px',
    fontSize: '14px',
  },
  sendButtonHover: {
    backgroundColor: '#3ae090',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(77, 255, 170, 0.3)',
  },
  npcName: {
    color: '#4dffaa',
    fontWeight: 'bold' as const,
    fontSize: '12px',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  npcIcon: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#4dffaa',
    display: 'inline-block',
  },
  userName: {
    color: '#4c7cef',
    fontWeight: 'bold' as const,
    fontSize: '12px',
    marginBottom: '4px',
    alignSelf: 'flex-end' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  userIcon: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#4c7cef',
    display: 'inline-block',
  },
  chatBubble: {
    position: 'relative' as const,
  },
  typingIndicator: {
    display: 'flex',
    padding: '10px 14px',
    borderRadius: '18px',
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
    color: '#e0e0e0',
    alignSelf: 'flex-start' as const,
    width: 'fit-content',
    borderLeft: '3px solid #4dffaa',
  },
  dot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#4dffaa',
    borderRadius: '50%',
    margin: '0 2px',
    animation: 'pulse 1.5s infinite',
    display: 'inline-block',
  },
  chatToggle: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(77, 255, 170, 0.9)',
    color: '#333',
    padding: '12px 22px',
    borderRadius: '24px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    pointerEvents: 'auto' as const,
    zIndex: 1001,
    transition: 'all 0.3s ease',
    animation: 'bounceIn 0.5s',
    fontSize: '14px',
    textAlign: 'center' as const,
    width: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'scale(1, 1)',
    backfaceVisibility: 'hidden' as const,
    perspective: '1000px' as const,
  },
  chatToggleHover: {
    backgroundColor: '#3ae090',
    transform: 'translateY(-3px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
  },
  minimizeButton: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '0 5px',
    marginRight: '5px',
    transition: 'color 0.2s',
  },
  minimizeButtonHover: {
    color: '#4dffaa',
  },
  timestamp: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '3px',
    alignSelf: 'flex-end' as const,
  },
  scrollTopButton: {
    position: 'absolute' as const,
    bottom: '10px',
    right: '10px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: 'rgba(77, 255, 170, 0.2)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  scrollTopButtonHover: {
    opacity: 1,
  },
  emoji: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '18px',
    position: 'absolute' as const,
    right: '135px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    color: '#aaa',
    transition: 'color 0.2s',
  },
  emojiHover: {
    color: '#4dffaa',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '12px',
    cursor: 'pointer',
    alignSelf: 'flex-end' as const,
    marginBottom: '5px',
    transition: 'color 0.2s',
  },
  clearButtonHover: {
    color: '#ff4d4d',
  },
  headerButton: {
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// Animation keyframes
const keyframes = `
@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

@keyframes messageIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInModal {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
`;

// Predefined prompts for quick interactions
const PREDEFINED_PROMPTS = [
  "Hello, who are you?",
  "What can you do?",
  "Tell me about this place",
  "Any tips for me?",
];

// Helper function to format timestamp
const formatTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// Helper function to get the correct modifier key based on OS
const getModifierKey = () => {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  return isMac ? '⌘' : 'Ctrl';
};

// Add global styles for cursor visibility in chat
const cursorStyles = `
  .chat-open {
    cursor: url(/cursors/cursor-green.png), auto !important;
  }
  .chat-open * {
    cursor: inherit;
  }
  .chat-open button, 
  .chat-open input, 
  .chat-open [role="button"], 
  .chat-open a {
    cursor: url(/cursors/cursor-pointer.png), pointer !important;
  }
  .chat-open .draggable {
    cursor: url(/cursors/cursor-move.png), move !important;
  }
  
  /* Add styles for dragging state */
  .dragging-chat {
    cursor: url(/cursors/cursor-move.png), move !important;
  }
  .dragging-chat * {
    cursor: url(/cursors/cursor-move.png), move !important;
  }
`;

const DraggableChatUI = () => {
  const modifierKey = getModifierKey();
  
  // State
  const [inputValue, setInputValue] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Add state for hover tracking
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Chat context
  const {
    messages,
    isNearNPC,
    isLoading,
    sendMessage,
    showChat,
    toggleChat,
    openChat,
    closeChat
  } = useChat();
  
  // Add mobile detection
  const { isMobile, isTouchDevice } = useMobileDetection();
  
  // Auto-scroll messages to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Focus input when chat opens (add a comment about "C" key functionality)
  useEffect(() => {
    if (showChat && inputRef.current) {
      // Focus input when chat is opened, either by "C" key or click
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [showChat]);
  
  // Check scroll position to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 30;
      
      // Only show scroll button when not near bottom and there are enough messages
      setAutoScroll(!isNearBottom && scrollHeight > clientHeight * 1.5);
    }
  }, []);
  
  // Add scroll event listener
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
      return () => messagesContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  // Scroll to top function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
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
      // Focus back on input after clicking prompt
      inputRef.current?.focus();
    }
  };
  
  // Set initial centered position - REVISED
  useEffect(() => {
    if (chatContainerRef.current && showChat) {
      // Calculate window center
      const windowCenter = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };
      
      // Only set position when first showing and not dragged yet
      if (!isDragging && (position.x === 0 && position.y === 0)) {
        setPosition(windowCenter);
      }
    }
  }, [showChat, position.x, position.y, isDragging]);
  
  // Handle window resize - keep chat visible
  useEffect(() => {
    const handleResize = () => {
      if (chatContainerRef.current && !isDragging) {
        // Keep centered if not dragged
        if (position.x === 0 && position.y === 0) {
          setPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
          });
        } else {
          // Otherwise ensure it stays in bounds
          const maxX = window.innerWidth - 100;
          const maxY = window.innerHeight - 100;
          setPosition({
            x: Math.min(position.x, maxX),
            y: Math.min(position.y, maxY)
          });
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, isDragging]);
  
  // Handle minimize toggle
  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };
  
  // Update mouse handlers to use the new state
  const handleMouseEnter = (element: string, index?: number) => {
    setHoveredElement(element);
    if (index !== undefined) {
      setHoveredIndex(index);
    }
  };
  
  const handleMouseLeave = () => {
    setHoveredElement(null);
    setHoveredIndex(null);
  };
  
  // Create formatted messages with timestamps
  const formattedMessages = messages.map(message => {
    if (message.role === 'system') return null;
    return {
      ...message,
      timestamp: formatTime()
    };
  }).filter(Boolean);
  
  // Insert emoji into input
  const insertEmoji = () => {
    const emojis = ['😊', '👋', '🤔', '👍', '❤️', '🙏', '✨', '🎮', '🌍', '🚀'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    setInputValue(prev => prev + randomEmoji);
    inputRef.current?.focus();
  };
  
  // Clear chat history
  const clearChat = () => {
    // In a real app, you'd implement a method in the ChatContext to clear messages
    // For now, we'll just close and reopen the chat
    closeChat();
    setTimeout(openChat, 100);
  };
  
  // Handle click events for closing chat
  const handleCloseClick = () => {
    closeChat();
  };
  
  // Add/remove body class based on chat visibility to control cursor
  useEffect(() => {
    if (showChat) {
      document.body.classList.add('chat-open');
    } else {
      document.body.classList.remove('chat-open');
    }
    
    return () => {
      // Clean up on unmount
      document.body.classList.remove('chat-open');
    };
  }, [showChat]);
  
  // Create responsive style objects based on mobile state
  const getChatContainerStyle = () => {
    if (isMobile) {
      // On mobile, use fixed centered positioning via CSS
      return {
        ...styles.chatContainer,
        ...styles.mobileChatContainer,
        opacity: showChat ? 1 : 0,
        pointerEvents: (showChat ? 'auto' : 'none') as 'auto' | 'none',
      };
    } else {
      // On desktop, always use the position state
      // For initial centering, the position is set to window center
      // For dragging, position is updated during drag
      const posX = position.x || window.innerWidth / 2; // Fallback if position not set
      const posY = position.y || window.innerHeight / 2; // Fallback if position not set
      
      return {
        ...styles.chatContainer,
        left: isDragging ? `${posX}px` : '50%',
        top: isDragging ? `${posY}px` : '50%',
        transform: isDragging ? 'none' : 'translate(-50%, -50%)',
        opacity: showChat ? 1 : 0,
        pointerEvents: (showChat ? 'auto' : 'none') as 'auto' | 'none',
      };
    }
  };
  
  const getHeaderStyle = () => {
    return {
      ...styles.header,
      ...(isMobile ? styles.mobileHeader : {})
    };
  };
  
  const getTitleStyle = () => {
    return {
      ...styles.title,
      ...(isMobile ? styles.mobileTitle : {})
    };
  };
  
  const getMessagesContainerStyle = () => {
    return {
      ...styles.messagesContainer,
      ...(isMobile ? styles.mobileMessagesContainer : {})
    };
  };
  
  const getMessageStyle = (isUser: boolean) => {
    return {
      ...styles.message,
      ...(isUser ? styles.userMessage : styles.npcMessage),
      ...(isMobile ? styles.mobileMessage : {})
    };
  };
  
  const getPredefinePromptsStyle = () => {
    return {
      ...styles.predefinedPrompts,
      ...(isMobile ? styles.mobilePredefinedPrompts : {})
    };
  };
  
  const getPromptButtonStyle = (isHovered: boolean, index: number) => {
    return {
      ...styles.promptButton,
      ...(hoveredElement === 'promptButton' && hoveredIndex === index ? styles.promptButtonHover : {}),
      ...(isMobile ? styles.mobilePromptButton : {})
    };
  };
  
  const getInputStyle = () => {
    return {
      ...styles.input,
      ...(inputFocused ? styles.inputActive : {}),
      ...(isMobile ? styles.mobileInput : {})
    };
  };
  
  const getSendButtonStyle = () => {
    return {
      ...styles.sendButton,
      ...(hoveredElement === 'sendButton' ? styles.sendButtonHover : {}),
      ...(isMobile ? styles.mobileSendButton : {})
    };
  };
  
  // Modify the drag start handler to work more reliably
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip dragging on mobile
    if (isMobile || isTouchDevice) return;
    
    // Only start dragging from header
    if (e.target !== headerRef.current && !(headerRef.current as HTMLElement)?.contains(e.target as Node)) {
      return;
    }
    
    // Set initial position if needed
    if (position.x === 0 && position.y === 0) {
      setPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
    }
    
    // Calculate the offset for dragging
    const chatRect = chatContainerRef.current?.getBoundingClientRect();
    if (chatRect) {
      setOffset({
        x: e.clientX - chatRect.left,
        y: e.clientY - chatRect.top
      });
      setIsDragging(true);
      
      // Add a class to indicate dragging state
      document.body.classList.add('dragging-chat');
    }
  };
  
  const handleDragMove = (e: MouseEvent) => {
    if (isDragging && chatContainerRef.current) {
      const newX = e.clientX - offset.x;
      const newY = e.clientY - offset.y;
      
      // Apply bounds to keep chat on screen
      const chatWidth = chatContainerRef.current.offsetWidth;
      const chatHeight = chatContainerRef.current.offsetHeight;
      
      const maxX = window.innerWidth - (chatWidth / 2);
      const maxY = window.innerHeight - (chatHeight / 2);
      const minX = chatWidth / 2;
      const minY = chatHeight / 2;
      
      setPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    }
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.classList.remove('dragging-chat');
  };
  
  // Add and remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);
  
  return (
    <>
      {/* Add keyframes and cursor styles */}
      <style>
        {keyframes}
        {cursorStyles}
      </style>
      
      {/* Chat UI */}
      {showChat && (
        <div 
          id={CHAT_CONTAINER_ID}
          ref={chatContainerRef}
          style={getChatContainerStyle()}
        >
          <div 
            ref={headerRef}
            style={getHeaderStyle()}
            onMouseDown={handleDragStart}
          >
            <h3 style={getTitleStyle()}>
              <span style={styles.titleIcon}></span>
              Chat with Technoclaw
            </h3>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Clear chat button */}
              <button 
                onClick={clearChat}
                style={{
                  ...styles.headerButton,
                  backgroundColor: hoveredElement === 'clear' ? '#e0e0e0' : 'transparent',
                }} 
                onMouseEnter={() => handleMouseEnter('clear')} 
                onMouseLeave={() => handleMouseLeave()}
                title="Clear chat"
              >
                🗑️
              </button>
              
              {/* Minimize/maximize button */}
              <button 
                onClick={toggleMinimize}
                style={{
                  ...styles.headerButton,
                  backgroundColor: hoveredElement === 'minimize' ? '#e0e0e0' : 'transparent',
                }} 
                onMouseEnter={() => handleMouseEnter('minimize')} 
                onMouseLeave={() => handleMouseLeave()}
                title={isMinimized ? "Expand chat" : "Minimize chat"}
              >
                {isMinimized ? '🔽' : '🔼'}
              </button>
              
              {/* Close button */}
              <button 
                onClick={handleCloseClick}
                style={{
                  ...styles.headerButton,
                  backgroundColor: hoveredElement === 'close' ? '#ffeeee' : 'transparent',
                  color: '#ff5555',
                }}
                onMouseEnter={() => handleMouseEnter('close')} 
                onMouseLeave={() => handleMouseLeave()}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Rest of the UI only shown when not minimized */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                style={getMessagesContainerStyle()}
                onScroll={handleScroll}
              >
                {formattedMessages.length === 0 && (
                  <div style={{ ...getMessageStyle(false), opacity: 0.7, alignSelf: 'center' }}>
                    Start a conversation with Technoclaw...
                  </div>
                )}
                
                {formattedMessages.map((message, index) => {
                  if (!message) return null;
                  
                  return (
                    <div key={index} style={styles.chatBubble}>
                      {message.role === 'assistant' ? (
                        <div style={styles.npcName}>
                          <span style={styles.npcIcon}></span>
                          Technoclaw
                        </div>
                      ) : (
                        <div style={styles.userName}>
                          You
                          <span style={styles.userIcon}></span>
                        </div>
                      )}
                      <div 
                        style={getMessageStyle(message.role === 'user')}
                      >
                        {message.content}
                        <div style={styles.timestamp}>{message.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
                
                {isLoading && (
                  <div style={styles.chatBubble}>
                    <div style={styles.npcName}>
                      <span style={styles.npcIcon}></span>
                      Technoclaw
                    </div>
                    <div style={styles.typingIndicator}>
                      <span style={styles.dot}></span>
                      <span style={{ ...styles.dot, animationDelay: '0.2s' }}></span>
                      <span style={{ ...styles.dot, animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Scroll to bottom button */}
              {autoScroll && (
                <button
                  style={{
                    ...styles.scrollTopButton,
                    ...(hoveredElement === 'messages' && hoveredIndex === 0 ? styles.scrollTopButtonHover : {})
                  }}
                  onClick={scrollToBottom}
                  onMouseEnter={() => handleMouseEnter('messages', 0)}
                  onMouseLeave={() => handleMouseLeave()}
                  aria-label="Scroll to bottom"
                >
                  ↓
                </button>
              )}
              
              {/* Input area */}
              <div style={styles.inputArea}>
                {/* Predefined prompts */}
                <div style={getPredefinePromptsStyle()}>
                  {PREDEFINED_PROMPTS.map((prompt, index) => (
                    <button
                      key={index}
                      type="button"
                      style={getPromptButtonStyle(hoveredElement === 'promptButton' && hoveredIndex === index, index)}
                      onClick={() => handlePromptClick(prompt)}
                      disabled={isLoading}
                      onMouseEnter={() => handleMouseEnter('promptButton', index)}
                      onMouseLeave={() => handleMouseLeave()}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                
                {/* Text input form */}
                <form style={styles.inputContainer} onSubmit={handleSubmit}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    style={getInputStyle()}
                    disabled={isLoading}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                  />
                  
                  {/* Emoji button */}
                  <button
                    type="button"
                    style={{
                      ...styles.emoji,
                      ...(hoveredElement === 'messages' && hoveredIndex === 1 ? styles.emojiHover : {}),
                    }}
                    onClick={insertEmoji}
                    onMouseEnter={() => handleMouseEnter('messages', 1)}
                    onMouseLeave={() => handleMouseLeave()}
                  >
                    😊
                  </button>
                  
                  <button 
                    type="submit" 
                    style={getSendButtonStyle()}
                    disabled={isLoading || !inputValue.trim()}
                    onMouseEnter={() => handleMouseEnter('sendButton')}
                    onMouseLeave={() => handleMouseLeave()}
                  >
                    {isLoading ? '...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Toggle button - only show when near NPC and chat is closed */}
      {isNearNPC && !showChat && (
        <button
          className="talk-to-npc-button"
          onClick={openChat}
          onMouseEnter={() => handleMouseEnter('chatToggle')}
          onMouseLeave={() => handleMouseLeave()}
          style={{
            cursor: 'url(/cursors/cursor-pointer.png), pointer'
          }}
        >
          Talk to Technoclaw
          {!isMobile && !isTouchDevice && (
            <span style={{ 
              fontSize: '0.8em', 
              opacity: 0.8, 
              marginLeft: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              padding: '2px 5px',
              borderRadius: '4px'
            }}>
              {modifierKey}+C
            </span>
          )}
        </button>
      )}
    </>
  );
};

export default DraggableChatUI; 