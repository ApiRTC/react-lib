import { useState, useEffect, useCallback } from "react";

import { Stream } from '@apirtc/apirtc';

const HOOK_NAME = "useToggleBlurStream"
/**
 * This hook takes stream passed as parameter or set with setStream method, and
 * returns either this stream or a blurred version. This is controlled by the
 * toggle method. By default the output stream is not blurred.
 * The hook fully manages the blurred stream (releases it when not blurred).
 * The hook never releases the input stream.
 * 
 * @param stream 
 * @returns stream blurred or not, setStream and toggle methods, boolean blurred state.
 */
export default function useToggleBlurStream(stream?: Stream) {
    const [base, setBase] = useState(stream);
    const [outStream, setOutStream] = useState(stream);
    const [blurred, setBlurred] = useState(false)

    useEffect(() => {
        setBase(stream)
    }, [stream]);

    useEffect(() => {
        if (base && blurred) {
            base.blur().then(blurredStream => {
                setOutStream(blurredStream);
                setBlurred(true);
            }).catch(error => {
                console.error(HOOK_NAME + "|useEffect base blur", error)
            })
        } else {
            setOutStream(base)
        }

        // Should not release base here as it is NOT created in this hook
        // we shall not handle its lifecycle
    }, [base]);

    const doCheckAndReleaseOutStream = useCallback(() => {
        if (outStream && (outStream !== base)) {
            console.log(HOOK_NAME + "|release outStream", outStream)
            outStream.release()
        }
    }, [base, outStream]);

    useEffect(() => {
        return () => {
            doCheckAndReleaseOutStream();
        }
    }, [outStream]);

    const setStream = (stream: Stream | undefined) => {
        setBase(stream)
    }

    const toggle = useCallback(() => {
        if (outStream === base) {
            base?.blur().then(blurredStream => {
                setOutStream(blurredStream);
                setBlurred(true);
            }).catch(error => {
                console.error(HOOK_NAME + "|toggle blur", error)
            })
        } else {
            setOutStream(base);
            setBlurred(false);
        }
    }, [base, outStream]);

    return { stream: outStream, setStream, toggle, blurred };
}