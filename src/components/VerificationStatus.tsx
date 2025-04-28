import React from 'react';
import { Badge } from './ui/badge';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

interface VerificationStatusProps {
  profile: {
    is_verified: boolean;
    verification_date: string | null;
    verification_document: string | null;
  } | null;
}

export function VerificationStatus({ profile }: VerificationStatusProps) {
  if (!profile) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      {profile.is_verified ? (
        <>
          <Badge variant="success" className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" />
            Verified
          </Badge>
          {profile.verification_date && (
            <span className="text-sm text-muted-foreground">
              Verified on {format(new Date(profile.verification_date), 'MMM d, yyyy')}
            </span>
          )}
        </>
      ) : (
        <Badge variant="destructive" className="flex items-center gap-1">
          <ShieldAlert className="h-4 w-4" />
          Not Verified
        </Badge>
      )}
    </div>
  );
}