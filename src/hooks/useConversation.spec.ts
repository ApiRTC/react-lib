import { act, renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Conversation, Session, UserAgent, UserAgentOptions } from '@apirtc/apirtc';

let simulateStatusJoined = false;
let simulateDestroyed = false;

let simulateJoinFail = false;
let simulateLeaveFail = false;

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    return {
        __esModule: true,
        ...originalModule,
        //session: { apiCCWebRTCClient: { webRTCClient: { MCUClient: { sessionMCUs: [] } } } },
        UserAgent: jest.fn().mockImplementation((options: UserAgentOptions) => {
            return {}
        }),
        Session: jest.fn().mockImplementation((ua: UserAgent, options: any) => {
            return {
                getUserAgent: () => { return ua },
                getOrCreateConversation: (name: string, options: any) => {
                    return new Conversation(name, options)
                },
                //
            }
        }),
        Conversation: jest.fn().mockImplementation((name: string, options?: any) => {
            return {
                getName: () => { return name },
                isJoined: () => { return simulateStatusJoined },
                join: () => {
                    const self = this;
                    return new Promise<void>((resolve, reject) => {
                        if (simulateJoinFail) {
                            reject('fail')
                        } else {
                            simulateStatusJoined = true;
                            resolve()
                        }
                    })
                },
                leave: () => {
                    return new Promise<void>((resolve, reject) => {
                        if (simulateLeaveFail) {
                            reject('fail')
                        } else {
                            resolve()
                            simulateStatusJoined = false;
                        }
                    })
                },
                destroy: () => {
                    simulateDestroyed = true;
                }
            }
        }),
    }
})

import useConversation from './useConversation';

import { setLogLevel } from '..';

