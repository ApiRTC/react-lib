import { MediaDevice, MediaDeviceList, Session, UserAgent } from '@apirtc/apirtc';
import { useEffect, useMemo, useState } from 'react';

const HOOK_NAME = "useUserMediaDevices";

const getMediaDeviceFromLocalStorage = (key: string) => {
    try {
        const value = localStorage.getItem(key);
        const obj = value ? JSON.parse(value) : null;
        return obj ? new MediaDevice(obj.id, obj.type, obj.label) : undefined;
    } catch (error) {
        console.warn(HOOK_NAME + "|getMediaDeviceFromLocalStorage", error)
        return undefined;
    }
};

const setLocalStorage = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value)
    } catch (error: any) { }
};

export function useUserMediaDevices(
    session: Session | undefined,
    storageKeyPrefix: string = "apirtc"
) {
    const AUDIO_INPUT_KEY = storageKeyPrefix + '.audioIn';
    const AUDIO_OUTPUT_KEY = storageKeyPrefix + '.audioOut';
    const VIDEO_INPUT_KEY = storageKeyPrefix + '.videoIn';

    const [selectedAudioIn, setSelectedAudioIn] = useState<MediaDevice | undefined>(getMediaDeviceFromLocalStorage(AUDIO_INPUT_KEY));
    const [selectedAudioOut, setSelectedAudioOut] = useState<MediaDevice | undefined>(getMediaDeviceFromLocalStorage(AUDIO_OUTPUT_KEY));
    const [selectedVideoIn, setSelectedVideoIn] = useState<MediaDevice | undefined>(getMediaDeviceFromLocalStorage(VIDEO_INPUT_KEY));

    const default_list = useMemo(() => {
        return {
            audioinput: selectedAudioIn ? {
                [selectedAudioIn.getId()]: selectedAudioIn
            } : {},
            audiooutput: selectedAudioOut ? {
                [selectedAudioOut.getId()]: selectedAudioOut
            } : {},
            videoinput: selectedVideoIn ? {
                [selectedVideoIn.getId()]: selectedVideoIn
            } : {}
        }
    }, [selectedAudioIn, selectedAudioOut, selectedVideoIn])

    const [userMediaDevices, setUserMediaDevices] = useState<MediaDeviceList>(default_list);

    useEffect(() => {
        if (session) {
            const userAgent: UserAgent = session.getUserAgent();

            const on_mediaDeviceChanged = () => {
                const mediaDevices: MediaDeviceList = userAgent.getUserMediaDevices();

                if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                    console.info(`${HOOK_NAME}|mediaDeviceChanged`, mediaDevices)
                }

                setUserMediaDevices(mediaDevices)

                const audioInStoredMediaDevice = getMediaDeviceFromLocalStorage(AUDIO_INPUT_KEY);
                if (audioInStoredMediaDevice) {
                    setSelectedAudioIn(mediaDevices.audioinput[audioInStoredMediaDevice.getId()])
                }

                const audioOutStoredMediaDevice = getMediaDeviceFromLocalStorage(AUDIO_OUTPUT_KEY);
                if (audioOutStoredMediaDevice) {
                    setSelectedAudioOut(mediaDevices.audiooutput[audioOutStoredMediaDevice.getId()])
                }

                const videoInStoredMediaDevice = getMediaDeviceFromLocalStorage(VIDEO_INPUT_KEY);
                if (videoInStoredMediaDevice) {
                    setSelectedVideoIn(mediaDevices.videoinput[videoInStoredMediaDevice.getId()])
                }

                if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                    console.debug(`${HOOK_NAME}|userMediaDevices, audioIn, audioOut, videoIn`, mediaDevices, audioInStoredMediaDevice?.getId(), audioOutStoredMediaDevice?.getId(), videoInStoredMediaDevice?.getId())
                }
            };
            userAgent.on('mediaDeviceChanged', on_mediaDeviceChanged)

            return () => {
                userAgent.removeListener('mediaDeviceChanged', on_mediaDeviceChanged)
                setUserMediaDevices(default_list)
            }
        }
    }, [session])

    useEffect(() => {
        if (selectedAudioIn) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(`${HOOK_NAME}|Storing audioIn`, selectedAudioIn)
            }
            setLocalStorage(AUDIO_INPUT_KEY, JSON.stringify({
                id: selectedAudioIn.getId(), type: selectedAudioIn.getType(), label: selectedAudioIn.getLabel()
            }))
        }
    }, [selectedAudioIn?.getId()])

    useEffect(() => {
        if (selectedAudioOut) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(`${HOOK_NAME}|Storing audioOut`, selectedAudioOut)
            }
            setLocalStorage(AUDIO_OUTPUT_KEY, JSON.stringify({
                id: selectedAudioOut.getId(), type: selectedAudioOut.getType(), label: selectedAudioOut.getLabel()
            }))
        }
    }, [selectedAudioOut?.getId()])

    useEffect(() => {
        if (selectedVideoIn) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(`${HOOK_NAME}|Storing videoIn`, selectedVideoIn)
            }
            setLocalStorage(VIDEO_INPUT_KEY, JSON.stringify({
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