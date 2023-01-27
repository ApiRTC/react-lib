import { act, renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Session, UserAgent, UserAgentOptions } from '@apirtc/apirtc';

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
                    return {
                        audioinput: { 'idA01': { id: 'idA01' }, 'idA02': { id: 'idA02' } },
                        audiooutput: { 'idA03': { id: 'idA03' } },
                        videoinput: { 'idV01': { id: 'idV01' } }
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

        expect(result.current.userMediaDevices).toStrictEqual(
            {
                audioinput: { 'idA01': { id: 'idA01' }, 'idA02': { id: 'idA02' } },
                audiooutput: { 'idA03': { id: 'idA03' } },
                videoinput: { 'idV01': { id: 'idV01' } }
            });
    })
})