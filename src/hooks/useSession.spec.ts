import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import { RegisterInformation } from '@apirtc/apirtc'

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    return {
        __esModule: true,
        ...originalModule,
        UserAgent: jest.fn().mockImplementation((opts) => {
            return {
                register: (options: RegisterInformation) => {
                    return new Promise<any>((resolve, reject) => {
                        // act(() => {
                            if (opts.uri && opts.uri === 'apiKey:FAIL') {
                                console.log("REJECT!!")
                                reject('Fail')
                            } else {
                                resolve({
                                    getId: () => { return JSON.stringify(opts) + JSON.stringify(options) },
                                    disconnect: () => {
                                        return new Promise<void>((resolve, reject) => { resolve() })
                                    }
                                })
                            }
                        // })
                    })
                }
            }
        }),
    }
})

import useSession, { Credentials } from './useSession'

describe('useSession', () => {
    test(`Default value of session will be undefined`, () => {
        const { result } = renderHook(() => useSession())
        expect(result.current.session).toBe(undefined)
        expect(result.current.connecting).toBe(false)

        act(() => {
            result.current.disconnect()
        })

        expect(result.current.session).toBe(undefined)
    })

    test(`Unrecognized credentials`, () => {
        const { result } = renderHook(() => useSession({ foo: 'bar' } as unknown as Credentials))
        expect(result.current.session).toBe(undefined)
        expect(result.current.connecting).toBe(false)
    })

    test(`Unrecognized credentials (not an object)`, () => {
        const { result } = renderHook(() => useSession('foo' as unknown as Credentials))
        expect(result.current.session).toBe(undefined)
        expect(result.current.connecting).toBe(false)
    })

    test(`LoginPassword credentials`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession({ username: 'foo', password: 'bar' }))
        expect(result.current.connecting).toBe(true)
        await waitForNextUpdate()
        console.log('SESSION', result.current.session)
        expect(result.current.connecting).toBe(false)
        expect(result.current.session?.getId()).toBe("{\"uri\":\"apirtc:foo\"}{\"cloudUrl\":\"https://cloud.apirtc.com\",\"password\":\"bar\"}")
    })

    test(`ApiKey credentials`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession({ apiKey: 'foo' }))
        expect(result.current.connecting).toBe(true)
        await waitForNextUpdate()
        console.log('SESSION', result.current.session)
        expect(result.current.connecting).toBe(false)
        expect(result.current.session?.getId()).toBe("{\"uri\":\"apiKey:foo\"}{\"cloudUrl\":\"https://cloud.apirtc.com\"}")
    })

    test(`ApiKey credentials FAIL`, async () => {
        const { result, waitForNextUpdate } = renderHook(() => useSession({ apiKey: 'FAIL' }))
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

})