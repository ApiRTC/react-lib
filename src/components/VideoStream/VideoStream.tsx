import React, { useEffect, useRef } from 'react';

import { Stream } from '@apirtc/apirtc';

import styled from 'styled-components';

const Video = styled.video`
    max-width: 100%;
`;

export interface VideoStreamProps {
    stream: Stream;
}
// VideoStream.defaultProps = {
// }
export default function VideoStream(props: VideoStreamProps) {

    const videoRef = useRef<HTMLVideoElement>(null);

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
    }, [props.stream]);

    return (
        <Video id={props.stream.getId()} ref={videoRef}></Video>
    );
}