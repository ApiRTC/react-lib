import { Stream, VideoProcessorOptions } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

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
 * @param videoProcessorType
 * @param {VideoProcessorOptions} options
 * @returns new stream with video processor applied (or original stream if no processor applied)
 */
export default function useStreamApplyVideoProcessor(
    stream: Stream | undefined,
    videoProcessorType: 'none' | 'blur' | 'backgroundImage', options?: VideoProcessorOptions,
    errorCallback?: (error: any) => void) {
    //
    const [outStream, setOutStream] = useState(stream);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState<'none' | 'blur' | 'backgroundImage'>(stream ? (stream as any).videoAppliedFilter : 'none');

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(`${HOOK_NAME}|useEffect`, stream, videoProcessorType, options)
        }
        if (stream) {
            setApplying(true)
            stream.applyVideoProcessor(videoProcessorType, options).then(l_stream => {
                setOutStream(l_stream)
                setApplied(videoProcessorType)
            }).catch(error => {
                setOutStream(stream)
                setApplied((stream as any).videoAppliedFilter)
                if (errorCallback) {
                    errorCallback(error)
                } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                    console.warn(`${HOOK_NAME}|useEffect`, stream, videoProcessorType, options, error)
                }
            }).finally(() => {
                setApplying(false)
            })
        } else {
            setOutStream(stream)
            setApplied('none')
        }
    }, [stream, videoProcessorType, JSON.stringify(options)])

    return {
        stream: outStream,
        applying,
        applied
    }
}