// Set log level to max to maximize code coverage
setLogLevel('debug')

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useConversation', () => {
    test(`If session is undefined, conversation is undefined`, () => {
        const { result } = renderHook(() => useConversation(undefined, 'foo'));
        expect(result.current.conversation).toBeUndefined();
    })

    test(`If name is undefined, conversation is undefined`, () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent);
        const { result } = renderHook(() => useConversation(session, undefined));
        expect(result.current.conversation).toBeUndefined();

        result.current.join()?.then(() => {
            fail('it should not reach here');
        }).catch((error) => {
            expect(error).toEqual("useConversation|join|conversation not defined")
            expect(result.current.joined).toEqual(false)
        })

        result.current.leave()?.then(() => {
            fail('it should not reach here');
        }).catch((error) => {
            expect(error).toEqual("useConversation|leave|conversation not defined")
            expect(result.current.joined).toEqual(false)
        })

    })

    test(`Test join/leave functions`, async () => {

        simulateStatusJoined = false;

        const userAgent = new UserAgent({});
        const session = new Session(userAgent);

        const { result, waitForNextUpdate } = renderHook(() => useConversation(session, 'foo', undefined, false));
        expect(result.current.conversation?.getName()).toEqual('foo')
        expect(result.current.joining).toEqual(false)
        expect(result.current.joined).toEqual(false)
        expect(result.current.join).toBeDefined()
        expect(result.current.leave).toBeDefined()

        // Simulate join failure
        //
        simulateJoinFail = true;

        act(() => { // act required for the setJoining(true)
            result.current.join()?.then(() => {
                throw new Error('it should not reach here');
            }).catch((error) => {
                expect(error).toBe('fail')
            })
        })

        expect(result.current.joining).toEqual(true)

        await waitForNextUpdate()
        expect(result.current.joining).toEqual(false)
        expect(result.current.joined).toEqual(false)

        // Simulate join success
        //
        simulateJoinFail = false;

        act(() => { // act required for the setJoining(true)
            result.current.join()?.then(() => {
            }).catch((error) => {
                throw new Error('it should not reach here:' + error);
            })
        })

        await waitForNextUpdate()
        expect(result.current.joined).toEqual(true)
        expect(simulateStatusJoined).toBeTruthy()

        // Try to join while already joined
        result.current.join()?.then(() => {
            throw new Error('it should not reach here');
        }).catch((error) => {
            expect(error).toBe('useConversation|join|conversation already joined')
        })

        // Simulate leave failure
        //
        simulateLeaveFail = true;

        result.current.leave()?.then(() => {
            throw new Error('it should not reach here');
        }).catch((error) => {
            expect(error).toBe('fail')
        })

        // Simulate leave success
        //
        simulateLeaveFail = false;

        result.current.leave()?.then(() => {
        }).catch((error) => {
            console.error(error);
            //fail('it should not reach here');
            throw new Error(error);
        })

        await waitForNextUpdate()
        expect(result.current.joined).toEqual(false)
        expect(simulateStatusJoined).toBeFalsy()

        // Try to leave while already left
        result.current.leave()?.then(() => {
            throw new Error('it should not reach here');
        }).catch((error) => {
            expect(error).toBe('useConversation|leave|conversation is not joined')
        })
    })

    test(`rerender-name`, () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent);

        simulateStatusJoined = false;
        simulateDestroyed = false;

        simulateJoinFail = false;

        const { result, rerender } = renderHook(
            (props: { name: string }) => useConversation(session, props.name, undefined, false),
            { initialProps: { name: 'foo' } });
        expect(result.current.conversation?.getName()).toEqual('foo')
        expect(result.current.joining).toEqual(false)
        expect(result.current.joined).toEqual(false)

        // now change name, the conversation shall change
        const l_conversation = result.current.conversation;
        rerender({ name: 'bar' })

        expect(result.current.conversation).not.toBe(l_conversation)
        expect(result.current.conversation?.getName()).toEqual('bar')
        expect(result.current.joined).toEqual(false)
        expect(simulateDestroyed).toBeTruthy()

        // now rerender with undefined name, the conversation shall be destroyed
        simulateDestroyed = false;
        rerender({ name: undefined } as any)

        expect(result.current.joined).toEqual(false)
        expect(result.current.joining).toEqual(false)
        expect(result.current.conversation).toBeUndefined()
        expect(simulateStatusJoined).toBeFalsy()
        expect(simulateDestroyed).toBeTruthy()
    })

    test(`auto-join`, async () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent);

        simulateStatusJoined = false;
        simulateDestroyed = false;

        simulateJoinFail = false;

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { name: string; join: boolean }) => useConversation(session, props.name, undefined, props.join),
            { initialProps: { name: 'foo', join: true } });
        expect(result.current.conversation?.getName()).toEqual('foo')
        expect(result.current.joining).toEqual(true)
        expect(result.current.joined).toEqual(false)

        await waitForNextUpdate()

        expect(result.current.joining).toEqual(false)
        expect(result.current.joined).toEqual(true)
        expect(simulateStatusJoined).toBeTruthy()
        expect(simulateDestroyed).toBeFalsy()

        // Changing 'join' to false does a simple leave
        const l_conversation = result.current.conversation;
        rerender({ name: 'foo', join: false })

        await waitForNextUpdate()
        // .then(() => {
        //     throw new Error('it should not reach here');
        // }).catch(() => {
        //     // expected
        //     console.log("Expected: there should not be update")
        // })
        expect(result.current.joined).toEqual(false)
        expect(result.current.conversation).toBe(l_conversation)
        expect(simulateStatusJoined).toBeFalsy()
        expect(simulateDestroyed).toBeFalsy()

        // Changing 'join' to true does a simple join
        rerender({ name: 'foo', join: true })
        expect(result.current.joining).toEqual(true)
        await waitForNextUpdate()
        expect(result.current.joined).toEqual(true)
        expect(result.current.joining).toEqual(false)
        expect(result.current.conversation).toBe(l_conversation)
        expect(simulateStatusJoined).toBeTruthy()
        expect(simulateDestroyed).toBeFalsy()

        // now rerender with undefined name, the conversation shall be left destroyed
        rerender({ name: undefined, join: true } as any)

        await waitForNextUpdate()
        expect(result.current.joined).toEqual(false)
        expect(result.current.joining).toEqual(false)
        expect(result.current.conversation).toBeUndefined()
        expect(simulateStatusJoined).toBeFalsy()
        expect(simulateDestroyed).toBeTruthy()
    })

    test(`auto-join-error`, async () => {
        const userAgent = new UserAgent({});
        const session = new Session(userAgent);

        simulateStatusJoined = false;
        simulateDestroyed = false;

        simulateJoinFail = true;

        const { result, rerender, waitForNextUpdate } = renderHook((props: { session: Session }) => useConversation(props.session, 'foo', undefined, true),
            { initialProps: { session } });
        expect(result.current.conversation?.getName()).toEqual('foo')
        expect(result.current.joining).toEqual(true)
        expect(result.current.joined).toEqual(false)

        await waitForNextUpdate()
        expect(result.current.joining).toEqual(false)
        expect(result.current.joined).toEqual(false)

        simulateJoinFail = false;

        act(() => { // act required for the setJoining(true)
            result.current.join()?.then(() => {
            }).catch((error) => {
                throw new Error('it should not reach here:' + error);
            })
        })

        await waitForNextUpdate()
        expect(result.current.joining).toEqual(false)
        expect(result.current.joined).toEqual(true)
        expect(simulateDestroyed).toBeFalsy()

        simulateLeaveFail = true;

        rerender({ session: undefined } as any)

        await waitForNextUpdate()
        expect(result.current.conversation).toBeUndefined()
        expect(simulateDestroyed).toBeTruthy()
    })
})