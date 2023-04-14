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
                getId: () => { return id }
            }
        })
    }
})

import useUserMediaDevices from './useUserMediaDevices';

import { setLogLevel } from '..';

// Set log level to max to maximize code coverage
setLogLevel('debug')

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useUserMediaDevices', () => {
    test(`If session is undefined, userMediaDevices is empty`, () => {
        const { result } = renderHook(() => useUserMediaDevices(undefined));
        expect(result.current.userMediaDevices).toStrictEqual({ audioinput: {}, audiooutput: {}, videoinput: {} });
    })
    test(`on mediaDeviceChanged, userMediaDevices must update`, () => {

        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const { result } = renderHook(() => useUserMediaDevices(session));
        expect(result.current.userMediaDevices).toStrictEqual({ audioinput: {}, audiooutput: {}, videoinput: {} });

        act(() => {
            (userAgent as any).simulateMediaDeviceChanged()
        })

        // expect(result.current.userMediaDevices).toStrictEqual(
        //     {
        //         audioinput: { 'idA01': { id: 'idA01' }, 'idA02': { id: 'idA02' } },
        //         audiooutput: { 'idA03': { id: 'idA03' } },
        //         videoinput: { 'idV01': { id: 'idV01' } }
        //     });

        expect(result.current.userMediaDevices.audioinput['idA01']).toBeDefined()
        expect(result.current.userMediaDevices.audioinput['idA01'].getId()).toBe('idA01')

        expect(result.current.userMediaDevices.audioinput['idA02']).toBeDefined()
        expect(result.current.userMediaDevices.audiooutput['idA03']).toBeDefined()
        expect(result.current.userMediaDevices.videoinput['idV01']).toBeDefined()

        expect(result.current.selectedAudioIn).toBeUndefined()
        expect(result.current.selectedAudioOut).toBeUndefined()
        expect(result.current.selectedVideoIn).toBeUndefined()
    })

    test(`localStorage`, () => {

        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        localStorage.setItem('apirtc' + 'audioInputId', 'idA02')
        localStorage.setItem('apirtc' + 'audioOutputId', 'idA03')
        localStorage.setItem('apirtc' + 'videoInputId', 'idV01')

        const { result } = renderHook(() => useUserMediaDevices(session));
        expect(result.current.userMediaDevices).toStrictEqual({ audioinput: {}, audiooutput: {}, videoinput: {} });

        act(() => {
            (userAgent as any).simulateMediaDeviceChanged()
        })

        expect(result.current.selectedAudioIn).toBeDefined()
        expect(result.current.selectedAudioIn?.getId()).toBe('idA02')

        expect(result.current.selectedAudioOut).toBeDefined()
        expect(result.current.selectedAudioOut?.getId()).toBe('idA03')

        expect(result.current.selectedVideoIn).toBeDefined()
        expect(result.current.selectedVideoIn?.getId()).toBe('idV01')
    })

})