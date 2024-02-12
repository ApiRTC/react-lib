import { Stream, VideoProcessorOptions } from '@apirtc/apirtc';
import { useEffect, useRef, useState } from 'react';

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
 * @param processorType
 * @param {VideoProcessorOptions} options
 * @returns new stream with video processor applied (or original stream if no processor applied)
 */
export default function useStreamApplyVideoProcessor(
    stream: Stream | undefined,
    processorType: 'none' | 'blur' | 'backgroundImage', options?: VideoProcessorOptions,
    errorCallback?: (error: any) => void) {
    //
    const appliedProcessor = useRef('none');
    const [outStream, setOutStream] = useState(stream);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState<'none' | 'blur' | 'backgroundImage'>(stream ? (stream as any).videoAppliedFilter : 'none');

    const [error, setError] = useState<any>();

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(`${HOOK_NAME}|useEffect`, stream, processorType, options)
        }
        if (stream && processorType !== appliedProcessor.current) {
            setApplying(true)
            stream.applyVideoProcessor(processorType, options).then(l_stream => {
                setOutStream(l_stream)
                setApplied(processorType)
                appliedProcessor.current = processorType;
                setError(undefined)
            }).catch(error => {
                setOutStream(stream)
                setApplied((stream as any).videoAppliedFilter)
                setError(error)
                if (errorCallback) {
                    errorCallback(error)
                } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                    console.warn(`${HOOK_NAME}|useEffect`, stream, processorType, options, error)
                }
            }).finally(() => {
                setApplying(false)
            })
            return () => {
                setApplied('none')
                setError(undefined)
            }
        } else {
            setOutStream(stream)
        }
    }, [stream, processorType, options, errorCallback])

    return {
        stream: outStream,
        applying,
        applied,
        error
    }
}