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
    const [base, setBase] = useState(stream)
    const [outStream, setOutStream] = useState(stream)
    const [_blur, setBlur] = useState(blur)
    const [blurred, setBlurred] = useState<boolean>()

    useEffect(() => {
        setBase(stream)
    }, [stream])

    useEffect(() => {
        setBlur(blur)
    }, [blur])

    useEffect(() => {
        if (base && _blur) {
            base.blur().then(blurredStream => {
                setOutStream(blurredStream)
                setBlurred(true)
            }).catch(error => {
                console.error(HOOK_NAME + "|useEffect base blur", error)
                setOutStream(base)
                setBlurred(false)
            })
        } else {
            setOutStream(base)
            setBlurred(false)
        }

        // Should not release base here as it is NOT created in this hook
        // we shall not handle its lifecycle
    }, [base, _blur])

    const doCheckAndReleaseOutStream = useCallback(() => {
        if (outStream && (outStream !== base)) {
            outStream.release()
        }
    }, [base, outStream])

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