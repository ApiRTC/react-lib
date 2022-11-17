import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import { UserAgent, Session, Conversation, UserAgentOptions } from '@apirtc/apirtc'

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
            return {}
        }),
        Session: jest.fn().mockImplementation((ua: UserAgent, options: any) => {
            return {
                getUserAgent: () => { return ua },
                getOrCreateConversation: (name: string, options: any) => {
                    return new Conversation(name, options)
                }
            }
        }),
        Conversation: jest.fn().mockImplementation((name: string, options: any) => {
            return {
                getName: () => { return name },
                isJoined: () => { return false },
                join: () => { },
                leave: () => { },
                destroy: () => { }
            }
        }),
    }
})

import useConversation from './useConversation'

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useConversation', () => {
    test(`If session is undefined, conversation is undefined`, () => {
        const { result } = renderHook(() => useConversation(undefined, 'foo'));
        expect(result.current.conversation).toBeUndefined();
    })
    test(`With session, empty groups array`, () => {

        const userAgent = new UserAgent({});
        const session = new Session(userAgent);

        const { result } = renderHook(() => useConversation(session, 'foo'));
        expect(result.current.conversation?.getName()).toEqual('foo');
    })
})