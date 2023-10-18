import { act, renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Contact, Conversation } from '@apirtc/apirtc';

let contactJoined: Function | undefined = undefined;
let contactLeft: Function | undefined = undefined;

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
                    if (event === 'contactJoined') {
                        contactJoined = fn;
                    }
                    if (event === 'contactLeft') {
                        contactLeft = fn;
                    }
                },
                removeListener: (event: string, fn: Function) => {
                    if (event === 'contactJoined' && contactJoined === fn) {
                        contactJoined = undefined;
                    }
                    if (event === 'contactLeft' && contactLeft === fn) {
                        contactLeft = undefined;
                    }
                }
            }
        }),
    }
})

import useConversationContacts from './useConversationContacts';

import { setLogLevel } from '..';

// Set log level to max to maximize code coverage
setLogLevel('debug')

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useConversationContacts', () => {
    test(`If conversation is undefined, contacts is empty, no listener`, () => {
        // Init
        contactJoined = undefined;
        contactLeft = undefined;

        const { result } = renderHook(() => useConversationContacts(undefined));
        expect(result.current.contacts).toBeDefined()
        expect(result.current.contacts.length).toBe(0)

        expect(contactJoined).toBeUndefined()
        expect(contactLeft).toBeUndefined()
    })

    test(`contacts`, () => {
        // Init
        contactJoined = undefined;
        contactLeft = undefined;

        const conversation = new Conversation('foo', {});
        const onContactJoined = jest.fn();
        const onContactLeft = jest.fn();

        const { result } = renderHook((props: {
            conversation: Conversation,
            contactJoined: (contact: Contact) => void,
            contactLeft: (contact: Contact) => void
        }) =>
            useConversationContacts(props.conversation, onContactJoined, onContactLeft), {
            initialProps: {
                conversation,
                contactJoined: onContactJoined,
                contactLeft: onContactLeft
            }
        });
        expect(result.current.contacts).toBeDefined()
        expect(result.current.contacts.length).toBe(0)

        expect(contactJoined).toBeDefined();
        expect(contactLeft).toBeDefined();

        const contact1 = new Contact('a-contact', { firstName: 'Foo' })

        // Test contact join
        act(() => {
            contactJoined?.call(this, contact1)
        })
        expect(result.current.contacts.length).toBe(1)
        expect(result.current.contacts[0]).toBe(contact1)
        expect(onContactJoined).toHaveBeenCalledWith(contact1)

        // Test contact left
        act(() => {
            contactLeft?.call(this, contact1)
        })
        expect(result.current.contacts.length).toBe(0)
        expect(onContactLeft).toHaveBeenCalledWith(contact1)

    })

})