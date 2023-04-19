import { CreateStreamOptions, Session, Stream, UserAgent } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

const HOOK_NAME = "useCameraStream";
export function useCameraStream(
    session: Session | undefined,
    options: CreateStreamOptions = {}
) {
    const [stream, setStream] = useState<Stream>();

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + "|useEffect", session, JSON.stringify(options))
        }
        if (session) {
            const userAgent: UserAgent = session.getUserAgent();
            userAgent.createStream(options).then((localStream: Stream) => {
                if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                    console.info(HOOK_NAME + "|createStream", options, localStream)
                }
                setStream(localStream)
            }).catch((error: any) => {
                console.error(HOOK_NAME + "|createStream", options, error)
                setStream(undefined)
            })

            // DO NOT set out stream to undefined in the return, to prevent unnecessary refreshes
            // of other components with undefined stream, whereas we are expecting to change it
            // to another instance..
            // return () => { setStream(undefined) } // DON'T
        } else {
            setStream(undefined)
        }

    }, [session, JSON.stringify(options)])

    useEffect(() => {
        const l_stream = stream;
        if (l_stream) {
            return () => {
                if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                    console.info(HOOK_NAME + "|release stream", l_stream)
                }
                l_stream.release()
            }
        }
    }, [stream])

    return {
        stream
    }
}