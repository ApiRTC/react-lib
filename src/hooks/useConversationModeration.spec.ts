import { act, renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Contact, Conversation } from '@apirtc/apirtc';

import useConversationModeration from './useConversationModeration';

import { setLogLevel } from '..';

let contactJoinedWaitingRoomFn: Function | undefined = undefined;
let contactLeftWaitingRoomFn: Function | undefined = undefined;
let participantEjectedFn: Function | undefined = undefined;

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
	const originalModule = jest.requireActual('@apirtc/apirtc');

	return {
		__esModule: true,
		...originalModule,
		Conversation: jest.fn().mockImplementation((name: string, options?: any) => {
			const instance = {
				getName: () => {
					return name;
				},
				on: (event: string, fn: Function) => {
					if (event === 'contactJoinedWaitingRoom') {
						contactJoinedWaitingRoomFn = fn;
					}
					if (event === 'contactLeftWaitingRoom') {
						contactLeftWaitingRoomFn = fn;
					}
					if (event === 'participantEjected') {
						participantEjectedFn = fn;
					}
					return instance;
				},
				removeListener: (event: string, fn: Function) => {
					if (event === 'contactJoinedWaitingRoom' && contactJoinedWaitingRoomFn === fn) {
						contactJoinedWaitingRoomFn = undefined;
					}
					if (event === 'contactLeftWaitingRoom' && contactLeftWaitingRoomFn === fn) {
						contactLeftWaitingRoomFn = undefined;
					}
					if (event === 'participantEjected' && participantEjectedFn === fn) {
						participantEjectedFn = undefined;
					}
					return instance;
				},
			};
			return instance;
		}),
	};
});

// Set log level to max to maximize code coverage
setLogLevel('debug');

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useConversationModeration', () => {
	test(`If conversation is undefined, messages is empty, no listener`, () => {
		// Init
		contactJoinedWaitingRoomFn = undefined;
		contactLeftWaitingRoomFn = undefined;
		participantEjectedFn = undefined;

		const { result } = renderHook(() => useConversationModeration(undefined));
		expect(result.current.candidates).toBeDefined();
		expect(result.current.candidates.size).toBe(0);

		expect(contactJoinedWaitingRoomFn).toBeUndefined();
		expect(contactLeftWaitingRoomFn).toBeUndefined();
		expect(participantEjectedFn).toBeUndefined();
	});

	test(`moderation`, () => {
		// Init
		contactJoinedWaitingRoomFn = undefined;
		contactLeftWaitingRoomFn = undefined;
		participantEjectedFn = undefined;

		const conversation = new Conversation('foo', {});

		const { result, rerender } = renderHook(
			(props: { conversation: Conversation }) =>
				useConversationModeration(props.conversation),
			{
				initialProps: { conversation },
			}
		);
		expect(result.current.candidates).toBeDefined();
		expect(result.current.candidates.size).toBe(0);

		expect(contactJoinedWaitingRoomFn).toBeDefined();
		expect(contactLeftWaitingRoomFn).toBeDefined();
		expect(participantEjectedFn).toBeDefined();

		const contact01 = new Contact('id01', {});

		// Test WaitingRoom
		//
		act(() => {
			contactJoinedWaitingRoomFn?.call(this, contact01);
		});

		expect(result.current.candidates).toContain(contact01);

		act(() => {
			contactLeftWaitingRoomFn?.call(this, contact01);
		});

		expect(result.current.candidates.size).toBe(0);

		// Rerender with new conversation shall reinitialize array
		const l_candidates = result.current.candidates;
		rerender({ conversation: new Conversation('bar', {}) } as any);

		expect(result.current.candidates.size).toBe(0);
		expect(result.current.candidates).not.toBe(l_candidates);
	});

	test(`ejected`, () => {
		// Init
		contactJoinedWaitingRoomFn = undefined;
		contactLeftWaitingRoomFn = undefined;
		participantEjectedFn = undefined;

		const conversation = new Conversation('foo', {});

		const l_ejected = new Set<Contact>();

		let ejectedSelf = false;

		const onEjected = (contact: Contact) => {
			l_ejected.add(contact);
		};
		const onEjectedSelf = () => {
			ejectedSelf = true;
		};

		renderHook(
			(props: { conversation: Conversation }) =>
				useConversationModeration(props.conversation, onEjected, onEjectedSelf),
			{ initialProps: { conversation } }
		);

		expect(contactJoinedWaitingRoomFn).toBeDefined();
		expect(contactLeftWaitingRoomFn).toBeDefined();
		expect(participantEjectedFn).toBeDefined();

		const contact01 = new Contact('id01', {});

		// Test participant ejected
		//
		act(() => {
			participantEjectedFn?.call(this, { contact: contact01 });
		});

		expect(l_ejected.size).toBe(1);
		expect(l_ejected).toContain(contact01);
		expect(ejectedSelf).toBeFalsy();

		act(() => {
			participantEjectedFn?.call(this, { self: true });
		});

		expect(l_ejected.size).toBe(1);
		expect(l_ejected).toContain(contact01);
		expect(ejectedSelf).toBeTruthy();
	});
});
