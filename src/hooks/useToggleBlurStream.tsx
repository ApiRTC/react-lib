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
            if (outStream && (outStream !== base)) {
                outStream.release()
            }
        }
    }, [base]);


    const setStream = useCallback((stream: Stream|undefined) => {
        setBase(stream)
    }, [])

    const toggle = () => {
        if (outStream === base) {
            base?.blur().then(blurredStream => {
                setOutStream(blurredStream);
                setBlurred(true);
            }).catch(error => {
                console.error(HOOK_NAME + "|toggle blur", error)
            })
        } else {
            outStream?.release()
            setOutStream(base);
            setBlurred(false);
        }
    };

    return { stream: outStream, setStream, toggle, blurred };
}