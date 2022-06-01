import { useState, useEffect, useCallback } from 'react'
import { Contact, Conversation, ConversationMessage } from '@apirtc/apirtc'

// TODO : get and handle with pagination messages history
// TODO : ask apirtc to include the uuid in ConversationMessage so that we can store it
// into ConversationMessage when creating the local one, and we get it from converation on:message
// the uuid shall be the value used as a react child key when displaying list of messages

const HOOK_NAME = "useConversationMessages"
export default function useConversationMessages(
    conversation: Conversation | undefined,
) {
    // Use an internal array which will always be the same object as far as React knows
    // This will avoid the need for adding it as a dependency for each callback
    const [messages] = useState<Array<ConversationMessage>>(new Array<ConversationMessage>())
    // And use a copy as output array so that client code will react upon change
    // (only a new instance of array is detected by React)
    const [o_messages, setO_Messages] = useState<Array<ConversationMessage>>(new Array<ConversationMessage>())

    useEffect(() => {
        if (conversation) {
            const onMessage = (message: ConversationMessage) => {
                console.log(HOOK_NAME + "|on:message:", message, messages)
                messages.push(message)
                setO_Messages(Array.from(messages))
            }
            conversation.on('message', onMessage)

            return () => {
                conversation.removeListener('message', onMessage)
                messages.length = 0;
                setO_Messages(new Array<any>())
            }
        }
    }, [conversation])

    const sendMessage = useCallback((msgContent: string, sender: Contact) => {
        return new Promise<void>((resolve, reject) => {
            conversation?.sendMessage(msgContent)
                .then((uuid: number) => {
                    console.log(HOOK_NAME + "|sentMessage", uuid, msgContent, messages)
                    messages.push({ content: msgContent, sender: sender, time: new Date() })
                    setO_Messages(Array.from(messages))
                    resolve()
                })
                .catch((error: any) => {
                    console.error(HOOK_NAME + "|sendMessage error", error)
                    reject(error)
                })
        })
    }, [conversation])

    return {
        messages: o_messages,
        sendMessage
    }
}