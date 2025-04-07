-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('application', 'system')),
    read BOOLEAN NOT NULL DEFAULT false,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to create notification for new application
CREATE OR REPLACE FUNCTION public.handle_new_application()
RETURNS trigger AS $$
DECLARE
    employer_id UUID;
BEGIN
    -- Get the employer_id from the job post
    SELECT employer_id INTO employer_id
    FROM job_posts
    WHERE id = NEW.job_post_id;

    -- Create notification for the employer
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
        employer_id,
        'New Job Application',
        'A new application has been submitted for your job posting',
        'application',
        jsonb_build_object(
            'application_id', NEW.id,
            'job_post_id', NEW.job_post_id,
            'job_seeker_id', NEW.job_seeker_id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new applications
CREATE TRIGGER on_new_application
    AFTER INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_application();

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE notifications
    SET read = true,
        updated_at = NOW()
    WHERE id = notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS void AS $$
BEGIN
    UPDATE notifications
    SET read = true,
        updated_at = NOW()
    WHERE user_id = auth.uid()
    AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 