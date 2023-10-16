import { act, renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Session, UserAgent, UserAgentOptions, MediaDevice } from '@apirtc/apirtc';

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    let mediaDeviceChangedFn: Function;

    return {
        __esModule: true,
        ...originalModule,
        UserAgent: jest.fn().mockImplementation((options: UserAgentOptions) => {
            return {
                on: (event: string, fn: Function) => {
                    if (event === 'mediaDeviceChanged') {
                        mediaDeviceChangedFn = fn;
                    }
                },
                removeListener: (event: string, fn: Function) => { },
                getUserMediaDevices: () => {
                    const audio01 = new MediaDevice('idA01', 'audio', 'label');
                    const audio02 = new MediaDevice('idA02', 'audio', 'label');
                    const audio03 = new MediaDevice('idA03', 'audio', 'label');
                    const video01 = new MediaDevice('idV01', 'video', 'label');
                    return {
                        audioinput: { 'idA01': audio01, 'idA02': audio02 },
                        audiooutput: { 'idA03': audio03 },
                        videoinput: { 'idV01': video01 }
                    }
                },
                simulateMediaDeviceChanged: () => {
                    mediaDeviceChangedFn()
                },
            }
        }),
        Session: jest.fn().mockImplementation((ua: UserAgent, options: any) => {
            return {
                getUserAgent: () => { return ua }
            }
        }),
        MediaDevice: jest.fn().mockImplementation((id: string, type: string, label: string) => {
            return {
                getId: () => { return id },
                getType: () => { return type },
                getLabel: () => { return label }
            }
        })
    }
})

import { useUserMediaDevices } from './useUserMediaDevices';

import { setLogLevel } from '..';

