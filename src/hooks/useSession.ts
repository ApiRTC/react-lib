import { useEffect, useState, useCallback } from 'react'
import { Session, UserAgent, RegisterInformation } from '@apirtc/apirtc'

type LoginPassword = {
    username: string
    password: string
}
function isInstanceOfLoginPassword(object: any): object is LoginPassword {
    if (!object) return false;
    return 'username' in object;
}

type ApiKey = { apiKey: string }
function isInstanceOfApiKey(object: any): object is ApiKey {
    if (!object) return false;
    return 'apiKey' in object;
}

type Token = { token: string }
function isInstanceOfToken(object: any): object is Token {
    if (!object) return false;
    return 'token' in object;
}

export type Credentials = LoginPassword | ApiKey | Token

interface SessionOutput {
    session?: Session
    connect: (credentials: Credentials | undefined, options?: RegisterInformation) => Promise<void>
    disconnect: () => void
}

const HOOK_NAME = "useSession"
// credentials?: Credentials, options?: RegisterInformation
export default function useSession(): SessionOutput {

    const [session, setSession] = useState<Session | undefined>()

    // https://devtrium.com/posts/async-functions-useeffect
    // Effects
    //
    // useEffect(() => {

    //     let isSubscribed = true;

    //     const doConnect = async () => {
    //         const registerInformation: RegisterInformation = options ? options : {
    //             cloudUrl: 'https://cloud.apirtc.com',
    //         }
    //         let l_userAgent;
    //         if (isInstanceOfLoginPassword(credentials)) {
    //             l_userAgent = new UserAgent({
    //                 uri: 'apirtc:' + credentials.username
    //             })
    //             registerInformation.password = credentials.password
    //         } else if (isInstanceOfApiKey(credentials)) {
    //             l_userAgent = new UserAgent({
    //                 uri: `apiKey:${credentials.apiKey}`
    //             })
    //         } else if (isInstanceOfToken(credentials)) {
    //             l_userAgent = new UserAgent({
    //                 uri: `token:${credentials.token}`,
    //             })
    //         } else {
    //             console.error(HOOK_NAME + "|credentials not recognized")
    //             return
    //         }
    //         if (isSubscribed) {
    //             setSession(await l_userAgent.register(registerInformation))
    //         }
    //     }

    //     doConnect()
    //         // make sure to catch any error
    //         .catch(error => {
    //             console.error(HOOK_NAME + "|doConnect", error)
    //         });

    //     return () => { isSubscribed = false };
    // }, [JSON.stringify(credentials), JSON.stringify(options)])

    // useEffect(() => {
    //     if (session) {
    //         return () => {
    //             const l_session = session;
    //             l_session.disconnect().then(() => {
    //                 console.log(HOOK_NAME + "|disconnected", l_session)
    //                 setSession(undefined)
    //             }).catch((error: any) => {
    //                 console.error(HOOK_NAME + "|disconnect", error)
    //             })
    //         }
    //     }
    // }, [session])

    const connect = (credentials: Credentials | undefined, options?: RegisterInformation) => {
        return new Promise<void>((resolve, reject) => {
            const registerInformation: RegisterInformation = options ? options : {
                cloudUrl: 'https://cloud.apirtc.com',
            }

            let l_userAgent;
            
            if (isInstanceOfLoginPassword(credentials)) {
                l_userAgent = new UserAgent({
                    uri: 'apirtc:' + credentials.username
                })
                registerInformation.password = credentials.password;
            } else if (isInstanceOfApiKey(credentials)) {
                l_userAgent = new UserAgent({
                    uri: `apiKey:${credentials.apiKey}`
                })
            } else if (isInstanceOfToken(credentials)) {
                l_userAgent = new UserAgent({
                    uri: `token:${credentials.token}`
                })
            } else {
                reject("credentials not recognized")
                return
            }

            l_userAgent.register(registerInformation).then(l_session => {
                setSession(l_session)
                resolve()
            }).catch((error: any) => { reject(error) })
        })
    }

    const disconnect = useCallback(() => {
        return new Promise<void>((resolve, reject) => {
            if (session) {
                const l_session = session;
                l_session.disconnect().then(() => {
                    console.log(HOOK_NAME + "|disconnected", l_session)
                    setSession(undefined)
                    resolve()
                }).catch((error: any) => {
                    console.error(HOOK_NAME + "|disconnect", error)
                    reject(error)
                })
            } else {
                resolve()
            }
        })
    }, [session])

    return {
        //userAgent: userAgent, // can get it from session
        session: session,
        connect,
        disconnect
    }
}
