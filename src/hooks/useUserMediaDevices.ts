import { MediaDevice, MediaDeviceList, Session, UserAgent } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

const EMPTY_LIST: MediaDeviceList = { audioinput: {}, audiooutput: {}, videoinput: {} };

const getMediaDeviceFromLocalStorage = (key: string) => {
    const value = localStorage.getItem(key);
    const obj = value ? JSON.parse(value) : null;
    return obj ? new MediaDevice(obj.id, obj.type, obj.label) : undefined;
};

const HOOK_NAME = "useUserMediaDevices";
export function useUserMediaDevices(
    session: Session | undefined,
    storageKeyPrefix: string = "apirtc"
) {
    const [userMediaDevices, setUserMediaDevices] = useState<MediaDeviceList>(EMPTY_LIST);

    const AUDIO_INPUT_KEY = storageKeyPrefix + '.audioIn';
    const AUDIO_OUTPUT_KEY = storageKeyPrefix + '.audioOut';
    const VIDEO_INPUT_KEY = storageKeyPrefix + '.videoIn';

    const [selectedAudioIn, setSelectedAudioIn] = useState<MediaDevice | undefined>(getMediaDeviceFromLocalStorage(AUDIO_INPUT_KEY));
    const [selectedAudioOut, setSelectedAudioOut] = useState<MediaDevice | undefined>(getMediaDeviceFromLocalStorage(AUDIO_OUTPUT_KEY));
    const [selectedVideoIn, setSelectedVideoIn] = useState<MediaDevice | undefined>(getMediaDeviceFromLocalStorage(VIDEO_INPUT_KEY));

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
        if (userMediaDevices !== EMPTY_LIST) {
            const audioInputValue = localStorage.getItem(AUDIO_INPUT_KEY);
            const audioInputId: string = audioInputValue ? JSON.parse(audioInputValue)['id'] : undefined;
            if (audioInputId) {
                setSelectedAudioIn(userMediaDevices.audioinput[audioInputId])
            }

            const audioOutputValue = localStorage.getItem(AUDIO_OUTPUT_KEY);
            const audioOutputId: string = audioOutputValue ? JSON.parse(audioOutputValue)['id'] : undefined;
            if (audioOutputId) {
                setSelectedAudioOut(userMediaDevices.audiooutput[audioOutputId])
            }

            const videoInputValue = localStorage.getItem(VIDEO_INPUT_KEY);
            const videoInputId: string = videoInputValue ? JSON.parse(videoInputValue)['id'] : undefined;
            if (videoInputId) {
                setSelectedVideoIn(userMediaDevices.videoinput[videoInputId])
            }

            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + '|userMediaDevices, audioInputId, audioOutputId, videoInputId', userMediaDevices, audioInputId, audioOutputId, videoInputId)
            }
        }

    }, [userMediaDevices])

    useEffect(() => {
        if (selectedAudioIn) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + '|Storing audioInput', selectedAudioIn)
            }
            localStorage.setItem(AUDIO_INPUT_KEY, JSON.stringify({
                id: selectedAudioIn.getId(), type: selectedAudioIn.getType(), label: selectedAudioIn.getLabel()
            }))
        }
    }, [selectedAudioIn?.getId()])

    useEffect(() => {
        if (selectedAudioOut) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + '|Storing audioOutput', selectedAudioOut)
            }
            localStorage.setItem(AUDIO_OUTPUT_KEY, JSON.stringify({
                id: selectedAudioOut.getId(), type: selectedAudioOut.getType(), label: selectedAudioOut.getLabel()
            }))
        }
    }, [selectedAudioOut?.getId()])

    useEffect(() => {
        if (selectedVideoIn) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(HOOK_NAME + '|Storing VideoInput', selectedVideoIn)
            }
            localStorage.setItem(VIDEO_INPUT_KEY, JSON.stringify({
                id: selectedVideoIn.getId(), type: selectedVideoIn.getType(), label: selectedVideoIn.getLabel()
            }))
        }
    }, [selectedVideoIn?.getId()])

    return {
        userMediaDevices,
        selectedAudioIn, setSelectedAudioIn,
        selectedAudioOut, setSelectedAudioOut,
        selectedVideoIn, setSelectedVideoIn
    }
}