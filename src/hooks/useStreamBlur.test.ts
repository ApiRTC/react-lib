import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import { Stream } from '@apirtc/apirtc'

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    // Set log level to max to maximize code coverage
    globalThis.apirtcReactLibLogLevel = { isDebugEnabled: true, isInfoEnabled: true, isWarnEnabled: true }

    return {
        __esModule: true,
        ...originalModule,
        Stream: jest.fn().mockImplementation((data: MediaStream | null, opts: any) => {
            return {
                releaseCalled: false,
                getId: () => { return 'Mock' },
                blur: () => {
                    return new Promise<any>((resolve, reject) => {
                        if (opts.fail) {
                            reject('fail')
                        } else {
                            resolve({
                                releaseCalled: false,
                                getId: () => { return 'Blurred' },
                                release: function () { this.releaseCalled = true }
                            })
                        }
                    })
                },
                release: function () { this.releaseCalled = true }
            }
        }),
    }
})

import useStreamBlur from './useStreamBlur'

describe('useStreamBlur', () => {
    test(`Default value of stream will be undefined`, () => {
        const { result } = renderHook(() => useStreamBlur(undefined))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.blurred).toBe(false)
        act(() => {
            result.current.toggle()
        })

        //await waitForNextUpdate()

        expect(result.current.stream).toBe(undefined)
        expect(result.current.blurred).toBe(false)
    })

    test(`undefined stream, initialBlur false`, () => {
        let initialBlur: boolean = false
        const { result } = renderHook(() => useStreamBlur(undefined, initialBlur))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.blurred).toBe(false)
    })

    test(`undefined stream, initialBlur true`, () => {
        let initialBlur: boolean = true
        const { result } = renderHook(() => useStreamBlur(undefined, initialBlur))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.blurred).toBe(false)
    })

    test(`With a Stream, not to be blurred`, () => {
        let initialBlur: boolean = false
        const initStream = new Stream(null, {})
        const { result } = renderHook(() => useStreamBlur(initStream, initialBlur))
        expect(result.current.stream?.getId()).toBe('Mock')
        expect(result.current.blurred).toBe(false)

        expect((result.current.stream as any).releaseCalled).toBe(false)
    })

    test(`With a Stream, to be blurred`, async () => {
        let initialBlur: boolean = true
        const initStream = new Stream(null, {})
        const { result, waitForNextUpdate } = renderHook(() => useStreamBlur(initStream, initialBlur))
        await waitForNextUpdate()

        expect(result.current.stream).toBeDefined()
        expect(result.current.stream).not.toBe(initStream)

        const blurredStream = result.current.stream
        expect(blurredStream?.getId()).toBe('Blurred')
        expect((blurredStream as any).releaseCalled).toBe(false)
        expect(result.current.blurred).toBe(true)

        // toggle (unblur)
        act(() => {
            result.current.toggle()
        })

        // the blurred stream shall be released
        expect((blurredStream as any).releaseCalled).toBe(true)
        // the out stream shall now be the initial stream
        expect(result.current.stream).toBe(initStream)
    })

    test(`With a Stream, to be blurred, blur fails`, async () => {
        let initialBlur: boolean = true
        const initStream = new Stream(null, { fail: true })
        const { result, waitForNextUpdate } = renderHook(() => useStreamBlur(initStream, initialBlur))
        await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('Mock')
        expect(result.current.blurred).toBe(false)
    })
})