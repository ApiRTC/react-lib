import { renderHook } from '@testing-library/react-hooks';

import useToggleBlurStream from './useToggleBlurStream';

describe('useToggleBlurStream', () => {
    test(`Default value of stream will be undefined`, () => {
        const { result } = renderHook(() => useToggleBlurStream(undefined));

        expect(result.current.stream).toBe(undefined);
    });
});