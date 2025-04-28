import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from './ui/button';
import { Loader2, Shield, ShieldCheck, ShieldAlert, FileText, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface NBIValidationResult {
  isValid: boolean;
  nameMatch: boolean;
  nbiNumber: string | null;
  dateIssued: string | null;
  dateExpiry: string | null;
  validationErrors: string[];
}

interface ExtractedData {
  text: string;
  pageCount: number;
  metadata?: any;
  validationResult?: NBIValidationResult;
}

interface AdminVerificationRequest {
  user_id: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  admin_notes?: string;
}

export function UserVerification() {
  const { user } = useAuth();
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);
  const [adminVerificationStatus, setAdminVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [adminVerificationId, setAdminVerificationId] = useState<string | null>(null);

  // Fetch user profile for name matching
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setUserProfile(data);
    };

    fetchUserProfile();
  }, [user]);

  // NBI Clearance validation patterns
  const nbiPatterns = {
    nbiNumber: /NBI\s*(?:No\.|Number|Clearance)\s*[:.]?\s*([A-Z0-9-]+)/i,
    dateIssued: /(?:Date\s*(?:of)?\s*Issue|Issued\s*on)\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    dateExpiry: /(?:Valid\s*Until|Expiry\s*Date)\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    namePattern: /NAME\s*[:.]?\s*([A-Z\s,.-]+)/i,
  };

  const validateNBIClearance = (text: string): NBIValidationResult => {
    const validationErrors: string[] = [];
    const result: NBIValidationResult = {
      isValid: false,
      nameMatch: false,
      nbiNumber: null,
      dateIssued: null,
      dateExpiry: null,
      validationErrors: [],
    };

    // Check if it contains key NBI Clearance indicators
    if (!text.match(/NATIONAL\s+BUREAU\s+OF\s+INVESTIGATION/i)) {
      validationErrors.push('Document does not appear to be an NBI Clearance or not edited text pdf file make sure the document is can edited text pdf file');
      result.validationErrors = validationErrors;
      return result;
    } 

    // Extract NBI Number
    const nbiMatch = text.match(nbiPatterns.nbiNumber);
    result.nbiNumber = nbiMatch ? nbiMatch[1] : null;
    if (!result.nbiNumber) {
      validationErrors.push('NBI Number not found');
    }

    // Extract dates
    const issuedMatch = text.match(nbiPatterns.dateIssued);
    result.dateIssued = issuedMatch ? issuedMatch[1] : null;
    if (!result.dateIssued) {
      validationErrors.push('Issue date not found');
    }

    const expiryMatch = text.match(nbiPatterns.dateExpiry);
    result.dateExpiry = expiryMatch ? expiryMatch[1] : null;
    if (!result.dateExpiry) {
      validationErrors.push('Expiry date not found');
    }

    // Name matching
    if (userProfile?.full_name) {
      const nameMatch = text.match(nbiPatterns.namePattern);
      if (nameMatch) {
        const nbiName = nameMatch[1].trim().toLowerCase();
        const profileName = userProfile.full_name.toLowerCase();
        
        // Flexible name matching (handles different name formats)
        const nbiNameParts = nbiName.split(/[\s,]+/).filter(Boolean);
        const profileNameParts = profileName.split(/[\s,]+/).filter(Boolean);
        
        // Check if all profile name parts are present in NBI name
        result.nameMatch = profileNameParts.every(namePart => 
          nbiNameParts.some(nbiPart => nbiPart.includes(namePart))
        );

        if (!result.nameMatch) {
          validationErrors.push('Name on NBI Clearance does not match profile name');
        }
      } else {
        validationErrors.push('Name not found on document');
      }
    }

    result.validationErrors = validationErrors;
    result.isValid = validationErrors.length === 0;

    return result;
  };

  const updateVerificationStatus = async (isVerified: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: isVerified,
          verification_date: isVerified ? new Date().toISOString() : null,
          verification_document: isVerified ? extractedData?.validationResult?.nbiNumber : null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(isVerified ? 'Account verified successfully' : 'Verification failed');
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast.error('Failed to update verification status');
    }
  };

  // Add function to upload document to Supabase storage
  const uploadDocumentForAdminReview = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      // Create a more organized file structure
      const fileName = `verification-docs/${user.id}/${Date.now()}-nbi.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL for admin review
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error; // Let the calling function handle the error
    }
  };

  // Add function to create admin verification request
  const createAdminVerificationRequest = async (documentUrl: string) => {
    if (!user) return;

    try {
      // Check if there's already a pending request
      const { data: existingRequest } = await supabase
        .from('admin_verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        toast.error('You already have a pending verification request');
        return;
      }

      const { data, error } = await supabase
        .from('admin_verification_requests')
        .insert({
          user_id: user.id,
          document_url: documentUrl,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setAdminVerificationId(data.id);
      setAdminVerificationStatus('pending');
      toast.success('Document submitted for admin review');
    } catch (error) {
      console.error('Error creating admin verification request:', error);
      throw error; // Let the calling function handle the error
    }
  };

  const handleExtract = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setStatus('Reading file...');
      setExtractedData(null);

      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        setStatus(`Processing page ${pageNum} of ${pdfDoc.numPages}...`);
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      const validationResult = validateNBIClearance(fullText);
      
      setExtractedData({
        text: fullText,
        pageCount: pdfDoc.numPages,
        validationResult
      });

      if (validationResult.isValid && validationResult.nameMatch) {
        await updateVerificationStatus(true);
      } else {
        // Don't upload here anymore, just set status to none so user can choose to submit for review
        setAdminVerificationStatus('none');
      }

    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error('Failed to process document');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }, [selectedFile, userProfile]);

  const handleSubmitForAdminReview = async () => {
    if (!selectedFile || !user) return;

    try {
      setLoading(true);
      setStatus('Uploading document...');

      // 1. Upload file to Supabase storage bucket
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `verification-docs/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      // 3. Create verification request for admin review
      const { error: requestError } = await supabase
        .from('admin_verification_requests')
        .insert({
          user_id: user.id,
          document_url: publicUrl,
          status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (requestError) throw requestError;

      // 4. Update UI and show success message
      setAdminVerificationStatus('pending');
      setSelectedFile(null);
      toast.success('Document submitted for admin review');

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to submit document for review');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  // Add useEffect to check for existing admin verification requests
  useEffect(() => {
    const checkExistingRequests = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setAdminVerificationId(data.id);
        setAdminVerificationStatus(data.status);
      }
    };

    checkExistingRequests();
  }, [user]);

  // Add subscription to admin verification updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('admin-verification-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_verification_requests',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newStatus = payload.new.status;
          setAdminVerificationStatus(newStatus as 'pending' | 'approved' | 'rejected');

          if (newStatus === 'approved') {
            await updateVerificationStatus(true);
            toast.success('Your document has been verified by an admin');
          } else if (newStatus === 'rejected') {
            toast.error('Your document verification was rejected. Please submit a new document.');
            // Reset states to allow new submission
            setSelectedFile(null);
            setExtractedData(null);
            setAdminVerificationStatus('none');
            setAdminVerificationId(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Add this new function to check existing verification status
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user) return;

      try {
        // Check if user is already verified
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', user.id)
          .single();

        if (profile?.is_verified) {
          setAdminVerificationStatus('approved');
          return;
        }

        // Check for existing verification request
        const { data: request } = await supabase
          .from('admin_verification_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single();

        if (request) {
          setAdminVerificationId(request.id);
          setAdminVerificationStatus(request.status);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkVerificationStatus();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">NBI Clearance Verification</h2>
      </div>

      <div className="space-y-6">
        <div className="p-6 border rounded-lg bg-white shadow-sm">
          <p className="text-sm text-gray-600 mb-4">
            Please upload your NBI Clearance to verify your identity. The document should be in PDF format.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.type === 'application/pdf') {
                  setSelectedFile(file);
                  setExtractedData(null);
                } else {
                  toast.error('Please upload a PDF file');
                }
              }}
              disabled={loading}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-violet-50 file:text-violet-700
                hover:file:bg-violet-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button
              onClick={handleExtract}
              disabled={!selectedFile || loading}
              className="min-w-[120px] whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Document'
              )}
            </Button>
          </div>
        </div>

        {loading && status && (
          <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-lg">
            <div className="flex items-center">
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
              {status}
            </div>
          </div>
        )}

        {extractedData?.validationResult && (
          <div className="mt-6 bg-white shadow-lg rounded-xl border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                {extractedData.validationResult.isValid && extractedData.validationResult.nameMatch ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                )}
                <h4 className="text-lg font-semibold">
                  Verification Result
                </h4>
              </div>
              
              <div className="space-y-2">
                {extractedData.validationResult.validationErrors.map((error, index) => (
                  <p key={index} className="text-sm text-red-600">
                    • {error}
                  </p>
                ))}
                
                {extractedData.validationResult.nbiNumber && (
                  <p className="text-sm text-gray-600">
                    NBI Number: {extractedData.validationResult.nbiNumber}
                  </p>
                )}
                
                {extractedData.validationResult.dateIssued && (
                  <p className="text-sm text-gray-600">
                    Date Issued: {extractedData.validationResult.dateIssued}
                  </p>
                )}
                
                {extractedData.validationResult.dateExpiry && (
                  <p className="text-sm text-gray-600">
                    Valid Until: {extractedData.validationResult.dateExpiry}
                  </p>
                )}
              </div>
            </div>

            {/* Add the full extracted text section */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <h4 className="text-lg font-semibold">Extracted Text</h4>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-2">
                  Pages processed...: {extractedData.pageCount}
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {extractedData.text}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {extractedData?.validationResult?.validationErrors.length > 0 && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-red-600">AI Validation Errors</h4>
              <ul className="list-disc list-inside text-sm text-red-700 mt-2">
                {extractedData.validationResult.validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>

            {adminVerificationStatus === 'none' && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  Would you like to submit this document for manual review by our admin team?
                </p>
                <Button
                  onClick={handleSubmitForAdminReview}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit for Admin Review'
                  )}
                </Button>
              </div>
            )}

            {adminVerificationStatus === 'pending' && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                  <p className="text-sm text-yellow-700">
                    Your document is being reviewed by our admin team. We'll notify you once the review is complete.
                  </p>
                </div>
              </div>
            )}

            {adminVerificationStatus === 'rejected' && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700 mb-2">
                  Your document was rejected by our admin team. Please submit a new document.
                </p>
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setExtractedData(null);
                    setAdminVerificationStatus('none');
                    setAdminVerificationId(null);
                  }}
                  variant="destructive"
                >
                  Upload New Document
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}





