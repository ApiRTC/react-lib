import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import useSession, { Credentials } from './useSession'

describe('useSession', () => {
    test(`Default value of session will be undefined`, () => {
        const { result } = renderHook(() => useSession())
        expect(result.current.session).toBe(undefined)

        act(() => {
            result.current.disconnect()
        })

        expect(result.current.session).toBe(undefined)
    })

    test(`Unrecognized credentials`, () => {
        const { result } = renderHook(() => useSession({ foo: 'bar' } as unknown as Credentials))
        expect(result.current.session).toBe(undefined)
    })

    test(`LoginPassword credentials`, () => {
        const { result } = renderHook(() => useSession({ username: 'foo', password: 'bar' }))
        expect(result.current.session).toBe(undefined)
    })

    test(`ApiKey credentials`, () => {
        const { result } = renderHook(() => useSession({ apiKey: 'foo' }))
        expect(result.current.session).toBe(undefined)
    })

    test(`token credentials`, () => {
        const { result } = renderHook(() => useSession({ token: 'foo' }))
        expect(result.current.session).toBe(undefined)
    })
})