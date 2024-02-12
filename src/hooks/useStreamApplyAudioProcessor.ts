import { Stream } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

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
    audioProcessorType: 'none' | 'noiseReduction',
    errorCallback?: (error: any) => void) {
    //
    const [outStream, setOutStream] = useState(stream);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState<'none' | 'noiseReduction'>(stream ? (stream as any).audioAppliedFilter : 'none');

    const [error, setError] = useState<any>();

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(`${HOOK_NAME}|useEffect`, stream, audioProcessorType)
        }
        if (stream) {
            setApplying(true)
            stream.applyAudioProcessor(audioProcessorType).then(l_stream => {
                setOutStream(l_stream)
                setApplied(audioProcessorType)
                setError(undefined)
            }).catch(error => {
                setOutStream(stream)
                setApplied((stream as any).audioAppliedFilter)
                setError(error)
                if (errorCallback) {
                    errorCallback(error)
                } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                    console.warn(`${HOOK_NAME}|useEffect`, stream, audioProcessorType, error)
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
    }, [stream, audioProcessorType, errorCallback])

    return {
        stream: outStream,
        applying,
        applied,
        error
    }
}