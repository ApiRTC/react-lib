import { useState, useEffect, useCallback } from "react";

import { Stream } from '@apirtc/apirtc';

const HOOK_NAME = "useToggleBlurStream"
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

        return () => {
            if (base) {
                console.log(HOOK_NAME + "|release base", base)
                base.release()
            }
        }
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