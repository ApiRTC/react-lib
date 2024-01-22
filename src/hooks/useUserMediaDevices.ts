import { MediaDevice, MediaDeviceList, Session, UserAgent } from '@apirtc/apirtc';

import { useEffect, useMemo, useState } from 'react';

const HOOK_NAME = "useUserMediaDevices";

const getMediaDeviceFromLocalStorage = (key: string) => {
    try {
        const value = localStorage.getItem(key);
        const obj = value ? JSON.parse(value) : null;
        return obj ? new MediaDevice(obj.id, obj.type, obj.label) : undefined;
    } catch (error) {
        console.warn(`${HOOK_NAME}|getMediaDeviceFromLocalStorage`, error)
        return undefined;
    }
};

const setLocalStorage = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value)
    } catch (error: any) { }
};

/**
 * useUserMediaDevices hook
 * @param session - a valid ApiRTC Session
 * @param storageKeyPrefix - do not set or set to undefined to NOT use local storage to get nor store devices ids.
 * @returns userMediaDevices,
 *  selectedAudioIn, selectedAudioInId, setSelectedAudioIn,
 *  selectedAudioOut, selectedAudioInId, setSelectedAudioOut,
 *  selectedVideoIn, selectedVideoInId, setSelectedVideoIn
 */
export default function useUserMediaDevices(
    session: Session | undefined,
    storageKeyPrefix?: string
) {
    const AUDIO_INPUT_KEY = useMemo(() => storageKeyPrefix ? `${storageKeyPrefix}.audioIn` : undefined, [storageKeyPrefix]);
    const AUDIO_OUTPUT_KEY = useMemo(() => storageKeyPrefix ? `${storageKeyPrefix}.audioOut` : undefined, [storageKeyPrefix]);
    const VIDEO_INPUT_KEY = useMemo(() => storageKeyPrefix ? `${storageKeyPrefix}.videoIn` : undefined, [storageKeyPrefix]);

    const [selectedAudioIn, setSelectedAudioIn] = useState<MediaDevice | undefined>(AUDIO_INPUT_KEY ? getMediaDeviceFromLocalStorage(AUDIO_INPUT_KEY) : undefined);
    const [selectedAudioOut, setSelectedAudioOut] = useState<MediaDevice | undefined>(AUDIO_OUTPUT_KEY ? getMediaDeviceFromLocalStorage(AUDIO_OUTPUT_KEY) : undefined);
    const [selectedVideoIn, setSelectedVideoIn] = useState<MediaDevice | undefined>(VIDEO_INPUT_KEY ? getMediaDeviceFromLocalStorage(VIDEO_INPUT_KEY) : undefined);

    const [userMediaDevices, setUserMediaDevices] = useState<MediaDeviceList>({
        audioinput: selectedAudioIn ? {
            [selectedAudioIn.getId()]: selectedAudioIn
        } : {},
        audiooutput: selectedAudioOut ? {
            [selectedAudioOut.getId()]: selectedAudioOut
        } : {},
        videoinput: selectedVideoIn ? {
            [selectedVideoIn.getId()]: selectedVideoIn
        } : {}
    });

    useEffect(() => {
        if (session) {
            const userAgent: UserAgent = session.getUserAgent();

            const on_mediaDeviceChanged = () => {
                const mediaDevices: MediaDeviceList = userAgent.getUserMediaDevices();

                if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                    console.debug(`${HOOK_NAME}|mediaDeviceChanged`, mediaDevices)
                }

                setUserMediaDevices(mediaDevices)
                setSelectedAudioIn((prev) => prev ? mediaDevices.audioinput[prev.getId()] : undefined)
                setSelectedAudioOut((prev) => prev ? mediaDevices.audiooutput[prev.getId()] : undefined)
                setSelectedVideoIn((prev) => prev ? mediaDevices.videoinput[prev.getId()] : undefined)
            };
            userAgent.on('mediaDeviceChanged', on_mediaDeviceChanged)

            return () => {
                userAgent.removeListener('mediaDeviceChanged', on_mediaDeviceChanged)
            }
        }
    }, [session])

    useEffect(() => {
        if (selectedAudioIn && AUDIO_INPUT_KEY) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(`${HOOK_NAME}|Storing audioIn`, selectedAudioIn)
            }
            setLocalStorage(AUDIO_INPUT_KEY, JSON.stringify({
                id: selectedAudioIn.getId(), type: selectedAudioIn.getType(), label: selectedAudioIn.getLabel()
            }))
        }
    }, [AUDIO_INPUT_KEY, selectedAudioIn])

    useEffect(() => {
        if (selectedAudioOut && AUDIO_OUTPUT_KEY) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(`${HOOK_NAME}|Storing audioOut`, selectedAudioOut)
            }
            setLocalStorage(AUDIO_OUTPUT_KEY, JSON.stringify({
                id: selectedAudioOut.getId(), type: selectedAudioOut.getType(), label: selectedAudioOut.getLabel()
            }))
        }
    }, [AUDIO_OUTPUT_KEY, selectedAudioOut])

    useEffect(() => {
        if (selectedVideoIn && VIDEO_INPUT_KEY) {
            if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                console.debug(`${HOOK_NAME}|Storing videoIn`, selectedVideoIn)
            }
            setLocalStorage(VIDEO_INPUT_KEY, JSON.stringify({
                id: selectedVideoIn.getId(), type: selectedVideoIn.getType(), label: selectedVideoIn.getLabel()
            }))
        }
    }, [VIDEO_INPUT_KEY, selectedVideoIn])

    return {
        userMediaDevices,
        selectedAudioIn, selectedAudioInId: selectedAudioIn?.getId(), setSelectedAudioIn,
        selectedAudioOut, selectedAudioOutId: selectedAudioOut?.getId(), setSelectedAudioOut,
        selectedVideoIn, selectedVideoInId: selectedVideoIn?.getId(), setSelectedVideoIn
    }
}