// Set log level to max to maximize code coverage
setLogLevel('debug')

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useUserMediaDevices', () => {
    test(`If session is undefined, userMediaDevices is undefined`, () => {
        const { result } = renderHook(() => useUserMediaDevices(undefined));
        expect(result.current.userMediaDevices).toStrictEqual({ audioinput: {}, audiooutput: {}, videoinput: {} });
        //expect(result.current.userMediaDevices).toBeUndefined()
    })

    test(`on mediaDeviceChanged, userMediaDevices must update`, () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const { result } = renderHook(() => useUserMediaDevices(session));
        expect(result.current.userMediaDevices).toStrictEqual({ audioinput: {}, audiooutput: {}, videoinput: {} });

        act(() => {
            (userAgent as any).simulateMediaDeviceChanged()
        })

        expect(result.current.userMediaDevices?.audioinput['idA01']).toBeDefined()
        expect(result.current.userMediaDevices?.audioinput['idA01'].getId()).toBe('idA01')

        expect(result.current.userMediaDevices?.audioinput['idA02']).toBeDefined()
        expect(result.current.userMediaDevices?.audiooutput['idA03']).toBeDefined()
        expect(result.current.userMediaDevices?.videoinput['idV01']).toBeDefined()

        expect(result.current.selectedAudioIn).toBeUndefined()
        expect(result.current.selectedAudioOut).toBeUndefined()
        expect(result.current.selectedVideoIn).toBeUndefined()
    })

    // for code coverage sake !
    test(`on mediaDeviceChanged, userMediaDevices must update, begin with empty local-storage values`, () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const localStoragePrefix = 'apirtc';

        const { result } = renderHook(() => useUserMediaDevices(session, localStoragePrefix));
        expect(result.current.userMediaDevices).toStrictEqual({ audioinput: {}, audiooutput: {}, videoinput: {} });

        act(() => {
            (userAgent as any).simulateMediaDeviceChanged()
        })

        expect(result.current.userMediaDevices?.audioinput['idA01']).toBeDefined()
        expect(result.current.userMediaDevices?.audioinput['idA01'].getId()).toBe('idA01')

        expect(result.current.userMediaDevices?.audioinput['idA02']).toBeDefined()
        expect(result.current.userMediaDevices?.audiooutput['idA03']).toBeDefined()
        expect(result.current.userMediaDevices?.videoinput['idV01']).toBeDefined()

        expect(result.current.selectedAudioIn).toBeUndefined()
        expect(result.current.selectedAudioOut).toBeUndefined()
        expect(result.current.selectedVideoIn).toBeUndefined()
    })

    test(`with no local storage`, () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const toString = (mediaDevice: MediaDevice) => {
            return JSON.stringify({ id: mediaDevice.getId(), type: mediaDevice.getType(), label: mediaDevice.getLabel() })
        }

        const idA01 = new MediaDevice('idA01', 'audioinput', 'mic1');
        const idV01 = new MediaDevice('idV01', 'videoinput', 'cam1');
        // localStorage.setItem(localStoragePrefix + '.audioIn', toString(idA01))
        // localStorage.setItem(localStoragePrefix + '.videoIn', toString(idV01))

        const { result } = renderHook(() => useUserMediaDevices(session, undefined));
        expect(result.current.userMediaDevices.audioinput).toStrictEqual({})
        expect(result.current.userMediaDevices.audiooutput).toStrictEqual({})
        expect(result.current.userMediaDevices.videoinput).toStrictEqual({})

        // selected must NOT be filled
        //
        expect(result.current.selectedAudioIn).toBeUndefined()
        expect(result.current.selectedAudioOut).toBeUndefined()
        expect(result.current.selectedVideoIn).toBeUndefined()

        act(() => {
            (userAgent as any).simulateMediaDeviceChanged()
        })

        // selected must NOT be filled even after device changed
        //
        expect(result.current.selectedAudioIn).toBeUndefined()
        expect(result.current.selectedAudioOut).toBeUndefined()
        expect(result.current.selectedVideoIn).toBeUndefined()
    })

    test(`with local storage`, () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const toString = (mediaDevice: MediaDevice) => {
            return JSON.stringify({ id: mediaDevice.getId(), type: mediaDevice.getType(), label: mediaDevice.getLabel() })
        }

        const localStoragePrefix = 'apirtc';

        const idA02 = new MediaDevice('idA02', 'audioinput', 'mic1');
        const notExisting = new MediaDevice('id-not-existing', 'audioinput', 'mic-not-existing');
        const idV01 = new MediaDevice('idV01', 'videoinput', 'cam1');
        localStorage.setItem(localStoragePrefix + '.audioIn', toString(idA02))
        localStorage.setItem(localStoragePrefix + '.audioOut', toString(notExisting))
        localStorage.setItem(localStoragePrefix + '.videoIn', toString(idV01))

        const { result } = renderHook(() => useUserMediaDevices(session, localStoragePrefix));
        expect(result.current.userMediaDevices.audioinput['idA02']).toBeDefined()
        expect(result.current.userMediaDevices.audioinput['idA02'].getLabel()).toBe('mic1')
        expect(result.current.userMediaDevices.audiooutput['id-not-existing']).toBeDefined()
        expect(result.current.userMediaDevices.videoinput['idV01']).toBeDefined()

        // selected must be filled even before deviceChanged happened, with info stored in local-storage
        //
        expect(result.current.selectedAudioIn).toBeDefined()
        expect(result.current.selectedAudioIn?.getId()).toBe('idA02')

        expect(result.current.selectedAudioOut).toBeDefined()
        expect(result.current.selectedAudioOut?.getId()).toBe('id-not-existing')

        expect(result.current.selectedVideoIn).toBeDefined()
        expect(result.current.selectedVideoIn?.getId()).toBe('idV01')

        act(() => {
            (userAgent as any).simulateMediaDeviceChanged()
        })

        // device changed must update according to what is available
        expect(result.current.selectedAudioIn).toBeDefined()
        expect(result.current.selectedAudioIn?.getId()).toBe('idA02')

        // in case the local storage does not exist in new list, undefined shall be set
        expect(result.current.selectedAudioOut).toBeUndefined()

        expect(result.current.selectedVideoIn).toBeDefined()
        expect(result.current.selectedVideoIn?.getId()).toBe('idV01')

        // use setSelected*
        act(() => {
            result.current.setSelectedAudioIn(result.current.userMediaDevices.audioinput['idA01'])
            result.current.setSelectedAudioOut(new MediaDevice('test-a1', 'type', 'label'))
            result.current.setSelectedVideoIn(new MediaDevice('test-v1', 'type', 'label'))
        })

        {
            const value = localStorage.getItem(localStoragePrefix + '.audioIn');
            if (value) {
                const obj = JSON.parse(value);
                expect(obj['id']).toBe('idA01')
            }
        }

        {
            const value = localStorage.getItem(localStoragePrefix + '.audioOut');
            if (value) {
                const obj = JSON.parse(value);
                expect(obj['id']).toBe('test-a1')
            }
        }

        {
            const value = localStorage.getItem(localStoragePrefix + '.videoIn');
            if (value) {
                const obj = JSON.parse(value);
                expect(obj['id']).toBe('test-v1')
            }
        }

        //, JSON.stringify({ id: 'idA02', type: 'audioinput', label: 'mic1' }))
    })

    test(`localStorage invalid json`, () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const localStoragePrefix = 'apirtc';

        localStorage.setItem(localStoragePrefix + '.audioIn', '{invalid-JSON')
        localStorage.setItem(localStoragePrefix + '.audioOut', JSON.stringify({ id: "ID", type: "TYPE", label: "LABEL" }))
        localStorage.setItem(localStoragePrefix + '.videoIn', JSON.stringify({ id: "ID", type: "TYPE", label: "LABEL" }))

        const { result } = renderHook(() => useUserMediaDevices(session, localStoragePrefix));
        expect(result.current.userMediaDevices.audioinput).toStrictEqual({})
        expect(result.current.userMediaDevices.audiooutput['ID'].getLabel()).toBe('LABEL')
        expect(result.current.userMediaDevices.videoinput['ID'].getType()).toBe('TYPE')
    })
})