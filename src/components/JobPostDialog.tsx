import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { JobPost } from '../types/database';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Briefcase, DollarSign, Clock, Mail, Building2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { useState } from 'react';
import { JobApplicationForm } from './JobApplicationForm';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/use-toast';

interface JobPostDialogProps {
  job: JobPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobPostDialog({ job, open, onOpenChange }: JobPostDialogProps) {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!job) return null;

  const handleApplyClick = () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to apply for this job.',
        variant: 'destructive',
      });
      return;
    }
    setShowApplicationForm(true);
  };

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
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
                    <DialogTitle className="text-2xl font-bold text-gray-900">{job.title}</DialogTitle>
                    <p className="text-lg text-gray-600 mt-1">{job.company_name}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary" className="text-sm">{job.job_type}</Badge>
                      <Badge variant="outline" className="text-sm">{job.category}</Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-8 py-6">
              {/* Job Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{job.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Budget</p>
                    <p className="font-medium">{job.budget}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Schedule</p>
                    <p className="font-medium">{job.work_schedule}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">
                      {format(new Date(job.start_date), 'MMM d, yyyy')} - {format(new Date(job.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Required Skills */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Job Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">{job.description}</p>
                </div>
              </div>

              {/* Additional Requirements */}
              {job.additional_requirements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Requirements</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-600 whitespace-pre-wrap">{job.additional_requirements}</p>
                  </div>
                </div>
              )}

              {/* Application Instructions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Apply</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">{job.application_instructions}</p>
                </div>
              </div>

              {/* Employer Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Posted by</h3>
                <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                  {job.employer_avatar_url ? (
                    <img
                      src={job.employer_avatar_url}
                      alt="Employer"
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
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 border-t pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleApplyClick}>
                Apply Now
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-gray-900">Apply for {job.title}</DialogTitle>
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