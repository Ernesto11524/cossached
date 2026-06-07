import { useState } from 'react'
import PortalLayout         from '../portal/PortalLayout.jsx'
import DashboardTab         from '../portal/DashboardTab.jsx'
import AnnouncementsTab     from '../portal/AnnouncementsTab.jsx'
import ResourcesTab         from '../portal/ResourcesTab.jsx'
import DirectoryTab         from '../portal/DirectoryTab.jsx'
import ExecutivesTab        from '../portal/ExecutivesTab.jsx'
import WelfareTab           from '../portal/WelfareTab.jsx'
import EventsTab            from '../portal/EventsTab.jsx'
import ProfileTab           from '../portal/ProfileTab.jsx'
import MessagesTab          from '../portal/MessagesTab.jsx'
import AdminMembersTab      from '../portal/AdminMembersTab.jsx'
import AdminNewsTab         from '../portal/AdminNewsTab.jsx'
import ContactMessagesTab   from '../portal/ContactMessagesTab.jsx'
import GalleryTab           from '../portal/GalleryTab.jsx'
import ElectionsTab         from '../portal/ElectionsTab.jsx'
import AdminElectionsTab    from '../portal/AdminElectionsTab.jsx'
import PushPrompt           from '../components/PushPrompt.jsx'

const TAB_TITLES = {
  dash:          'Dashboard',
  announce:      'Announcements',
  messages:      'Messages',
  resources:     'Resources',
  gallery:        'Gallery',
  elections:      'Elections',
  adminElections: 'Manage Elections',
  directory:     'Member Directory',
  executives:    'Executive Officers',
  welfare:       'Welfare Requests',
  events:        'Events & Meetings',
  profile:       'My Profile',
  adminNews:     'Manage News',
  adminMembers:  'Manage Members',
  adminMessages: 'Contact Form Messages',
}

export default function PortalPage() {
  const [tab, setTab] = useState('dash')

  const content = {
    dash:          <DashboardTab setTab={setTab} />,
    announce:      <AnnouncementsTab />,
    messages:      <MessagesTab />,
    resources:     <ResourcesTab />,
    gallery:        <GalleryTab />,
    elections:      <ElectionsTab />,
    adminElections: <AdminElectionsTab />,
    directory:     <DirectoryTab />,
    executives:    <ExecutivesTab />,
    welfare:       <WelfareTab />,
    events:        <EventsTab />,
    profile:       <ProfileTab />,
    adminNews:     <AdminNewsTab />,
    adminMembers:  <AdminMembersTab />,
    adminMessages: <ContactMessagesTab />,
  }

  return (
    <>
      <PortalLayout title={TAB_TITLES[tab] ?? 'Portal'} activeTab={tab} setTab={setTab}>
        {content[tab]}
      </PortalLayout>
      <PushPrompt />
    </>
  )
}
