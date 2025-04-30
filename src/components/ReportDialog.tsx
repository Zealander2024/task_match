import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from './ui/use-toast';
import { AlertTriangle } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetType: 'user' | 'job' | 'message';
  targetName: string;
}

const reportReasons = {
  user: [
    'Fake profile',
    'Inappropriate behavior',
    'Harassment',
    'Spam',
    'Misleading information',
    'Other'
  ],
  job: [
    'Fraudulent job posting',
    'Discriminatory requirements',
    'Misleading job description',
    'Spam',
    'Inappropriate content',
    'Other'
  ],
  message: [
    'Harassment',
    'Inappropriate content',
    'Spam',
    'Threatening language',
    'Scam attempt',
    'Other'
  ]
};

export function ReportDialog({ open, onOpenChange, targetId, targetType, targetName }: ReportDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a report",
        variant: "destructive"
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Error",
        description: "Please select a reason for your report",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          target_id: targetId,
          target_type: targetType,
          reason: reason,
          details: details,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Report Submitted",
        description: "Thank you for your report. Our team will review it shortly.",
      });

      // Reset form and close dialog
      setReason('');
      setDetails('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Report {targetType === 'user' ? 'User' : targetType === 'job' ? 'Job Post' : 'Message'}
          </DialogTitle>
          <DialogDescription>
            {targetType === 'user' 
              ? `Report inappropriate behavior or content from ${targetName || 'this user'}.`
              : targetType === 'job'
                ? `Report issues with the job posting "${targetName || 'this job'}".`
                : `Report inappropriate content in this message.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for report</Label>
            <RadioGroup 
              id="reason" 
              value={reason} 
              onValueChange={setReason}
              className="space-y-2"
            >
              {reportReasons[targetType].map((reportReason) => (
                <div key={reportReason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reportReason} id={reportReason.replace(/\s+/g, '-').toLowerCase()} />
                  <Label htmlFor={reportReason.replace(/\s+/g, '-').toLowerCase()}>{reportReason}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Please provide any additional information that might help us understand the issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !reason}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}