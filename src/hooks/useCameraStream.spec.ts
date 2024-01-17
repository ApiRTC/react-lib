import { renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { CreateStreamOptions, Session, UserAgent, UserAgentOptions } from '@apirtc/apirtc';

import { useCameraStream } from './useCameraStream';

import { setLogLevel } from '..';

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    return {
        __esModule: true,
        ...originalModule,
        UserAgent: jest.fn().mockImplementation((options: UserAgentOptions) => {
            return {
                createStream: (createStreamOptions: CreateStreamOptions) => {
                    return new Promise<any>((resolve, reject) => {
                        if (options && options.uri && options.uri === 'fail') {
                            reject('fail')
                        } else {
                            resolve({
                                getId: () => { return JSON.stringify(options) + JSON.stringify(createStreamOptions) },
                                release: () => { }
                            })
                        }
                    })
                }
            }
        }),
        Session: jest.fn().mockImplementation((userAgent: UserAgent) => {
            return {
                getUserAgent: () => {
                    return userAgent;
                }
            }
        }),
    }
})

// Set log level to max to maximize code coverage
setLogLevel('debug')

describe('useCameraStream', () => {
    test(`Default value of stream will be undefined`, () => {
        const { result } = renderHook(() => useCameraStream(undefined))
        expect(result.current.stream).toBe(undefined)
    })

    test(`With a Session`, async () => {
        const init_userAgent = new UserAgent({ uri: "foo" })
        const init_session = new Session(init_userAgent)
        const init_options: CreateStreamOptions = { facingMode: 'user' }
        const { result, waitForNextUpdate } = renderHook(() => useCameraStream(init_session, init_options))
        expect(result.current.grabbing).toBeTruthy()
        await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('{\"uri\":\"foo\"}{\"facingMode\":\"user\"}')
        expect(result.current.grabbing).toBeFalsy()
    })

    test(`With a Session, fail to create stream`, async () => {
        const init_userAgent = new UserAgent({ uri: "fail" });
        const init_session = new Session(init_userAgent);
        const errorCb = (error: any) => {
            expect(error).toBe('fail')
        };
        const { result, waitForNextUpdate } = renderHook(() => useCameraStream(init_session, undefined, errorCb))
        expect(result.current.stream?.getId()).toBe(undefined)
        expect(result.current.grabbing).toBeTruthy()
        await waitForNextUpdate()
        expect(result.current.grabbing).toBeFalsy()
    })
})