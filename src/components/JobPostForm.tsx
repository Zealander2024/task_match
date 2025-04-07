import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, DollarSign, MapPin, Clock, Calendar, FileText, CreditCard,
  CheckCircle2, XCircle, ArrowRight, ArrowLeft, Plus, X, Tag, Building2,
  Upload, Image as ImageIcon, User
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface JobPostFormProps {
  onSuccess?: () => void;
}

type FormStep = 'basic' | 'company' | 'details' | 'requirements' | 'preview';

export function JobPostForm({ onSuccess }: JobPostFormProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    budget: '',
    location: '',
    required_skills: [] as string[],
    experience_level: '',
    work_schedule: '',
    additional_requirements: '',
    application_instructions: '',
    job_type: '',
    start_date: '',
    end_date: '',
    payment_method: '',
    company_name: '',
    company_logo_url: '',
    employer_avatar_url: '',
    employer_email: '',
  });

  useEffect(() => {
    async function fetchEmployerProfile() {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('avatar_url, email')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile) {
          setFormData(prev => ({
            ...prev,
            employer_avatar_url: profile.avatar_url || '',
            employer_email: profile.email || '',
          }));
        }
      } catch (err) {
        console.error('Error fetching employer profile:', err);
      }
    }

    fetchEmployerProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      description: value
    }));
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSkill.trim()) {
      e.preventDefault();
      setSkills(prev => [...prev, newSkill.trim()]);
      setFormData(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(skill => skill !== skillToRemove));
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Prepare the job post data
      const jobPostData = {
        ...formData,
        employer_id: user.id,
        status: 'active',
        created_at: new Date().toISOString(),
        required_skills: formData.required_skills || [],
        description: formData.description.replace(/<[^>]*>/g, ''), // Strip HTML tags
        employer_avatar_url: formData.employer_avatar_url,
        employer_email: formData.employer_email,
        company_name: formData.company_name,
        company_logo_url: formData.company_logo_url,
        title: formData.title,
        category: formData.category,
        budget: formData.budget,
        location: formData.location,
        experience_level: formData.experience_level,
        work_schedule: formData.work_schedule,
        additional_requirements: formData.additional_requirements,
        application_instructions: formData.application_instructions,
        job_type: formData.job_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        payment_method: formData.payment_method,
      };

      // Insert the job post
      const { error: insertError } = await supabase
        .from('job_posts')
        .insert([jobPostData]);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create job post');
      }

      setSuccess(true);
      setFormData({
        title: '',
        category: '',
        description: '',
        budget: '',
        location: '',
        required_skills: [],
        experience_level: '',
        work_schedule: '',
        additional_requirements: '',
        application_instructions: '',
        job_type: '',
        start_date: '',
        end_date: '',
        payment_method: '',
        company_name: '',
        company_logo_url: '',
        employer_avatar_url: '',
        employer_email: '',
      });
      setSkills([]);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error posting job:', err);
      setError(err instanceof Error ? err.message : 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'company', label: 'Company Info' },
    { id: 'details', label: 'Job Details' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'preview', label: 'Preview' },
  ];

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === step.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="w-24 h-1 mx-2 bg-gray-200" />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {steps.map(step => (
          <span
            key={step.id}
            className={`text-sm ${
              currentStep === step.id ? 'text-blue-600 font-medium' : 'text-gray-500'
            }`}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Job Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., Senior Frontend Developer"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Job Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select a category</option>
          <option value="Information Technology (IT)">Information Technology (IT)</option>
          <option value="Software Development">Software Development</option>
          <option value="Web Development">Web Development</option>
          <option value="Mobile Development">Mobile Development</option>
          <option value="UI/UX Design">UI/UX Design</option>
          <option value="Project Management">Project Management</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Job Description
        </label>
        <div className="mt-1">
          <ReactQuill
            value={formData.description}
            onChange={handleDescriptionChange}
            className="h-48 mb-12"
            modules={{
              toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'clean']
              ]
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderCompanyInfo = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
          Company Name
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="company_name"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            required
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter your company name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="company_logo_url" className="block text-sm font-medium text-gray-700">
          Company Logo URL
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <ImageIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="url"
            id="company_logo_url"
            name="company_logo_url"
            value={formData.company_logo_url}
            onChange={handleChange}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="https://example.com/logo.png"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Enter a direct URL to your company logo image
        </p>
      </div>
    </div>
  );

  const renderJobDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
            Budget
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              required
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., Php 1,500 per hour"
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., Remote (Makati City, optional office)"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="job_type" className="block text-sm font-medium text-gray-700">
            Job Type
          </label>
          <select
            id="job_type"
            name="job_type"
            value={formData.job_type}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select job type</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Freelance">Freelance</option>
          </select>
        </div>

        <div>
          <label htmlFor="work_schedule" className="block text-sm font-medium text-gray-700">
            Work Schedule
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="work_schedule"
              name="work_schedule"
              value={formData.work_schedule}
              onChange={handleChange}
              required
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., Flexible, 40 hours/week"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderRequirements = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700">
          Experience Level
        </label>
        <select
          id="experience_level"
          name="experience_level"
          value={formData.experience_level}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select experience level</option>
          <option value="Entry Level">Entry Level</option>
          <option value="Mid Level">Mid Level</option>
          <option value="Senior">Senior</option>
          <option value="Lead">Lead</option>
          <option value="Manager">Manager</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Required Skills
        </label>
        <div className="mt-1">
          <div className="flex flex-wrap gap-2 mb-2">
            {skills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={handleAddSkill}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Add a skill and press Enter"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="additional_requirements" className="block text-sm font-medium text-gray-700">
          Additional Requirements
        </label>
        <textarea
          id="additional_requirements"
          name="additional_requirements"
          value={formData.additional_requirements}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., Experience with state management (Redux/Context) and unit testing..."
        />
      </div>

      <div>
        <label htmlFor="application_instructions" className="block text-sm font-medium text-gray-700">
          Application Instructions
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="application_instructions"
            name="application_instructions"
            value={formData.application_instructions}
            onChange={handleChange}
            required
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Submit a portfolio or GitHub link with your resume"
          />
        </div>
      </div>

      <div>
        <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
          Payment Method
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            id="payment_method"
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            required
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Bank Transfer or PayPal"
          />
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          {formData.company_logo_url ? (
            <img
              src={formData.company_logo_url}
              alt={formData.company_name}
              className="h-12 w-12 object-contain rounded-lg border border-gray-200"
            />
          ) : (
            <div className="h-12 w-12 flex items-center justify-center bg-gray-100 rounded-lg">
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{formData.company_name}</h3>
            <p className="text-lg font-medium text-gray-900">{formData.title}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4 pt-4 border-t border-gray-200">
          {formData.employer_avatar_url ? (
            <img
              src={formData.employer_avatar_url}
              alt="Employer"
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">Posted by</p>
            <p className="text-sm text-gray-500">{formData.employer_email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center text-sm text-gray-500">
            <Briefcase className="h-4 w-4 mr-2" />
            {formData.category}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <DollarSign className="h-4 w-4 mr-2" />
            {formData.budget}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-2" />
            {formData.location}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-2" />
            {formData.work_schedule}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            {formData.start_date} - {formData.end_date}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-3">Job Description</h4>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: formData.description }} />
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-3">Requirements</h4>
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700">Experience Level</h5>
            <p className="text-sm text-gray-500">{formData.experience_level}</p>
          </div>
          <div>
            <h5 className="text-sm font-medium text-gray-700">Required Skills</h5>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.required_skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h5 className="text-sm font-medium text-gray-700">Additional Requirements</h5>
            <p className="text-sm text-gray-500">{formData.additional_requirements}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-3">Application Details</h4>
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700">Application Instructions</h5>
            <p className="text-sm text-gray-500">{formData.application_instructions}</p>
          </div>
          <div>
            <h5 className="text-sm font-medium text-gray-700">Payment Method</h5>
            <p className="text-sm text-gray-500">{formData.payment_method}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderStepIndicator()}

      <div className="bg-white shadow-sm rounded-lg p-6">
        {currentStep === 'basic' && renderBasicInfo()}
        {currentStep === 'company' && renderCompanyInfo()}
        {currentStep === 'details' && renderJobDetails()}
        {currentStep === 'requirements' && renderRequirements()}
        {currentStep === 'preview' && renderPreview()}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">Job posted successfully!</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        {currentStep !== 'basic' && (
          <button
            type="button"
            onClick={() => setCurrentStep(steps[steps.findIndex(s => s.id === currentStep) - 1].id as FormStep)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>
        )}
        {currentStep !== 'preview' ? (
          <button
            type="button"
            onClick={() => setCurrentStep(steps[steps.findIndex(s => s.id === currentStep) + 1].id as FormStep)}
            className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        )}
      </div>
    </form>
  );
} 