import { useState, useEffect, useCallback } from 'react'
import apiRTC, { Conversation, GetOrCreateConversationOptions, Session } from '@apirtc/apirtc'

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
        if (!conversation) {
            console.error(HOOK_NAME + "|join|conversation is not defined")
            return
        }
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + "|" + new Date + "|join", conversation,
                JSON.stringify((apiRTC as any).session.apiCCWebRTCClient.webRTCClient.MCUClient.sessionMCUs))
        }
        return new Promise<void>((resolve, reject) => {
            if (!conversation.isJoined()) {
                setJoining(true)
                conversation.join().then(() => {
                    // successfully joined the conversation.
                    if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                        console.info(HOOK_NAME + "|joined", conversation)
                    }
                    setJoined(true)
                    setJoining(false)
                    resolve()
                }).catch((error: any) => {
                    // could not join the conversation.
                    setJoining(false)
                    reject(error)
                })
            } else {
                reject(HOOK_NAME + "|join|conversation already joined")
            }
        })
    }, [conversation])

    const leave = useCallback(() => {
        if (!conversation) {
            console.error(HOOK_NAME + "|leave|conversation is not defined")
            return
        }
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + "|leave", conversation)
        }
        return new Promise<void>((resolve, reject) => {
            if (conversation.isJoined()) {
                conversation.leave().then(() => {
                    // local user successfully left the conversation.
                    if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                        console.info(HOOK_NAME + "|left", conversation.getName())
                    }
                    setJoined(false)
                    resolve()
                }).catch((error: any) => {
                    reject(error)
                })
            } else {
                reject(HOOK_NAME + "|leave|conversation is not joined")
            }
        })
    }, [conversation])

    // Effects
    //
    useEffect(() => {
        if (session && name) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + "|getOrCreateConversation", name, options)
            }
            const l_conversation = session.getOrCreateConversation(name, options);
            setConversation(l_conversation)
            const l_autoJoin = autoJoin;
            if (l_autoJoin) {
                setJoining(true)
                l_conversation.join().then(() => {
                    if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                        console.info(HOOK_NAME + "|joined", l_conversation)
                        //,JSON.stringify((apiRTC as any).session.apiCCWebRTCClient.webRTCClient.MCUClient.sessionMCUs))
                    }
                    setJoined(true)
                    setJoining(false)
                }).catch((error: any) => {
                    if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                        console.warn(HOOK_NAME + "|useEffect conversation.join()", error)
                    }
                    setJoining(false)
                })
            }
            return () => {
                if (l_conversation.isJoined()) {
                    l_conversation.leave().then(() => {
                        l_conversation.destroy()
                        setConversation(undefined)
                    }).catch((error: any) => {
                        if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                            console.warn(HOOK_NAME + "|useEffect conversation.leave()", error)
                        }
                        l_conversation.destroy()
                        setConversation(undefined)
                    })
                } else {
                    // It is important to destroy the conversation.
                    // Otherwise subsequent getOrCreateConversation with same name would get
                    // previous handle, regardless of the potentially new options.
                    // This also allows to cleanup memory
                    l_conversation.destroy()
                    setConversation(undefined)
                }
            }
        }
    }, [session, name, JSON.stringify(options), autoJoin])

    return {
        conversation,
        joining,
        joined,
        join,
        leave
    }
}