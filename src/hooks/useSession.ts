import { RegisterInformation, Session, UserAgent } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

export type LoginPassword = {
    username: string
    password: string
};
function isInstanceOfLoginPassword(object: any): object is LoginPassword {
    if (typeof object !== 'object') return false;
    return 'username' in object;
}

export type ApiKey = { apiKey: string };
function isInstanceOfApiKey(object: any): object is ApiKey {
    if (typeof object !== 'object') return false;
    return 'apiKey' in object;
}

export type Token = { token: string };
function isInstanceOfToken(object: any): object is Token {
    if (typeof object !== 'object') return false;
    return 'token' in object;
}

export type Credentials = LoginPassword | ApiKey | Token;

const HOOK_NAME = "useSession";
export default function useSession(credentials?: Credentials, options?: RegisterInformation,
    errorCallback?: (error: any) => void) {

    const [session, setSession] = useState<Session | undefined>();
    const [connecting, setConnecting] = useState<boolean>(false);
    //const [error, setError] = useState<any>();

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + "|useEffect credentials, options", credentials, options)
        }
        if (credentials) {
            // To fix errors like "Warning: Can't perform a React state update on an unmounted component"
            // https://stackoverflow.com/questions/53949393/cant-perform-a-react-state-update-on-an-unmounted-component
            //let isMounted = true;
            connect(credentials, options).catch((error: any) => {
                console.error(HOOK_NAME + "|connection failed", error)
                setSession(undefined)
                // if (isMounted) {
                //     setError(error)
                // }

                if (errorCallback) {
                    errorCallback(error)
                } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                    console.warn(`${HOOK_NAME}|connect|error`, error)
                }

            })
            return () => {
                //isMounted = false;
                setSession(undefined)
                // Even though connecting is managed in connect(),
                // mark connecting to false when credentials are changed
                // as this shall be way to connect elsewhere or connect to
                // with other credentials. Note that to be perfect we should
                // cancel the potentially running connect : Is that possible with ApiRTC ?
                setConnecting(false)
                //setError(undefined)
            }
        }
    }, [JSON.stringify(credentials), JSON.stringify(options)])

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + "|useEffect session", session)
        }
        if (session) {
            const l_session = session;
            return () => {
                l_session.disconnect().then(() => {
                    if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                        console.info(HOOK_NAME + "|disconnected", l_session)
                    }
                }).catch((error: any) => {
                    console.error(HOOK_NAME + "|disconnect", error)
                })
            }
        }
    }, [session])

    const connect = (credentials: Credentials | undefined, options?: RegisterInformation) => {
        return new Promise<void>((resolve, reject) => {
            const registerInformation: RegisterInformation = options ? options : {
                cloudUrl: 'https://cloud.apirtc.com',
            };

            let l_userAgent;

            if (isInstanceOfLoginPassword(credentials)) {
                registerInformation.password = credentials.password;
                l_userAgent = new UserAgent({
                    uri: 'apirtc:' + credentials.username
                });
            } else if (isInstanceOfApiKey(credentials)) {
                l_userAgent = new UserAgent({
                    uri: `apiKey:${credentials.apiKey}`
                });
            } else if (isInstanceOfToken(credentials)) {
                l_userAgent = new UserAgent({
                    uri: `token:${credentials.token}`
                });
            } else {
                reject("credentials not recognized")
                return
            }

            setConnecting(true)
            l_userAgent.register(registerInformation).then(l_session => {
                if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                    console.info(HOOK_NAME + "|connected", l_session)
                }
                setSession(l_session)
                resolve()
            }).catch((error: any) => {
                reject(error)
            }).finally(() => {
                setConnecting(false)
            })
        })
    };

    // const disconnect = useCallback(() => {
    //     return new Promise<void>((resolve, reject) => {
    //         if (session) {
    //             const l_session = session;
    //             l_session.disconnect().then(() => {
    //                 console.log(HOOK_NAME + "|disconnected", l_session)
    //                 setSession(undefined)
    //                 resolve()
    //             }).catch((error: any) => {
    //                 console.error(HOOK_NAME + "|disconnect", error)
    //                 reject(error)
    //             })
    //         } else {
    //             resolve()
    //         }
    //     })
    // }, [session])

    const disconnect = () => {
        setSession(undefined)
    };

    return {
        //userAgent: userAgent, // can get it from session
        session: session,
        connecting,
        connect,
        disconnect
    }
}
