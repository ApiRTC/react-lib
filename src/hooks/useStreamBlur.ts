import { useState, useEffect, useCallback } from 'react'
import { Stream } from '@apirtc/apirtc'

const HOOK_NAME = "useStreamBlur"
/**
 * This hook takes stream passed as parameter, and
 * returns either this stream or a blurred version.
 * This is controlled by the blur input attribute or toggle function.
 * By default the output stream is not blurred.
 * The hook fully manages the blurred stream (releases it when not blurred).
 * The hook never releases the input stream.
 * 
 * @param stream 
 * @returns stream blurred or not, toggle method, boolean blurred state.
 */
export default function useStreamBlur(stream: Stream | undefined, blur?: boolean) {
    const [outStream, setOutStream] = useState(stream)
    const [_blur, setBlur] = useState(blur)
    const [blurred, setBlurred] = useState<boolean>()

    useEffect(() => {
        setBlur(blur)
    }, [blur])

    useEffect(() => {
        if (stream && _blur) {
            stream.blur().then(blurredStream => {
                setOutStream(blurredStream)
                setBlurred(true)
            }).catch(error => {
                if (globalThis.apirtcReactLibLogLevel?.isWarnEnabled) {
                    console.warn(HOOK_NAME + "|useEffect stream blur", error)
                }
                setOutStream(stream)
                setBlurred(false)
            })
        } else {
            setOutStream(stream)
            setBlurred(false)
        }

        // Should not release stream here as it is NOT created in this hook
        // thus we shall not handle its lifecycle
    }, [stream, _blur])

    const doCheckAndReleaseOutStream = useCallback(() => {
        if (outStream && (outStream !== stream)) {
            if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
                console.debug(HOOK_NAME + "|releasing outStream", outStream)
            }
            outStream.release()
        }
    }, [stream, outStream])

    useEffect(() => {
        return () => {
            doCheckAndReleaseOutStream()
        }
    }, [outStream])

    const toggle = useCallback(() => {
        setBlur(!blurred)
    }, [blurred])

    return {
        stream: outStream,
        toggle,
        blurred
    }
}