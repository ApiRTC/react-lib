import { Contact, Conversation, ConversationMessage } from '@apirtc/apirtc';
import { useCallback, useEffect, useState } from 'react';

// TODO : get and handle with pagination messages history
// TODO : ask apirtc to include the uuid in ConversationMessage so that we can store it
// into ConversationMessage when creating the local one, and we get it from conversation on:message
// the uuid shall be the value used as a react child key when displaying list of messages

const HOOK_NAME = 'useConversationMessages';
export default function useConversationMessages(conversation: Conversation | undefined) {
	const [messages, setMessages] = useState<Array<ConversationMessage>>([]);

	useEffect(() => {
		if (conversation) {
			const onMessage = (message: ConversationMessage) => {
				if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
					console.debug(`${HOOK_NAME}|on:message:`, conversation.getName(), message);
				}
				setMessages((l_messages) => [...l_messages, message]);
			};
			conversation.on('message', onMessage);

			return () => {
				conversation.removeListener('message', onMessage);
				setMessages(new Array<ConversationMessage>());
			};
		}
	}, [conversation]);

	const sendMessage = useCallback(
		(msgContent: string, sender: Contact) => {
			return new Promise<void>((resolve, reject) => {
				conversation
					?.sendMessage(msgContent)
					.then((uuid: number) => {
						if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
							console.info(
								`${HOOK_NAME}|sentMessage`,
								conversation.getName(),
								uuid,
								msgContent
							);
						}
						setMessages((l_messages) => [
							...l_messages,
							{ content: msgContent, sender: sender, time: new Date() },
						]);
						resolve();
					})
					.catch((error: any) => {
						if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
							console.warn(`${HOOK_NAME}|sendMessage error`, error);
						}
						reject(error);
					});
			});
		},
		[conversation]
	);

	return {
		messages,
		sendMessage,
	};
}
