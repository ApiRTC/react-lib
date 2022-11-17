import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import { RegisterInformation, UserAgentOptions } from '@apirtc/apirtc'

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    // Set log level to max to maximize code coverage
    globalThis.apirtcReactLibLogLevel = { isDebugEnabled: true, isInfoEnabled: true, isWarnEnabled: true }

    return {
        __esModule: true,
        ...originalModule,
        UserAgent: jest.fn().mockImplementation((options: UserAgentOptions) => {
            return {
                register: (registerInfo: RegisterInformation) => {
                    return new Promise<any>((resolve, reject) => {
                        if (options.uri && options.uri === 'apiKey:fail') {
                            reject('fail')
                        } else {
                            resolve({
                                getId: () => { return JSON.stringify(options) + JSON.stringify(registerInfo) },
                                disconnect: () => {
                                    return new Promise<void>((resolve, reject) => {
                                        if (options.uri && options.uri === 'apiKey:disconnect-fail') {
                                            reject('disconnect-fail')
                                        } else {
                                            resolve()
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            }
        }),
    }
})

import useSession, { Credentials } from './useSession'

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useSession', () => {
    test(`Default value of session will be undefined`, () => {
        const { result } = renderHook(() => useSession())
        expect(result.current.session).toBe(undefined)
        expect(result.current.connecting).toBe(false)

        act(() => {
            result.current.disconnect()
        })

        expect(result.current.session).toBe(undefined)
        expect(result.current.error).toBe(undefined)
    })

    test(`Unrecognized credentials`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession({ foo: 'bar' } as unknown as Credentials))
        expect(result.current.session).toBe(undefined)
        expect(result.current.connecting).toBe(false)
        expect(result.current.error).toBe(undefined)

        await waitForNextUpdate()
        expect(result.current.session).toBe(undefined)
        expect(result.current.connecting).toBe(false)
        expect(result.current.error).toBe("credentials not recognized")
    })

    test(`Unrecognized credentials (not an object)`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession('foo' as unknown as Credentials))
        expect(result.current.session).toBe(undefined)
        expect(result.current.connecting).toBe(false)
        expect(result.current.error).toBe(undefined)

        await waitForNextUpdate()
        expect(result.current.session).toBe(undefined)
        expect(result.current.connecting).toBe(false)
        expect(result.current.error).toBe("credentials not recognized")
    })

    test(`LoginPassword credentials`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession({ username: 'foo', password: 'bar' }, { cloudUrl: "https://my.cloud.address" }))
        expect(result.current.connecting).toBe(true)
        await waitForNextUpdate()
        console.log('SESSION', result.current.session)
        expect(result.current.connecting).toBe(false)
        expect(result.current.session?.getId()).toBe("{\"uri\":\"apirtc:foo\"}{\"cloudUrl\":\"https://my.cloud.address\",\"password\":\"bar\"}")
    })

    test(`ApiKey credentials`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession({ apiKey: 'foo' }))
        expect(result.current.connecting).toBe(true)
        await waitForNextUpdate()
        console.log('SESSION', result.current.session)
        expect(result.current.connecting).toBe(false)
        expect(result.current.session?.getId()).toBe("{\"uri\":\"apiKey:foo\"}{\"cloudUrl\":\"https://cloud.apirtc.com\"}")
    })

    test(`ApiKey credentials fail`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession({ apiKey: 'fail' }))
        expect(result.current.connecting).toBe(true)
        await waitForNextUpdate()
        console.log('connecting', result.current.connecting)
        expect(result.current.connecting).toBe(false)
        expect(result.current.session?.getId()).toBe(undefined)
    })

    test(`token credentials`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession({ token: 'foo' }))
        await waitForNextUpdate()
        console.log('SESSION', result.current.session)
        expect(result.current.session?.getId()).toBe("{\"uri\":\"token:foo\"}{\"cloudUrl\":\"https://cloud.apirtc.com\"}")
    })

    test(`ApiKey credentials disconnect-fail`, async () => {
        const { result, waitForNextUpdate, rerender } = renderHook(() => useSession({ apiKey: 'disconnect-fail' }))
        expect(result.current.connecting).toBe(true)
        await waitForNextUpdate()
        console.log('SESSION', result.current.session)
        expect(result.current.connecting).toBe(false)
        expect(result.current.session?.getId()).toBe("{\"uri\":\"apiKey:disconnect-fail\"}{\"cloudUrl\":\"https://cloud.apirtc.com\"}")

        // trigger disconnect by setting credentials to undefined
        rerender({ credentials: undefined });

        //await waitForNextUpdate()

        expect(result.current.session?.getId()).toBe("{\"uri\":\"apiKey:disconnect-fail\"}{\"cloudUrl\":\"https://cloud.apirtc.com\"}")
    })

})