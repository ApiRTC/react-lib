import { Contact, Conversation } from '@apirtc/apirtc';
import { useEffect, useState } from 'react';

const HOOK_NAME = 'useConversationContacts';
export default function useConversationContacts(
	conversation: Conversation | undefined,
	contactJoined?: (contact: Contact) => void,
	contactLeft?: (contact: Contact) => void
) {
	const [contacts, setContacts] = useState<Array<Contact>>([]);

	useEffect(() => {
		if (conversation) {
			const onContactJoined = (contact: Contact) => {
				if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
					console.debug(
						`${HOOK_NAME}|on:contactJoined:`,
						conversation.getName(),
						contact
					);
				}
				setContacts((l_contacts) => [...l_contacts, contact]);
				if (contactJoined) {
					contactJoined(contact);
				}
			};
			conversation.on('contactJoined', onContactJoined);

			const onContactLeft = (contact: Contact) => {
				if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
					console.debug(`${HOOK_NAME}|on:contactLeft:`, conversation.getName(), contact);
				}
				// filter out contact
				setContacts((l_contacts) =>
					l_contacts.filter((l_contact) => l_contact !== contact)
				);
				if (contactLeft) {
					contactLeft(contact);
				}
			};
			conversation.on('contactLeft', onContactLeft);

			return () => {
				conversation.removeListener('contactJoined', onContactJoined);
				conversation.removeListener('contactLeft', onContactLeft);
				setContacts(new Array<Contact>());
			};
		}
	}, [conversation, contactJoined, contactLeft]);

	return {
		contacts,
	};
}
