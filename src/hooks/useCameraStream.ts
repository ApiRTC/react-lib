import { useState, useEffect } from 'react';

import { CreateStreamOptions, Session, Stream, UserAgent } from '@apirtc/apirtc';

const HOOK_NAME = "useCameraStream"
export default function useCameraStream(
    session: Session | undefined,
    options: CreateStreamOptions = {}
) {
    const [stream, setStream] = useState<Stream>();

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
            return () => {
                setStream(undefined)
            }
        } else {
            setStream(undefined)
        }

    }, [session, JSON.stringify(options)]);

    useEffect(() => {
        return () => {
            if (stream) {
                console.info(HOOK_NAME + "|release stream", stream)
                stream.release();
            }
        }
    }, [stream]);

    return {
        stream
    };
}