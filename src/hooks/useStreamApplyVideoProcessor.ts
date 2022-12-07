import { useState, useEffect, useCallback } from 'react'
import { Stream, VideoProcessorOptions } from '@apirtc/apirtc'

const HOOK_NAME = "useStreamApplyVideoProcessor";
/**
 * This hook takes stream passed as parameter, and
 * returns either this stream or a stream with video processor applied.
 * This is controlled by the videoProcessorType input attribute.
 * By default the output stream is the input stream.
 * The hook fully manages the output stream (applies 'none' if input stream is set to undefined).
 * The hook never releases the input stream.
 * 
 * @param stream 
 * @returns stream blurred or not, toggle method, boolean blurred state.
 */
export default function useStreamApplyVideoProcessor(
    stream: Stream | undefined,
    videoProcessorType: 'none' | 'blur' | 'backgroundImage', options?: VideoProcessorOptions,
    errorCallback?: (error: any) => void) {
    //
    const [outStream, setOutStream] = useState(stream);
    const [applied, setApplied] = useState<'none' | 'blur' | 'backgroundImage'>('none')

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + "|useEffect", stream, videoProcessorType, options)
        }
        if (stream && videoProcessorType !== 'none') {
            stream.applyVideoProcessor(videoProcessorType, options).then(l_stream => {
                setOutStream(l_stream)
                setApplied(videoProcessorType)
            }).catch(error => {
                setOutStream(stream)
                if (errorCallback) {
                    errorCallback(error)
                } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                    console.warn(HOOK_NAME + "|useEffect", stream, videoProcessorType, options, error)
                }
                setApplied(previousValue => previousValue)
            })
        } else {
            setOutStream(stream)
            setApplied('none')
        }
    }, [stream, videoProcessorType, options])

    const doCheckAndReleaseOutStream = useCallback(() => {
        if (outStream && (outStream !== stream)) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + "|releasing outStream", outStream)
            }
            // stream?.applyVideoProcessor('none').catch(error => {
            //     if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
            //         console.warn(HOOK_NAME + "|doCheckAndReleaseOutStream", stream, outStream)
            //     }
            // })
            outStream.release()
        }
    }, [stream, outStream])

    useEffect(() => {
        return () => {
            doCheckAndReleaseOutStream()
        }
    }, [outStream])

    return {
        stream: outStream,
        applied
    }
}