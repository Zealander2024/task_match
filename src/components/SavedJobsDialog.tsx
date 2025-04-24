import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { JobPostsList } from './JobPostsList';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

interface SavedJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobSelect: (jobId: string) => void;
  onSaveStateChange: () => void;
}

export function SavedJobsDialog({ 
  open, 
  onOpenChange, 
  onJobSelect,
  onSaveStateChange 
}: SavedJobsDialogProps) {
  const { user } = useAuth();

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-400">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <DialogTitle className="text-xl font-semibold">All Saved Jobs</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-200" />
          </button>
        </DialogHeader>
        
        <div className="mt-6 px-1">
          {user ? (
            <JobPostsList
              onJobSelect={onJobSelect}
              filter="saved"
              userId={user?.id}
              onSaveStateChange={onSaveStateChange}
            />
          ) : (
            <div className="text-center py-8 text-gray-200">
              Please sign in to view saved jobs
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
