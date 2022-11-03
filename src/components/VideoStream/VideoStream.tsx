import React, { useEffect, useRef } from 'react'
import { Stream } from '@apirtc/apirtc'
// import styled from 'styled-components'

// const Video = styled.video`
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
    stream: Stream
    muted?: boolean
}
export default function VideoStream(props: VideoStreamProps) {

    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const ref = videoRef.current;
        if (ref && props.stream) {
            props.stream.attachToElement(videoRef.current)
            ref.autoplay = true;
            return () => {
                ref.src = "";
            }
        }
    }, [props.stream])

    // return <Video id={props.stream.getId()} ref={videoRef} muted={props.muted}></Video>
    return <video style={{ maxWidth: '100%' }} id={props.stream.getId()} ref={videoRef} muted={props.muted}></video>
}