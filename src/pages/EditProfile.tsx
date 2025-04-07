import { ProfileEditor } from '../components/ProfileEditor';
import { Toaster } from 'sonner';

export function EditProfile() {
  return (
    <>
      <Toaster position="top-right" />
      <ProfileEditor />
    </>
  );
} 