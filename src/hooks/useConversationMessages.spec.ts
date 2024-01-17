import { act, renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Contact, Conversation } from '@apirtc/apirtc';

import useConversationMessages from './useConversationMessages';

import { setLogLevel } from '..';

let messageFn: Function | undefined = undefined;

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    return {
        __esModule: true,
        ...originalModule,
        Conversation: jest.fn().mockImplementation((name: string, options?: any) => {
            return {
                getName: () => { return name },
                on: (event: string, fn: Function) => {
                    if (event === 'message') {
                        messageFn = fn;
                    }
                },
                removeListener: (event: string, fn: Function) => {
                    if (event === 'message' && messageFn === fn) {
                        messageFn = undefined;
                    }
                },
                sendMessage: (content: string) => {
                    return new Promise<number>((resolve, reject) => {
                        if (content === 'fail') {
                            reject('fail')
                        } else {
                            resolve(456)
                        }
                    })
                }
            }
        }),
    }
})

// Set log level to max to maximize code coverage
setLogLevel('debug')

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useConversationMessages', () => {
    test(`If conversation is undefined, messages is empty, no listener`, () => {
        // Init
        messageFn = undefined;

        const { result } = renderHook(() => useConversationMessages(undefined));
        expect(result.current.messages).toBeDefined()
        expect(result.current.messages.length).toBe(0)
        expect(result.current.sendMessage).toBeDefined()

        expect(messageFn).toBeUndefined()

        // trying sendMessage shall not do anything
        act(() => {
            result.current.sendMessage('a sent message', new Contact('me', {}))
        })

        expect(result.current.messages.length).toBe(0)
    })

    test(`messages`, async () => {
        // Init
        messageFn = undefined;

        const conversation = new Conversation('foo', {});

        const { result, waitForNextUpdate, rerender } = renderHook((props: { conversation: Conversation }) => useConversationMessages(props.conversation), {
            initialProps: { conversation }
        });
        expect(result.current.messages).toBeDefined()
        expect(result.current.messages.length).toBe(0)
        expect(result.current.sendMessage).toBeDefined()

        expect(messageFn).toBeDefined();

        // Test message reception
        act(() => {
            messageFn?.call(this, {
                content: 'a message',
                sender: new Contact('id', {}),
                time: new Date,
                //metadata?: object
            })
        })

        expect(result.current.messages.length).toBe(1)
        expect(result.current.messages[0].content).toBe('a message')

        // Test message send
        act(() => {
            result.current.sendMessage('a sent message', new Contact('me', {})).then(() => {
                //
            }).catch((error) => {
                throw new Error('it should not reach here:' + error);
            })
        })

        await waitForNextUpdate()
        expect(result.current.messages.length).toBe(2)
        expect(result.current.messages[1].content).toBe('a sent message')

        // Test message send fail
        act(() => {
            result.current.sendMessage('fail', new Contact('me', {})).then(() => {
                throw new Error('it should not reach here');
            }).catch((error) => {
                expect(error).toBe('fail')
            })
        })

        expect(result.current.messages.length).toBe(2)
        expect(result.current.messages[1].content).toBe('a sent message')

        // Rerender with new conversation shall reinitialize array
        const l_messages = result.current.messages;
        rerender({ conversation: new Conversation('bar', {}) } as any)

        expect(result.current.messages.length).toBe(0)
        expect(result.current.messages).not.toBe(l_messages)
    })

})