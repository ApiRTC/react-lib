import { useState, useEffect, useCallback } from 'react';

import { Contact, Conversation, ConversationMessage } from '@apirtc/apirtc';

// TODO : get and handle with pagination messages history
// TODO : ask apirtc to include the uuid in ConversationMessage so that we can store it
// into ConversationMessage when creating the local one, and we get it from converation on:message
// the uuid shall be the value used as a react child key when displaying list of messages

const HOOK_NAME = "useConversationMessages"
export default function useConversationMessages(
    conversation: Conversation | undefined,
) {

    const [messages, setMessages] = useState<Array<ConversationMessage>>(new Array<ConversationMessage>());

    const onMessage = useCallback((message: ConversationMessage) => {
        console.log(HOOK_NAME + "|on:message:", message, messages);
        messages.push(message);
        setMessages(Array.from(messages));
    }, [messages])

    useEffect(() => {
        if (conversation)
            conversation.on('message', onMessage);
        return () => {
            if (conversation)
                conversation.removeListener('message', onMessage);
            setMessages(new Array<any>());
        }
    }, [conversation]);

    // We have to extract the conversation.sendMessage promise callback in a useCallback
    // because it acts asynchronously on 'messages' which can also be modified in 'onMessage'
    const onMessageSent = useCallback((uuid: number, msgContent: string, sender: Contact) => {
        console.log(HOOK_NAME + "|sentMessage", uuid, msgContent, messages);
        messages.push({ content: msgContent, sender: sender, time: new Date() });
        setMessages(Array.from(messages));
    }, [messages])

    const sendMessage = useCallback((msgContent: string, sender: Contact) => {
        return new Promise<void>((resolve, reject) => {
            conversation?.sendMessage(msgContent)
                .then((uuid: number) => {
                    onMessageSent(uuid, msgContent, sender)
                    resolve();
                })
                .catch((error: any) => {
                    console.error(HOOK_NAME + "|sendMessage error", error);
                    reject(error)
                });
        });
    }, [conversation])

    return {
        messages,
        sendMessage
    };
}