import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '../interfaces/messageHandlers';
import { ChatState, ChatContext } from '../context/chatContext';

export const useChatState = (chatContext: ChatContext) => {
    const [state, setState] = useState<ChatState>(chatContext.getState());

    useEffect(() => {
        const unsubscribe = chatContext.subscribe((newState) => {
            setState(newState);
        });
        
        return unsubscribe;
    }, [chatContext]);
    
    const addMessage = useCallback((message: ChatMessage) => {
        chatContext.addMessage(message);
    }, [chatContext]);
    
    const clearMessages = useCallback(() => {
        chatContext.clearMessages();
    }, [chatContext]);
    
    const setProcessing = useCallback((isProcessing: boolean) => {
        chatContext.setProcessing(isProcessing);
    }, [chatContext]);
    
    const setError = useCallback((error: string | null) => {
        chatContext.setError(error);
    }, [chatContext]);
    
    const setModelId = useCallback((modelId: string) => {
        chatContext.setModelId(modelId);
    }, [chatContext]);
    
    return {
        messages: state.messages,
        isProcessing: state.isProcessing,
        modelId: state.modelId,
        error: state.error,
        addMessage,
        clearMessages,
        setProcessing,
        setError,
        setModelId
    };
}; 