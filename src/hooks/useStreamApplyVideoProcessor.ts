import { useState, useEffect, useCallback } from 'react'
import { Stream, VideoProcessorOptions } from '@apirtc/apirtc'

const HOOK_NAME = "useStreamApplyVideoProcessor"
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
export default function useStreamApplyVideoProcessor(
    stream: Stream | undefined,
    videoProcessorType: 'none' | 'blur' | 'backgroundImage', options?: VideoProcessorOptions) {
    //
    //const [base, setBase] = useState(stream)
    const [outStream, setOutStream] = useState(stream)
    // const [_videoProcessorType, setVideoProcessorType] = useState(videoProcessorType)
    // const [_options, setOptions] = useState(options)
    const [applied, setApplied] = useState<'none' | 'blur' | 'backgroundImage'>('none')
    const [error, setError] = useState()

    const doIt = useCallback((type, opts?) => {
        if (stream && type !== applied) {
            stream.applyVideoProcessor(type, opts).then(l_stream => {
                setOutStream(l_stream)
                setApplied(type)
            }).catch(error => {
                if (globalThis.apirtcReactLibLogLevel?.isWarnEnabled) {
                    console.warn(HOOK_NAME + "|useEffect base type options", stream, type, opts, error)
                }
                setOutStream(stream)
                setError(error)
            })
        } else {
            setOutStream(stream)
        }

    }, [stream, applied])

    useEffect(() => {
        if (stream) {
            return () => {
                setOutStream(undefined)
                doIt('none')
            }
        }
    }, [stream])

    useEffect(() => {
        doIt(videoProcessorType, options)

        // Should not release base here as it is NOT created in this hook
        // we shall not handle its lifecycle
    }, [stream, videoProcessorType, options])

    return {
        stream: outStream,
        applied,
        error
    }
}