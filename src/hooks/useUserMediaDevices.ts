import { MediaDevice, MediaDeviceList, Session, UserAgent } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

const EMPTY_LIST: MediaDeviceList = { audioinput: {}, audiooutput: {}, videoinput: {} };

const HOOK_NAME = "useUserMediaDevices";
export default function useUserMediaDevices(
    session: Session | undefined,
    storageKeyPrefix: string = "apirtc"
) {
    const [userMediaDevices, setUserMediaDevices] = useState<MediaDeviceList>(EMPTY_LIST);

    const [selectedAudioIn, setSelectedAudioIn] = useState<MediaDevice>();
    const [selectedAudioOut, setSelectedAudioOut] = useState<MediaDevice>();
    const [selectedVideoIn, setSelectedVideoIn] = useState<MediaDevice>();

    const AUDIO_INPUT_ID_KEY = storageKeyPrefix + 'audioInputId';
    const AUDIO_OUTPUT_ID_KEY = storageKeyPrefix + 'audioOutputId';
    const VIDEO_INPUT_ID_KEY = storageKeyPrefix + 'videoInputId';

    useEffect(() => {
        if (session) {
            const userAgent: UserAgent = session.getUserAgent();

            const on_mediaDeviceChanged = () => {
                const mediaDevices: MediaDeviceList = userAgent.getUserMediaDevices()
                if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                    console.info(HOOK_NAME + "|mediaDeviceChanged", mediaDevices)
                }
                setUserMediaDevices(mediaDevices)
            };
            userAgent.on('mediaDeviceChanged', on_mediaDeviceChanged)

            return () => {
                userAgent.removeListener('mediaDeviceChanged', on_mediaDeviceChanged)
                setUserMediaDevices(EMPTY_LIST)
            }
        }
    }, [session])

    useEffect(() => {
        const audioInputId = localStorage.getItem(AUDIO_INPUT_ID_KEY);
        const audioOutputId = localStorage.getItem(AUDIO_OUTPUT_ID_KEY);
        const videoInputId = localStorage.getItem(VIDEO_INPUT_ID_KEY);

        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(HOOK_NAME + '|userMediaDevices, audioInputId, audioOutputId, videoInputId', userMediaDevices, audioInputId, audioOutputId, videoInputId)
        }

        if (audioInputId && userMediaDevices.audioinput[audioInputId]) {
            setSelectedAudioIn(userMediaDevices.audioinput[audioInputId])
        }
        if (audioOutputId && userMediaDevices.audiooutput[audioOutputId]) {
            setSelectedAudioOut(userMediaDevices.audiooutput[audioOutputId])
        }
        if (videoInputId && userMediaDevices.videoinput[videoInputId]) {
            setSelectedVideoIn(userMediaDevices.videoinput[videoInputId])
        }
    }, [userMediaDevices])

    useEffect(() => {
        if (selectedAudioIn) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + '|Storing audioInputId', selectedAudioIn.getId())
            }
            localStorage.setItem(AUDIO_INPUT_ID_KEY, selectedAudioIn.getId())
        }
    }, [selectedAudioIn])

    useEffect(() => {
        if (selectedAudioOut) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + '|Storing audioOutputId', selectedAudioOut.getId())
            }
            localStorage.setItem(AUDIO_OUTPUT_ID_KEY, selectedAudioOut.getId())
        }
    }, [selectedAudioOut])

    useEffect(() => {
        if (selectedVideoIn) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + '|Storing videoInputId', selectedVideoIn.getId())
            }
            localStorage.setItem(VIDEO_INPUT_ID_KEY, selectedVideoIn.getId())
        }
    }, [selectedVideoIn])

    return {
        userMediaDevices,
        selectedAudioIn, setSelectedAudioIn,
        selectedAudioOut, setSelectedAudioOut,
        selectedVideoIn, setSelectedVideoIn
    }
}