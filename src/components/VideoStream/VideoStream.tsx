import React, { useEffect, useRef } from 'react'
import { Stream } from '@apirtc/apirtc'
//import styled from 'styled-components'

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
}
export default function VideoStream(props: VideoStreamProps) {

    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current) {
            props.stream.attachToElement(videoRef.current)
            videoRef.current.autoplay = true;
        }

        return () => {
            if (videoRef.current)
                // (videoRef.current as HTMLVideoElement).src = "";
                videoRef.current.src = "";
        }
    }, [props.stream])

    return <video id={props.stream.getId()} ref={videoRef}></video>
}