import { useState, useEffect, useCallback } from 'react';

import { CreateStreamOptions, Session, Stream, UserAgent } from '@apirtc/apirtc';

const HOOK_NAME = "useCameraStream"
export default function useCameraStream(
    session: Session | undefined,
    options: CreateStreamOptions = {}
) {
    const [stream, setStream] = useState<Stream>();

    const doRelease = useCallback(() => {
        if (stream) {
            stream.release();
        }
    }, [stream])

    useEffect(() => {
        if (session) {
            const userAgent: UserAgent = session.getUserAgent();
            userAgent.createStream(options).then((localStream: Stream) => {
                console.info(HOOK_NAME + "|createStream", options, localStream)
                setStream(localStream);
            }).catch((error: any) => {
                console.error(HOOK_NAME + "|createStream", options, error)
                setStream(undefined)
            });
        } else {
            setStream(undefined)
        }
        return () => {
            doRelease()
        }
    }, [session, JSON.stringify(options)]);

    return {
        stream
    };
}