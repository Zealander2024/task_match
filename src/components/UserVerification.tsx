import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from './ui/button';
import { Loader2, Shield, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';
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

export function UserVerification() {
  const { user } = useAuth();
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);

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
      validationErrors.push('Document does not appear to be an NBI Clearance');
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

  const handleExtract = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file first');
      return;
    }

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
        await updateVerificationStatus(false);
      }

    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error('Failed to process document');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }, [selectedFile, userProfile]);

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
              
              <div className="space-y-2 mt-4">
                {extractedData.validationResult.nbiNumber && (
                  <p className="text-sm">NBI Number: {extractedData.validationResult.nbiNumber}</p>
                )}
                {extractedData.validationResult.dateIssued && (
                  <p className="text-sm">Date Issued: {extractedData.validationResult.dateIssued}</p>
                )}
                {extractedData.validationResult.dateExpiry && (
                  <p className="text-sm">Valid Until: {extractedData.validationResult.dateExpiry}</p>
                )}
                
                {extractedData.validationResult.validationErrors.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">Validation Errors:</p>
                    <ul className="list-disc list-inside text-sm text-red-700">
                      {extractedData.validationResult.validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
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
                  Pages processed: {extractedData.pageCount}
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
      </div>
    </div>
  );
}


