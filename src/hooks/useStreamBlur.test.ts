import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import { Stream } from '@apirtc/apirtc'

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    return {
        __esModule: true,
        ...originalModule,
        Stream: jest.fn().mockImplementation((data: MediaStream | null, opts: any) => {
            return {
                getId: () => { return 'Mock' },
                blur: () => {
                    return new Promise<any>((resolve, reject) => {
                        if (opts.fail) {
                            reject('fail')
                        } else {
                            resolve({
                                getId: () => { return 'Blurred' },
                                release: () => { }
                            })
                        }
                    })
                },
                release: () => { }
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
        expect(result.current.stream).toBe(undefined)
    })

    test(`initialBlur false`, () => {
        let initialBlur: boolean = false
        const { result } = renderHook(() => useStreamBlur(undefined, initialBlur))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.blurred).toBe(false)
    })

    test(`initialBlur true`, () => {
        let initialBlur: boolean = true
        const { result } = renderHook(() => useStreamBlur(undefined, initialBlur))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.blurred).toBe(false)
    })


    test(`With a Stream, no blur by default`, async () => {
        let initialBlur: boolean = false
        const initStream = new Stream(null, {})
        const { result, waitForNextUpdate } = renderHook(() => useStreamBlur(initStream, initialBlur))
        //await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('Mock')
        expect(result.current.blurred).toBe(false)
    })

    test(`With a Stream, blurred by default`, async () => {
        let initialBlur: boolean = true
        const initStream = new Stream(null, {})
        const { result, waitForNextUpdate } = renderHook(() => useStreamBlur(initStream, initialBlur))
        await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('Blurred')
        expect(result.current.blurred).toBe(true)
    })

    test(`With a Stream, blurred by default, blur fails`, async () => {
        let initialBlur: boolean = true
        const initStream = new Stream(null, { fail: true })
        const { result, waitForNextUpdate } = renderHook(() => useStreamBlur(initStream, initialBlur))
        await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('Mock')
        expect(result.current.blurred).toBe(false)
    })
})