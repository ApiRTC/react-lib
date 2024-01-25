import { CreateStreamOptions, Session, Stream, UserAgent } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

const EMPTY = {};

const HOOK_NAME = "useCameraStream";
export function useCameraStream(
    session: Session | undefined,
    options: CreateStreamOptions = EMPTY, // used to be = {} but this triggers infinite loop with useEffect
    errorCallback?: (error: any) => void
) {
    const [stream, setStream] = useState<Stream>();
    const [grabbing, setGrabbing] = useState<boolean>(false);

    const [error, setError] = useState<any>();

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(`${HOOK_NAME}|useEffect`, session, options)
        }
        if (session) {
            const userAgent: UserAgent = session.getUserAgent();
            setGrabbing(true)
            userAgent.createStream(options).then((localStream: Stream) => {
                if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                    console.info(`${HOOK_NAME}|createStream`, options, localStream)
                }
                setStream(localStream)
                setError(undefined)
            }).catch((error: any) => {
                console.error(`${HOOK_NAME}|createStream error`, options, error)
                setStream(undefined)
                if (errorCallback) {
                    errorCallback(error)
                }
                setError(error)
            }).finally(() => {
                setGrabbing(false)
            })

            // DO NOT set out stream to undefined in the return, to prevent unnecessary refreshes
            // of other components with undefined stream, whereas we are expecting to change it
            // to another instance..
            // return () => { setStream(undefined) } // DON'T
        } else {
            setStream(undefined)
            setError(undefined)
        }
    }, [session, options, errorCallback])

    useEffect(() => {
        const l_stream = stream;
        if (l_stream) {
            return () => {
                if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                    console.info(`${HOOK_NAME}|release stream`, l_stream)
                }
                l_stream.release()
            }
        }
    }, [stream])

    return {
        stream,
        grabbing,
        error
    }
}