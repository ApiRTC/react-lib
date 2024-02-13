import { Stream } from '@apirtc/apirtc';
import { useEffect, useRef, useState } from 'react';

const HOOK_NAME = "useStreamApplyAudioProcessor";
/**
 * This hook takes stream passed as parameter, and
 * returns either this stream or a stream with audio processor applied.
 * This is controlled by the audioProcessorType input attribute.
 * By default the output stream is the input stream.
 * The hook fully manages the output stream (applies 'none' if input stream is set to undefined).
 * The hook never releases the input stream.
 * 
 * @param stream
 * @param audioProcessorType
 * @returns new stream with Audio processor applied (or original stream if no processor applied)
 */
export default function useStreamApplyAudioProcessor(
    stream: Stream | undefined,
    processorType: 'none' | 'noiseReduction',
    errorCallback?: (error: any) => void) {
    //
    const appliedProcessor = useRef<'none' | 'noiseReduction'>();
    const [outStream, setOutStream] = useState(stream);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<any>();

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(`${HOOK_NAME}|useEffect`, stream, processorType)
        }

        const applied = appliedProcessor.current || (stream as any)?.audioAppliedFilter || 'none';
        if (stream && processorType !== applied) {
            setApplying(true)
            stream.applyAudioProcessor(processorType).then(l_stream => {
                setOutStream(l_stream)
                appliedProcessor.current = processorType;
                setError(undefined)
            }).catch(error => {
                setOutStream(stream)
                setError(error)
                if (errorCallback) {
                    errorCallback(error)
                } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                    console.warn(`${HOOK_NAME}|useEffect`, stream, processorType, error)
                }
            }).finally(() => {
                setApplying(false)
            })
            return () => {
                setError(undefined)
            }
        } else {
            setOutStream(stream)
        }
    }, [stream, processorType, errorCallback])

    return {
        stream: outStream,
        applying,
        applied: appliedProcessor.current || (stream as any)?.audioAppliedFilter || 'none',
        error
    }
}