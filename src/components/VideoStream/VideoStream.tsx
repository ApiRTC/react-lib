import React, { useEffect, useRef } from 'react';

import { Stream } from '@apirtc/apirtc';

export type VideoStreamProps = {
    stream: Stream,
    autoPlay?: boolean,
    muted?: boolean
};
export default function VideoStream(props: VideoStreamProps) {

    const { autoPlay = true } = props;

    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const ref = videoRef.current;
        if (ref && props.stream) {
            props.stream.attachToElement(ref)
            return () => {
                ref.src = "";
            }
        }
    }, [props.stream])
    // No need to put videoRef.current because useRef does not trigger rerender anyways

    return <video id={props.stream.getId()} style={{ maxWidth: '100%' }}
        ref={videoRef}
        autoPlay={autoPlay}
        muted={props.muted}></video>
}