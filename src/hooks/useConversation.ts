import { useState, useEffect, useCallback } from 'react';

import { Conversation, GetOrCreateConversationOptions, Session } from '@apirtc/apirtc';

const HOOK_NAME = "useConversation"
export default function useConversation(
    session: Session | undefined,
    name: string | undefined,
    options?: GetOrCreateConversationOptions,
    autoJoin: boolean = false
) {

    const [conversation, setConversation] = useState<Conversation>();
    const [joined, setJoined] = useState<boolean>(false);

    useEffect(() => {
        setJoined(false)
        if (session && name) {
            console.log(HOOK_NAME + "|getOrCreateConversation", name, options)
            setConversation(session.getOrCreateConversation(name, options));
        } else {
            setConversation(undefined)
        }
        return () => {
        }
    }, [session, name, JSON.stringify(options)]);

    useEffect(() => {
        if (conversation && autoJoin) {
            join()
        }
    }, [conversation, autoJoin])

    const join = useCallback(() => {
        console.log(HOOK_NAME + "|join", conversation)
        return new Promise<void>((resolve, reject) => {
            if (conversation) {
                conversation.join().then(() => {
                    // local user successfully joined the conversation.
                    console.log(HOOK_NAME + "|joined")
                    setJoined(true);
                    resolve()
                }).catch((error: any) => {
                    // local user could not join the conversation.
                    reject(error)
                });
            }
            else {
                reject(HOOK_NAME + "|conversation is not defined")
            }
        });
    }, [conversation])

    const leave = useCallback(() => {
        console.log(HOOK_NAME + "|leave", conversation)
        return new Promise<void>((resolve, reject) => {
            if (conversation) {
                conversation.leave().then(() => {
                    // local user successfully left the conversation.
                    console.log(HOOK_NAME + "|left", conversation.getName())
                    setJoined(false);
                    resolve()
                }).catch((error: any) => {
                    reject(error)
                });
            }
            else {
                reject(HOOK_NAME + "|conversation is not defined")
            }
        });
    }, [conversation])

    return {
        conversation,
        joined,
        join,
        leave
    };
}