import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from './ui/button';
import { supabase } from '../services/supabase';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

import { useAuth } from '../context/AuthContext';

const applicationSchema = z.object({
  email: z.string().email('Invalid email address'),
  contact_number: z.string().min(10, 'Contact number must be at least 10 digits'),
  cover_letter: z.string().min(100, 'Cover letter must be at least 100 characters'),
  resume: z.any().refine((file) => file !== null, 'Resume is required'),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface JobApplicationFormProps {
  jobId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

import { useNavigate } from 'react-router-dom';

export function JobApplicationForm({ jobId, onSuccess, onCancel }: JobApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      email: user?.email || '',
      contact_number: '',
      cover_letter: '',
      resume: null,
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    try {
      setIsSubmitting(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if user has already applied
      const { data: existingApplication, error: checkError } = await supabase
        .from('job_applications')
        .select('id')
        .eq('job_post_id', jobId)
        .eq('job_seeker_id', user.id)
        .single();

      if (existingApplication) {
        toast({
          title: "Already Applied",
          description: "You have already submitted an application for this job.",
          variant: "destructive",
        });
        return;
      }

      // Ensure job seeker profile exists
      const { error: profileError } = await supabase.rpc('ensure_job_seeker_profile', {
        user_id: user.id
      });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      // Upload resume if provided
      let resumeUrl = null;
      if (data.resume) {
        const fileExt = data.resume.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, data.resume);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);

        resumeUrl = publicUrl;
      }

      // Create application
      // Create minimal application payload with only required columns
      // Update the application payload to include email and contact_number
      const applicationPayload = {
        job_post_id: jobId,
        job_seeker_id: user.id,
        cover_letter: data.cover_letter,
        resume_url: resumeUrl,
        email: data.email, // Add email
        contact_number: data.contact_number, // Add contact number
        status: 'pending'
      };

      // Modify the application insertion to capture the response
      const { data: insertedApplication, error: applicationError } = await supabase
        .from('job_applications')
        .insert(applicationPayload)
        .select()
        .single();
      
      if (applicationError) {
        throw applicationError;
      }
      
      // After successful application submission
      // Add this before creating the notification
      const { data: jobPost, error: jobPostError } = await supabase
        .from('job_posts')
        .select('id, employer_id')
        .eq('id', jobId)
        .single();
      
      if (jobPostError || !jobPost) {
        throw new Error('Failed to fetch job post details');
      }
      
      // Then create the notification with more details
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: jobPost.employer_id,
          type: 'new_application',
          message: `New application received from ${user.user_metadata?.full_name || 'an applicant'} for "${jobPost.title || `Job #${jobId}`}"`,
          metadata: {
            job_post_id: jobId,
            application_id: insertedApplication.id,
            applicant_id: user.id,
            applicant_name: user.user_metadata?.full_name || 'Applicant',
            applicant_email: data.email,
            contact_number: data.contact_number,
            resume_url: resumeUrl
          },
          read: false
        });

      if (notificationError) {
        console.error('Notification error:', notificationError);
      }

      toast({
        title: "Success!",
        description: "Your application has been submitted successfully.",
      });
      onSuccess();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Number</FormLabel>
              <FormControl>
                <Input type="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cover_letter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Letter</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write your cover letter here..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="resume"
          render={({ field: { onChange, value, ...field } }) => (
            <FormItem>
              <FormLabel>Resume</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    onChange(file || null);
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </Form>
  );
}