import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import { Contact, UserAgent, Session, UserAgentOptions } from '@apirtc/apirtc'

let contactListUpdateFn: Function | undefined;
const subscribedGroups: Set<string> = new Set();

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
                on: (event: string, fn: Function) => {
                    if (event === 'contactListUpdate') {
                        contactListUpdateFn = fn;
                    }
                },
                removeListener: (event: string, fn: Function) => {
                    if (event === 'contactListUpdate' && fn === contactListUpdateFn) {
                        contactListUpdateFn = undefined;
                    }
                },
                getUserAgent: () => { return ua },
                subscribeToGroup: (groupName: string) => {
                    subscribedGroups.add(groupName)
                },
                unsubscribeToGroup: (groupName: string) => {
                    subscribedGroups.delete(groupName)
                },
                simulateContactListUpdate: (updatedContacts: any) => {
                    if (contactListUpdateFn) {
                        contactListUpdateFn(updatedContacts)
                    }
                }
            }
        }),
    }
})

import usePresence from './usePresence'

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('usePresence', () => {
    test(`If session is undefined, contactsByGroup is empty`, () => {
        const { result } = renderHook(() => usePresence(undefined, []));
        expect(result.current.contactsByGroup).toStrictEqual(new Map())
        expect(subscribedGroups.size).toEqual(0)
        expect(contactListUpdateFn).toBeUndefined()
    })
    test(`With session, empty groups array`, () => {

        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const { result } = renderHook(() => usePresence(session, []));
        expect(result.current.contactsByGroup).toStrictEqual(new Map())
        expect(subscribedGroups.size).toEqual(0)
        expect(contactListUpdateFn).toBeUndefined()

        // Simulate a group update, but we have not provided any groups
        act(() => {
            (session as any).simulateContactListUpdate({
                joinedGroup: { group1: [new Contact('foo', {})] },
                leftGroup: { group2: [new Contact('bar', {})] },
                userDataChanged: [new Contact('foo-bar', {})]
            })
        })

        expect(result.current.contactsByGroup).toStrictEqual(new Map())
    })

    test(`With session, non-empty groups array`, () => {

        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const { result } = renderHook(() => usePresence(session, ['group1', 'group2']));

        expect(result.current.contactsByGroup).toStrictEqual(new Map())
        expect(subscribedGroups.size).toEqual(2)
        expect(subscribedGroups.has('group1')).toBeTruthy()
        expect(subscribedGroups.has('group2')).toBeTruthy()
        expect(contactListUpdateFn).toBeDefined()

        // Simulate a group1 update
        const contact01 = new Contact('id01', {})
        act(() => {
            (session as any).simulateContactListUpdate({
                joinedGroup: { group1: [contact01] },
                leftGroup: {},
                userDataChanged: []
            })
        })

        const expectedMap: Map<string, Set<Contact>> = new Map()
        expectedMap.set('group1', new Set([contact01]))

        expect(result.current.contactsByGroup).toStrictEqual(expectedMap)

        // Simulate a userDataChanged for contact01
        act(() => {
            (session as any).simulateContactListUpdate({
                joinedGroup: {},
                leftGroup: {},
                userDataChanged: [contact01]
            })
        })
        expect(result.current.contactsByGroup).toStrictEqual(expectedMap)


        // Simulate a group1 update, contact01 left group
        act(() => {
            (session as any).simulateContactListUpdate({
                joinedGroup: {},
                leftGroup: { group1: [contact01] },
                userDataChanged: []
            })
        })

        expect(result.current.contactsByGroup).toStrictEqual(new Map());
    })

    test(`Test-rerender`, () => {

        const userAgent = new UserAgent({});
        const session = new Session(userAgent, {});

        const { result, rerender } = renderHook(
            (groups: string[]) => usePresence(session, groups),
            { initialProps: ['group1', 'group2'] });

        expect(result.current.contactsByGroup).toStrictEqual(new Map());
        expect(subscribedGroups.size).toEqual(2)
        expect(subscribedGroups.has('group1')).toBeTruthy()
        expect(subscribedGroups.has('group2')).toBeTruthy()
        expect(contactListUpdateFn).toBeDefined()

        // Simulate a group1 update
        const contact01 = new Contact('id01', {})
        act(() => {
            (session as any).simulateContactListUpdate({
                joinedGroup: { group1: [contact01], group2: [contact01] },
                leftGroup: {},
                userDataChanged: []
            })
        })

        const expectedMap: Map<string, Set<Contact>> = new Map();
        expectedMap.set('group1', new Set([contact01]))
        expectedMap.set('group2', new Set([contact01]))

        expect(result.current.contactsByGroup).toStrictEqual(expectedMap)

        rerender(['group1'])

        expectedMap.delete('group2')
        expect(result.current.contactsByGroup).toStrictEqual(expectedMap)
        expect(subscribedGroups.size).toEqual(1)
        expect(subscribedGroups.has('group1')).toBeTruthy()
        expect(contactListUpdateFn).toBeDefined()

        rerender([])

        expect(result.current.contactsByGroup).toStrictEqual(new Map())
        expect(subscribedGroups.size).toEqual(0)
        expect(contactListUpdateFn).toBeUndefined()
    })
})