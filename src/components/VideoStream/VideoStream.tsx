import React, { useEffect, useRef } from 'react'
import { Stream } from '@apirtc/apirtc'

// tried const Video = styled.video`
//     max-width: 100%;
// `
// or
// /* override other styles to make responsive */
// width: 100%    !important;
// height: auto   !important;
// or
// return <video width="100%" ...
//
// but for all there is a problem then in react display...

export interface VideoStreamProps {
    stream: Stream,
    autoPlay?: boolean,
    muted?: boolean
}
export default function VideoStream(props: VideoStreamProps) {

    // default autoPlay
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