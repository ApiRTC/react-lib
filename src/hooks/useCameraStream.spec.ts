import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import { Session, Stream, UserAgent, CreateStreamOptions, UserAgentOptions } from '@apirtc/apirtc'

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
                        if (options.uri && options.uri === 'fail') {
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

import useCameraStream from './useCameraStream'

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
        await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('{\"uri\":\"foo\"}{\"facingMode\":\"user\"}')
    })

    test(`With a Session, fail to create stream`, () => {
        const init_userAgent = new UserAgent({ uri: "fail" })
        const init_session = new Session(init_userAgent)
        const { result } = renderHook(() => useCameraStream(init_session))
        expect(result.current.stream?.getId()).toBe(undefined)
    })

})