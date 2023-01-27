import { Conversation, GetOrCreateConversationOptions, Session } from '@apirtc/apirtc';
import { useCallback, useEffect, useState } from 'react';

const HOOK_NAME = "useConversation";
/**
 * Please note that the hook won't react on autoJoin change
 */
export default function useConversation(
    session: Session | undefined,
    name: string | undefined,
    options?: GetOrCreateConversationOptions,
    join: boolean = false
) {
    const [conversation, setConversation] = useState<Conversation>();
    const [joined, setJoined] = useState<boolean>(false);
    const [joining, setJoining] = useState<boolean>(false);

    // Callbacks
    //
    // Offering Promised join/leave methods allows developer to act on then/catch
    //
    const o_join = useCallback(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + "|join", conversation)
            //JSON.stringify((apiRTC as any).session.apiCCWebRTCClient.webRTCClient.MCUClient.sessionMCUs))
        }
        return new Promise<void>((resolve, reject) => {
            if (!conversation) {
                reject(HOOK_NAME + "|join|conversation not defined")
                return
            }
            if (!conversation.isJoined()) {
                setJoining(true)
                conversation.join().then(() => {
                    // successfully joined the conversation.
                    setJoined(true)
                    resolve()
                }).catch((error: any) => {
                    // could not join the conversation.
                    reject(error)
                }).finally(() => {
                    setJoining(false)
                })
            } else {
                reject(HOOK_NAME + "|join|conversation already joined")
            }
        })
    }, [conversation]);

    const o_leave = useCallback(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + "|leave", conversation)
        }
        return new Promise<void>((resolve, reject) => {
            if (!conversation) {
                reject(HOOK_NAME + "|leave|conversation not defined")
                return
            }
            if (conversation.isJoined()) {
                conversation.leave().then(() => {
                    // local user successfully left the conversation.
                    setJoined(false)
                    resolve()
                }).catch((error: any) => {
                    reject(error)
                })
            } else {
                reject(HOOK_NAME + "|leave|conversation is not joined")
            }
        })
    }, [conversation]);

    // Effects
    //
    useEffect(() => {
        if (session && name) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + "|getOrCreateConversation", name, options, join)
            }
            const l_conversation = session.getOrCreateConversation(name, options);
            setConversation(l_conversation)
            return () => {
                if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                    console.debug(HOOK_NAME + "|useEffect cleanup", name, options, join)
                }
                if (l_conversation.isJoined()) {
                    l_conversation.leave()
                        .then(() => { })
                        .catch((error: any) => {
                            if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                                console.warn(HOOK_NAME + "|useEffect conversation.leave()", error)
                            }
                        })
                        .finally(() => {
                            l_conversation.destroy()
                            setConversation(undefined)
                            setJoined(false)
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
    }, [session, name, JSON.stringify(options)])

    useEffect(() => {
        if (conversation && join) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + "|useEffect", conversation, join)
            }
            const l_conversation = conversation;
            const l_join = join;
            if (l_join) {
                setJoining(true)
                l_conversation.join().then(() => {
                    if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                        console.info(HOOK_NAME + "|joined", l_conversation)
                    }
                    setJoined(true)
                }).catch((error: any) => {
                    if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                        console.warn(HOOK_NAME + "|useEffect conversation.join()", error)
                    }
                }).finally(() => {
                    setJoining(false)
                })
            }
            return () => {
                if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                    console.debug(HOOK_NAME + "|useEffect cleanup", l_conversation, l_join)
                }
                if (l_conversation.isJoined()) {
                    l_conversation.leave().then(() => {
                        setJoined(false)
                    }).catch((error: any) => {
                        if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                            console.warn(HOOK_NAME + "|useEffect conversation.leave()", error)
                        }
                    })
                }
            }
        }
    }, [conversation, join])

    return {
        conversation,
        joining,
        joined,
        join: o_join,
        leave: o_leave
    }
}