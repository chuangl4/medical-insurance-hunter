import { useState } from 'react';
import type { Profile, Provider } from '../domain/profile';
import { ChatOnboarding, type ChatMessage } from './ChatOnboarding';
import { ProfileSections, type SectionId } from './ProfileSections';

interface Props {
  profile: Profile;
  onChange: (next: Profile) => void;
  messages: ChatMessage[];
  onMessages: (next: ChatMessage[]) => void;
  onDone: () => void;
  onPatchProvider: (id: string, patch: Partial<Provider>) => void;
  checking: string[];
  onRecheck: (provider: Provider) => void;
}

/**
 * The household page: chat with Scout on one side and the profile on the other. Each part of the profile shows a
 * summary until it's opened for editing; then that side widens so the full fields have room.
 */
export function HouseholdWorkspace({ profile, onChange, messages, onMessages, onDone, onPatchProvider, checking, onRecheck }: Props) {
  const [open, setOpen] = useState<SectionId | null>(null);
  return (
    <div className={open ? 'chat-layout editing' : 'chat-layout'}>
      <ChatOnboarding profile={profile} onChange={onChange} messages={messages} onMessages={onMessages} />
      <ProfileSections
        profile={profile}
        onChange={onChange}
        open={open}
        onOpen={setOpen}
        onDone={onDone}
        onPatchProvider={onPatchProvider}
        checking={checking}
        onRecheck={onRecheck}
      />
    </div>
  );
}
