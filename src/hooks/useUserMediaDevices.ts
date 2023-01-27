import { MediaDeviceList, Session, UserAgent } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

const EMPTY_LIST: MediaDeviceList = { audioinput: {}, audiooutput: {}, videoinput: {} }

const HOOK_NAME = "useUserMediaDevices";
export default function useUserMediaDevices(
    session: Session | undefined
) {
    const [userMediaDevices, setUserMediaDevices] = useState<MediaDeviceList>(EMPTY_LIST);

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
            userAgent.on("mediaDeviceChanged", on_mediaDeviceChanged)

            return () => {
                userAgent.removeListener('mediaDeviceChanged', on_mediaDeviceChanged)
                setUserMediaDevices(EMPTY_LIST)
            }
        }
    }, [session])

    return {
        userMediaDevices
    }
}