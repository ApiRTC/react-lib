import { renderHook } from '@testing-library/react-hooks';

import useSession from './useSession';

describe('useSession', () => {
    test(`Default value of session will be undefined`, () => {
        const { result } = renderHook(() => useSession());

        expect(result.current.session).toBe(undefined);
    });
});