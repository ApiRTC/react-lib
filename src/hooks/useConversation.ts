import { useState, useEffect, useCallback } from 'react'
import { Conversation, GetOrCreateConversationOptions, Session } from '@apirtc/apirtc'

const HOOK_NAME = "useConversation"
export default function useConversation(
    session: Session | undefined,
    name: string | undefined,
    options?: GetOrCreateConversationOptions,
    autoJoin: boolean = false
) {

    const [conversation, setConversation] = useState<Conversation>()
    const [joined, setJoined] = useState<boolean>(false)
    const [joining, setJoining] = useState<boolean>(false)

    // Callbacks
    //
    const join = useCallback(() => {
        if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
            console.debug(HOOK_NAME + "|join", conversation)
        }
        return new Promise<void>((resolve, reject) => {
            if (conversation) {
                setJoining(true)
                conversation.join().then(() => {
                    // successfully joined the conversation.
                    if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
                        console.info(HOOK_NAME + "|joined")
                    }
                    setJoined(true)
                    setJoining(false)
                    resolve()
                }).catch((error: any) => {
                    // could not join the conversation.
                    setJoining(false)
                    reject(error)
                })
            }
            else {
                reject(HOOK_NAME + "|conversation is not defined")
            }
        })
    }, [conversation])

    const leave = useCallback(() => {
        if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
            console.debug(HOOK_NAME + "|leave", conversation)
        }
        return new Promise<void>((resolve, reject) => {
            if (conversation) {
                conversation.leave().then(() => {
                    // local user successfully left the conversation.
                    if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
                        console.info(HOOK_NAME + "|left", conversation.getName())
                    }
                    setJoined(false)
                    resolve()
                }).catch((error: any) => {
                    reject(error)
                })
            }
            else {
                reject(HOOK_NAME + "|conversation is not defined")
            }
        })
    }, [conversation])

    // Effects
    //
    useEffect(() => {
        if (session && name) {
            if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
                console.debug(HOOK_NAME + "|getOrCreateConversation", name, options)
            }
            const l_conversation = session.getOrCreateConversation(name, options)
            setConversation(l_conversation)
            return () => {
                // It is important to destroy the conversation.
                // Otherwise subsequent getOrCreateConversation with same name would get
                // previous handle, regardless of the potentially new options.
                // This also allows to cleanup memory
                l_conversation.destroy()
            }
        }
    }, [session, name, JSON.stringify(options)])

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
            console.debug(HOOK_NAME + "|useEffect", conversation, autoJoin)
        }
        if (conversation && autoJoin) {
            join()
            return () => {
                if (conversation.isJoined()) {
                    leave()
                }
            }
        }
    }, [conversation, autoJoin])

    return {
        conversation,
        joining,
        joined,
        join,
        leave
    }
}