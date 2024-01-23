import { Contact, Session } from '@apirtc/apirtc';
import { useEffect, useRef, useState } from 'react';

/**
 * Subscribe to groups and returns contactsByGroup (of theses groups only) when updated.
 * If input groups list is updated, this hooks works diff with the previous set in order
 * to make as little as possible unsubscribe/subscribe calls.
 */

const HOOK_NAME = "usePresence";
export default function usePresence(session: Session | undefined, groups: Array<string>) {

    const m_groupsCache = useRef<Set<string>>(new Set());
    const m_contactsByGroup = useRef<Map<string, Set<Contact>>>(new Map());

    const [contactsByGroup, setContactsByGroup] = useState<Map<string, Set<Contact>>>(new Map());

    useEffect(() => {
        if (session) {
            const l_groupsCache = m_groupsCache.current;
            const l_contactsByGroup = m_contactsByGroup.current;
            return () => {
                l_groupsCache.clear()
                l_contactsByGroup.clear()
                setContactsByGroup(new Map())
            }
        }
    }, [session])

    const getOrCreateGroupSet = (group: string) => {
        const o_set = m_contactsByGroup.current.get(group) ?? new Set();
        if (!m_contactsByGroup.current.has(group)) {
            m_contactsByGroup.current.set(group, o_set)
        }
        return o_set
    };

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(`${HOOK_NAME}|useEffect session, groups`, groups)
        }
        if (session) {
            const l_session = session;
            const l_groupsSet = new Set(groups);

            // Diff update subscription to groups
            //
            l_groupsSet.forEach(group => {
                if (!m_groupsCache.current.has(group)) {
                    if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                        console.info(`${HOOK_NAME}|subscribeToGroup`, group)
                    }
                    m_groupsCache.current.add(group)
                    l_session.subscribeToGroup(group)
                }
            })

            let needsRefresh = false;
            m_groupsCache.current.forEach(group => {
                if (!l_groupsSet.has(group)) {
                    if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                        console.info(`${HOOK_NAME}|unsubscribeToGroup`, group)
                    }
                    l_session.unsubscribeToGroup(group)
                    m_groupsCache.current.delete(group)
                    m_contactsByGroup.current.delete(group)
                    needsRefresh = true;
                }
            })

            if (needsRefresh) {
                // contactsByGroup is exposed, so change the Map object to let client code detect a change.
                setContactsByGroup(new Map(m_contactsByGroup.current))
            }

            if (groups.length > 0) {
                const onContactListUpdate = (updatedContacts: any) => {

                    if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
                        console.debug(`${HOOK_NAME}|contactListUpdate`, updatedContacts)
                    }

                    let needsRefresh = false;

                    // Maintain Map of Contacts per Group
                    //
                    for (const group of Object.keys(updatedContacts.joinedGroup)) {
                        if (l_groupsSet.has(group)) {
                            const l_set = getOrCreateGroupSet(group);
                            for (const contact of updatedContacts.joinedGroup[group]) {
                                l_set.add(contact)
                                needsRefresh = true;
                            }
                        }
                    }
                    for (const group of Object.keys(updatedContacts.leftGroup)) {
                        if (l_groupsSet.has(group)) {
                            const l_set = getOrCreateGroupSet(group);
                            for (const contact of updatedContacts.leftGroup[group]) {
                                l_set.delete(contact)
                                needsRefresh = true;

                                // if set is empty, no need to keep the group as key in the map
                                if (l_set.size === 0) {
                                    m_contactsByGroup.current.delete(group)
                                }
                            }
                        }
                    }

                    // For data updates, trigger a refresh if and only if contact is part of managed groups
                    for (const contact of updatedContacts.userDataChanged as Contact[]) {
                        for (const l_contacts of m_contactsByGroup.current.values()) {
                            if (l_contacts.has(contact)) {
                                needsRefresh = true;
                                break;
                            }
                        }
                    }

                    if (needsRefresh) {
                        // contactsByGroup is exposed, so change the Map object to let client code detect a change.
                        setContactsByGroup(new Map(m_contactsByGroup.current))
                    }
                };
                l_session.on('contactListUpdate', onContactListUpdate)
                return () => {
                    l_session.removeListener('contactListUpdate', onContactListUpdate)
                }
            }
        }
    }, [session, groups])

    return {
        contactsByGroup
    }
}