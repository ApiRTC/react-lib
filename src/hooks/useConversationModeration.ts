import { Contact, Conversation } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

const HOOK_NAME = 'useConversationModeration';
export default function useConversationModeration(
	conversation: Conversation | undefined,
	onEjected?: (contact: Contact) => void,
	onEjectedSelf?: () => void
) {
	const [candidates, setCandidates] = useState<Set<Contact>>(new Set<Contact>());

	useEffect(() => {
		if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
			console.debug(`${HOOK_NAME}|useEffect conversation`, conversation);
		}

		if (conversation) {
			const on_contactJoinedWaitingRoom = (contact: Contact) => {
				if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
					console.info(`${HOOK_NAME}|on:contactJoinedWaitingRoom`, contact);
				}
				// A candidate joined the waiting room.
				setCandidates((prev) => new Set(prev.add(contact)));
			};
			const on_contactLeftWaitingRoom = (contact: Contact) => {
				if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
					console.info(`${HOOK_NAME}|on:contactLeftWaitingRoom`, contact);
				}
				// A candidate left the waiting room.
				setCandidates((prev) => {
					prev.delete(contact);
					return new Set(prev);
				});
			};
			// TODO make apirtc.d.ts update to replace 'any'
			const on_participantEjected = (data: any) => {
				if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
					console.info(`${HOOK_NAME}|on:participantEjected`, data);
				}
				if (data.self === true) {
					if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
						console.info(`${HOOK_NAME}|Self participant was ejected`);
					}
					if (onEjectedSelf) {
						onEjectedSelf();
					}
				} else {
					if (onEjected) {
						onEjected(data.contact);
					}
				}
			};

			conversation
				.on('contactJoinedWaitingRoom', on_contactJoinedWaitingRoom)
				.on('contactLeftWaitingRoom', on_contactLeftWaitingRoom)
				.on('participantEjected', on_participantEjected);

			return () => {
				if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
					console.debug(`${HOOK_NAME}|conversation clear`, conversation);
				}
				// remove listeners
				conversation
					.removeListener('contactJoinedWaitingRoom', on_contactJoinedWaitingRoom)
					.removeListener('contactLeftWaitingRoom', on_contactLeftWaitingRoom)
					.removeListener('participantEjected', on_participantEjected);
				setCandidates(new Set());
			};
		}
	}, [conversation, onEjected, onEjectedSelf]);

	return {
		candidates,
	};
}
