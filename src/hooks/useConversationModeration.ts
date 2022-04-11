import { useState, useEffect } from 'react';

import { Contact, Conversation } from '@apirtc/apirtc';

const HOOK_NAME = "useConversationModeration"
export default function useConversationModeration(
    conversation: Conversation | undefined,
    onEjected?: (contact: Contact) => void,
    onEjectedSelf?: () => void) {

    const [candidates, setCandidates] = useState<Set<Contact>>(new Set<Contact>())

    useEffect(() => {

        console.log(HOOK_NAME + "|conversation changed!", conversation)

        const on_contactJoinedWaitingRoom = (contact: Contact) => {
            console.log(HOOK_NAME + "|on:contactJoinedWaitingRoom", contact);
            // A candidate joined the waiting room.
            candidates.add(contact)
            setCandidates(new Set(candidates))
        }

        const on_contactLeftWaitingRoom = (contact: Contact) => {
            console.log(HOOK_NAME + "|on:contactLeftWaitingRoom", contact);
            // A candidate left the waiting room.
            candidates.delete(contact)
            setCandidates(new Set(candidates))
        }

        // TODO make apirtc.d.ts update to replace 'any'
        const on_participantEjected = (data: any) => {
            console.log(HOOK_NAME + "|on:participantEjected", data);
            if (data.self === true) {
                console.log(HOOK_NAME + "|Self participant was ejected");
                if (onEjectedSelf)
                    onEjectedSelf()
            }
            else {
                if (onEjected)
                    onEjected(data.contact)
            }
        }

        if (conversation) {
            conversation
                .on('contactJoinedWaitingRoom', on_contactJoinedWaitingRoom)
                .on('contactLeftWaitingRoom', on_contactLeftWaitingRoom)
                .on('participantEjected', on_participantEjected);
        }

        return () => {
            console.log(HOOK_NAME + "|conversation clear", conversation)

            // remove listeners
            if (conversation)
                conversation
                    .removeListener('contactJoinedWaitingRoom', on_contactJoinedWaitingRoom)
                    .removeListener('contactLeftWaitingRoom', on_contactLeftWaitingRoom)
                    .removeListener('participantEjected', on_participantEjected);

            setCandidates(new Set())
        }
    }, [conversation]);

    return {
        candidates
    };
}