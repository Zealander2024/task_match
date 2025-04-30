import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Building2, MapPin, Clock, DollarSign } from 'lucide-react';

interface JobCardProps {
  job: any;
  onApply: () => void;
}

export function JobCard({ job, onApply }: JobCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
          
          <div className="flex items-center gap-4 mt-2 text-gray-600">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{job.employer?.company_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>₱{job.salary_min.toLocaleString()} - ₱{job.salary_max.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary">{job.job_type}</Badge>
            <Badge variant="secondary">{job.experience_level}</Badge>
            {job.is_remote && <Badge>Remote</Badge>}
          </div>

          <p className="mt-4 text-gray-600 line-clamp-3">{job.description}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {job.required_skills.map((skill: string) => (
              <Badge key={skill} variant="outline">{skill}</Badge>
            ))}
          </div>
        </div>

        <div className="ml-6 flex flex-col items-end">
          <Button onClick={onApply} className="min-w-[100px]">
            Apply Now
          </Button>
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <time dateTime={job.created_at}>
              {new Date(job.created_at).toLocaleDateString()}
            </time>
          </div>
        </div>
      </div>
    </div>
  );
}