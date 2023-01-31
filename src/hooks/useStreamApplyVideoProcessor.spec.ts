import { renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Stream } from '@apirtc/apirtc';

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    return {
        __esModule: true,
        ...originalModule,
        Stream: jest.fn().mockImplementation((data: MediaStream | null, opts: any) => {
            const initial = {
                releaseCalled: false,
                videoAppliedFilter: 'none',
                getId: () => { return 'id' },
                applyVideoProcessor: (type: string) => {
                    return new Promise<any>((resolve, reject) => {
                        if (opts.fail) {
                            reject('fail')
                        } else {
                            if (type === 'none') {
                                resolve(initial);
                            } else {
                                initial.videoAppliedFilter = type;
                                resolve({
                                    releaseCalled: false,
                                    videoAppliedFilter: type,
                                    getId: () => { return 'id-' + type },
                                    release: function () { this.releaseCalled = true }
                                })
                            }


                        }
                    })
                },
                release: function () { this.releaseCalled = true }
            };
            return initial
        }),
    }
})

import useStreamApplyVideoProcessor from './useStreamApplyVideoProcessor';

import { setLogLevel } from '..';

// Set log level to max to maximize code coverage
setLogLevel('debug')

describe('useStreamApplyVideoProcessor', () => {
    test(`Default value of stream will be undefined`, () => {
        const { result } = renderHook(() => useStreamApplyVideoProcessor(undefined, 'blur'))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.applied).toBe('none')
        // act(() => {
        //     result.current.toggle()
        // })

        //await waitForNextUpdate()

        // expect(result.current.stream).toBe(undefined)
        // expect(result.current.blurred).toBe(false)
    })

    test(`undefined stream, no effect`, () => {
        const { result } = renderHook(() => useStreamApplyVideoProcessor(undefined, 'none'))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.applied).toBe('none')
    })

    test(`undefined stream, blur effect`, () => {
        const { result } = renderHook(() => useStreamApplyVideoProcessor(undefined, 'blur'))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.applied).toBe('none')
    })

    test(`With a Stream, no effect`, () => {
        const initStream = new Stream(null, {})
        const { result } = renderHook(() => useStreamApplyVideoProcessor(initStream, 'none'))
        expect(result.current.stream?.getId()).toBe('id')
        expect(result.current.applied).toBe('none')

        expect((result.current.stream as any).releaseCalled).toBe(false)
    })

    test(`With a Stream, to be blurred`, async () => {
        const initStream = new Stream(null, {})
        const { result, waitForNextUpdate, rerender } = renderHook(
            (type: 'none' | 'blur') => useStreamApplyVideoProcessor(initStream, type),
            { initialProps: 'blur' });
        await waitForNextUpdate()

        expect(result.current.stream).toBeDefined()
        expect(result.current.stream).not.toBe(initStream)

        const blurredStream = result.current.stream
        expect(blurredStream?.getId()).toBe('id-blur')
        expect((blurredStream as any).releaseCalled).toBe(false)
        expect(result.current.applied).toBe('blur')

        // Reset to no effect
        rerender('none')

        await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('id')
        expect(result.current.applied).toBe('none')
        // the blurred stream shall be released
        expect((blurredStream as any).releaseCalled).toBe(false)
        // the out stream shall now be the initial stream
        expect(result.current.stream).toBe(initStream)
    })

    test(`With a Stream, to be blurred, blur fails`, () => {
        const initStream = new Stream(null, { fail: true })
        const { result, waitForNextUpdate } = renderHook(() => useStreamApplyVideoProcessor(initStream, 'blur'))
        // the values don't change, so no need to wait for next update
        //await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('id')
        expect(result.current.applied).toBe('none')
    })

    test(`With a Stream, to be blurred, blur fails, with callback`, (done: any) => {
        // As this is same test as above, try with different logs level config to complete code coverage
        setLogLevel('error')
        const initStream = new Stream(null, { fail: true })
        const { result, waitForNextUpdate } = renderHook(() => useStreamApplyVideoProcessor(initStream, 'blur', undefined, (error) => {
            console.log("ERROR", error)
            try {
                expect(error).toBe('fail')
                done()
            } catch (err) {
                done(err);
            }
        }))
        // the values don't change, so no need to wait for next update
        //await waitForNextUpdate()
        expect(result.current.stream?.getId()).toBe('id')
        expect(result.current.applied).toBe('none')
    })
})