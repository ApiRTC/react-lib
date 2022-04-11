import { useState, useEffect } from "react";

import { Session, Contact } from '@apirtc/apirtc';

/**
 * Subscribe to groups and returns contactsByGroup (of theses groups only) when updated
 */

const HOOK_NAME = "usePresence"
export default function usePresence(session: Session | undefined, groups: Array<string>) {

    const [contacts, setContacts] = useState<Set<Contact>>(new Set());
    const [contactsByGroup, setContactsByGroup] = useState<Map<string, Set<Contact>>>(new Map());

    useEffect(() => {
        const onContactListUpdate = (updatedContacts: any) => {
            console.log(HOOK_NAME + "|contactListUpdate", updatedContacts);

            const l_groups = new Set(groups);

            var needsRefresh = false;

            // Maintain Map of Contacts per Group
            //
            for (const group of Object.keys(updatedContacts.joinedGroup)) {
                if (l_groups.has(group)) {
                    if (!contactsByGroup.has(group)) {
                        contactsByGroup.set(group, new Set());
                    }
                    for (const contact of updatedContacts.joinedGroup[group]) {
                        contacts.add(contact);
                        contactsByGroup.get(group)?.add(contact);
                        needsRefresh = true;
                    }
                }
            }
            for (const group of Object.keys(updatedContacts.leftGroup)) {
                if (l_groups.has(group)) {
                    if (!contactsByGroup.has(group)) {
                        contactsByGroup.set(group, new Set());
                    }
                    for (const contact of updatedContacts.leftGroup[group]) {
                        contactsByGroup.get(group)?.delete(contact);
                        needsRefresh = true;

                        // Delete from contacts is contact is not in any managed groups
                        let deleteFromContacts = false;
                        contactsByGroup.forEach((l_contacts: Set<Contact>) => {
                            if (l_contacts.has(contact)) {
                                deleteFromContacts = true;
                            }
                        })
                        if (deleteFromContacts) {
                            contacts.delete(contact)
                        }
                    }
                }
            }
            // trigger a refresh if and only if contact is part of managed groups
            for (const contact of updatedContacts.userDataChanged) {
                if (contacts.has(contact)) {
                    needsRefresh = true;
                }
            }

            if (needsRefresh) {
                setContactsByGroup(new Map(contactsByGroup))
            }
        };

        session?.on('contactListUpdate', onContactListUpdate);

        return () => {
            session?.removeListener('contactListUpdate', onContactListUpdate)
            setContactsByGroup(new Map())
            setContacts(new Set())
        };
    }, [session, JSON.stringify(groups)]);

    useEffect(() => {

        console.log(HOOK_NAME + "|useEffect groups", groups);

        groups.forEach(group => {
            session?.subscribeToGroup(group);
        })

        return () => {
            groups.forEach(group => {
                session?.unsubscribeToGroup(group);
            })
            setContactsByGroup(new Map())
            setContacts(new Set())
        };
    }, [JSON.stringify(groups)]);

    return {
        contactsByGroup
    };
}