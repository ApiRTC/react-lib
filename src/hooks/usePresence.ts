import { useState, useEffect } from 'react'
import { Session, Contact } from '@apirtc/apirtc'

/**
 * Subscribe to groups and returns contactsByGroup (of theses groups only) when updated.
 * If input groups list is updated, this hooks works diff with the previous set in order
 * to make as little as possible unsubscribe/subscribe calls.
 */

const HOOK_NAME = "usePresence"
export default function usePresence(session: Session | undefined, groups: Array<string>) {

    const [groupsCache] = useState<Set<string>>(new Set())

    const [m_contacts] = useState<Set<Contact>>(new Set())
    const [m_contactsByGroup] = useState<Map<string, Set<Contact>>>(new Map())

    const [contactsByGroup, setContactsByGroup] = useState<Map<string, Set<Contact>>>(new Map())

    useEffect(() => {
        if (session) {
            return () => {
                m_contactsByGroup.clear()
                setContactsByGroup(new Map(m_contactsByGroup))
                m_contacts.clear()
                groupsCache.clear()
            }
        }
    }, [session])

    useEffect(() => {
        if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
            console.debug(HOOK_NAME + "|useEffect session, groups", groups)
        }
        if (session) {
            const l_session = session;
            const l_groupsSet = new Set(groups);

            const onContactListUpdate = (updatedContacts: any) => {
                
                if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
                    console.debug(HOOK_NAME + "|contactListUpdate", updatedContacts)
                }

                let needsRefresh = false;

                // Maintain Map of Contacts per Group
                //
                for (const group of Object.keys(updatedContacts.joinedGroup)) {
                    if (l_groupsSet.has(group)) {
                        if (!m_contactsByGroup.has(group)) {
                            m_contactsByGroup.set(group, new Set())
                        }
                        for (const contact of updatedContacts.joinedGroup[group]) {
                            m_contacts.add(contact)
                            m_contactsByGroup.get(group)?.add(contact)
                            needsRefresh = true;
                        }
                    }
                }
                for (const group of Object.keys(updatedContacts.leftGroup)) {
                    if (l_groupsSet.has(group)) {
                        if (!m_contactsByGroup.has(group)) {
                            m_contactsByGroup.set(group, new Set())
                        }
                        for (const contact of updatedContacts.leftGroup[group]) {
                            m_contactsByGroup.get(group)?.delete(contact)
                            needsRefresh = true;

                            // Delete from contacts if contact is not in any managed groups
                            let deleteFromContacts = false;
                            m_contactsByGroup.forEach((l_contacts: Set<Contact>) => {
                                if (l_contacts.has(contact)) {
                                    deleteFromContacts = true;
                                }
                            })
                            if (deleteFromContacts) {
                                m_contacts.delete(contact)
                            }
                        }
                    }
                }
                // trigger a refresh if and only if contact is part of managed groups
                for (const contact of updatedContacts.userDataChanged) {
                    if (m_contacts.has(contact)) {
                        needsRefresh = true;
                    }
                }

                if (needsRefresh) {
                    // contactsByGroup is exposed, so change the Map object to let client code detect a change.
                    setContactsByGroup(new Map(m_contactsByGroup))
                }
            }
            l_session.on('contactListUpdate', onContactListUpdate)

            // Diff update subscription to groups
            //
            l_groupsSet.forEach(group => {
                if (!groupsCache.has(group)) {
                    if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
                        console.info(HOOK_NAME + "|subscribeToGroup", group)
                    }
                    groupsCache.add(group)
                    l_session.subscribeToGroup(group)
                }
            })

            let needsRefresh = false;
            groupsCache.forEach(group => {
                if (!l_groupsSet.has(group)) {
                    if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
                        console.info(HOOK_NAME + "|unsubscribeToGroup", group)
                    }
                    l_session.unsubscribeToGroup(group)
                    groupsCache.delete(group)
                    m_contactsByGroup.delete(group)
                    needsRefresh = true;
                }
            })

            if (needsRefresh) {
                // contactsByGroup is exposed, so change the Map object to let client code detect a change.
                setContactsByGroup(new Map(m_contactsByGroup))
            }

            return () => {
                l_session.removeListener('contactListUpdate', onContactListUpdate)
            }

        }
    }, [session, JSON.stringify(groups)])

    return {
        contactsByGroup
    }
}