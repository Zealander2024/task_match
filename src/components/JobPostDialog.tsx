import React, { useState, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Briefcase, DollarSign, Clock, Mail, Building2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { JobPost } from '../types/database';
import { JobApplicationForm } from './JobApplicationForm';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/use-toast';

// Constants
const DIALOG_MAX_WIDTH = 'max-w-4xl';
const DIALOG_MAX_HEIGHT = 'max-h-[90vh]';

interface JobPostDialogProps {
  job: JobPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Memoized Components
const JobDetailsGrid = memo(({ job }: { job: JobPost }) => (
  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
    <div className="flex items-center space-x-2">
      <MapPin className="w-4 h-4 text-gray-400" />
      <span className="text-gray-600">{job.location || 'Remote'}</span>
    </div>
    <div className="flex items-center space-x-2">
    ₱
      <span className="text-gray-600">{job.budget || 'Not specified'}</span>
    </div>
    <div className="flex items-center space-x-2">
      <Clock className="w-4 h-4 text-gray-400" />
      <span className="text-gray-600">{job.work_schedule || 'Flexible'}</span>
    </div>
    <div className="flex items-center space-x-2">
      <Calendar className="w-4 h-4 text-gray-400" />
      <span className="text-gray-600">
        {job.start_date ? format(new Date(job.start_date), 'MMM d, yyyy') : 'Immediate'}
      </span>
    </div>
  </div>
));

const EmployerInfo = memo(({ job }: { job: JobPost }) => (
  <div className="border-t pt-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Posted by</h3>
    <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
      {job.company_logo_url ? (
        <img
          src={job.company_logo_url}
          alt={job.company_name}
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
          <Briefcase className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <div>
        <p className="font-medium text-lg">{job.company_name}</p>
        <div className="flex items-center text-gray-600 mt-1">
          <Mail className="w-4 h-4 mr-2" />
          <span>{job.employer_email}</span>
        </div>
      </div>
    </div>
  </div>
));

export function JobPostDialog({ job, open, onOpenChange }: JobPostDialogProps) {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleApplyClick = useCallback(() => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to apply for this job.',
        variant: 'destructive',
      });
      return;
    }
    setShowApplicationForm(true);
  }, [user, toast]);

  const handleApplicationSuccess = useCallback(() => {
    setShowApplicationForm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  if (!job) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${DIALOG_MAX_WIDTH} ${DIALOG_MAX_HEIGHT} overflow-y-auto bg-white`}>
        {!showApplicationForm ? (
          <>
            <DialogHeader className="border-b pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {job.company_logo_url ? (
                    <img
                      src={job.company_logo_url}
                      alt={job.company_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                      <Building2 className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <DialogTitle className="text-2xl font-bold text-gray-900">
                      {job.title}
                    </DialogTitle>
                    <p className="text-lg text-gray-600 mt-1">{job.company_name}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary">{job.job_type}</Badge>
                      <Badge variant="outline">{job.category}</Badge>
                    </div>
                  </div>
                </div>
                <DialogClose className="opacity-70 hover:opacity-100">
                  <X className="h-4 w-4" />
                </DialogClose>
              </div>
            </DialogHeader>

            <div className="space-y-8 py-6">
              <JobDetailsGrid job={job} />

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills?.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.additional_requirements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Additional Requirements
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {job.additional_requirements}
                  </p>
                </div>
              )}

              <EmployerInfo job={job} />
            </div>

            <div className="flex justify-end space-x-4 border-t pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleApplyClick}>Apply Now</Button>
            </div>
          </>
        ) : (
          <div className="py-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Apply for {job.title}
              </DialogTitle>
            </DialogHeader>
            <JobApplicationForm
              jobId={job.id}
              onSuccess={handleApplicationSuccess}
              onCancel={() => setShowApplicationForm(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 














