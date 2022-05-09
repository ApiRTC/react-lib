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

        console.log(HOOK_NAME + "|useEffect groups", groups);
        if (session) {
            console.log(HOOK_NAME + "|register contactListUpdate");
            session.on('contactListUpdate', onContactListUpdate);
            const l_session = session;
            groups.forEach(group => {
                console.log(HOOK_NAME + "|subscribeToGroup", group);
                l_session.subscribeToGroup(group);
            })
        }

        return () => {
            if (session) {
                console.log(HOOK_NAME + "|removeListener contactListUpdate");
                session.removeListener('contactListUpdate', onContactListUpdate)
                const l_session = session;
                groups.forEach(group => {
                    console.log(HOOK_NAME + "|unsubscribeToGroup", group);
                    try {
                        // Had to call unsubscribeToGroup in a try catch because it
                        // used to crash the whole app when session was disconnected
                        // useSession|disconnected 
                        // usePresence|removeListener contactListUpdate modules.js:180764:6999
                        // usePresence|unsubscribeToGroup 00001 modules.js:180764:7130
                        // Uncaught TypeError: this.getSubscribedPresenceGroup() is null
                        l_session.unsubscribeToGroup(group);
                    } catch (error) {
                        console.error(HOOK_NAME + "|unsubscribeToGroup", group, error);
                    }
                })
            }
            setContactsByGroup(new Map())
            setContacts(new Set())
        };
    }, [session, JSON.stringify(groups)]);

    return {
        contactsByGroup
    };
}