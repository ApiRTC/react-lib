
import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'
import { Stream } from '@apirtc/apirtc'

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
        let initialBlur:boolean = false
        const { result } = renderHook(() => useStreamBlur(undefined, initialBlur))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.blurred).toBe(false)
    })

    test(`initialBlur true`, () => {
        let initialBlur:boolean = true
        const { result } = renderHook(() => useStreamBlur(undefined, initialBlur))
        expect(result.current.stream).toBe(undefined)
        expect(result.current.blurred).toBe(false)
    })

    // test(`With a Stream`, () => {
    //     let initialBlur:boolean = true
    //     const { result } = renderHook(() => useStreamBlur(new Stream(null,{}), initialBlur))
    //     expect(result.current.stream).toBe(undefined)
    //     expect(result.current.blurred).toBe(false)
    // })
})