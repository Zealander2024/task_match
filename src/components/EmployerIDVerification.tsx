import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { Button } from './ui/button';
import { Loader2, Shield, ShieldCheck, ShieldAlert, FileText, Upload, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import {
  ToggleGroup,
  ToggleGroupItem
} from './ui/toggle-group';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface PhilippineIDValidationResult {
  isValid: boolean;
  nameMatch: boolean;
  idType: string | null;
  idNumber: string | null;
  dateIssued: string | null;
  dateExpiry: string | null;
  validationErrors: string[];
  debug?: any;
}

interface ExtractedData {
  text: string;
  pageCount: number;
  metadata?: any;
  debug?: any;
  validationResult?: PhilippineIDValidationResult;
}

interface AdminVerificationRequest {
  employer_id: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  admin_notes?: string;
}

// Extraction method types
type ExtractionMethod = 'pdfjs' | 'ocr';

// Philippine ID types
const PHILIPPINE_ID_TYPES = [
  'PhilID/National ID',
  'Driver\'s License',
  'Passport',
  'UMID',
  'SSS ID',
  'PRC ID',
  'Postal ID',
  'Voter\'s ID',
  'TIN ID',
  'PhilHealth ID',
  'Company ID',
  'Other Government ID'
];

// Create a separate function for the image handling outside of the block
const handleImageWithOCR = async (file: File, setStatus: React.Dispatch<React.SetStateAction<string>>, setFilePreviewUrl: React.Dispatch<React.SetStateAction<string | null>>): Promise<{text: string, pageCount: number, debug?: any}> => {
  setStatus('Processing image with enhanced OCR...');
  
  // Create URL for the image preview
  const imageUrl = URL.createObjectURL(file);
  setFilePreviewUrl(imageUrl);
  
  // Create an image element for preprocessing
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  
  // Wait for the image to load
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = imageUrl;
  });
  
  // Create canvas for preprocessing
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) {
    throw new Error('Could not create canvas context for image preprocessing');
  }
  
  // Draw the image and apply preprocessing
  ctx.drawImage(img, 0, 0);
  let debugInfo = [];
  
  try {
    // Apply advanced preprocessing similar to PDF processing
    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Step 1: Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
      // Weighted grayscale conversion
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    
    // Step 2: Calculate histogram for adaptive thresholding
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      histogram[Math.floor(data[i])]++;
    }
    
    // Step 3: Find the optimal threshold using Otsu's method
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;
    const total = data.length / 4;
    
    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      
      wF = total - wB;
      if (wF === 0) break;
      
      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      
      const variance = wB * wF * Math.pow(mB - mF, 2);
      
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }
    
    // Step 4: Apply adaptive thresholding and increase contrast
    for (let i = 0; i < data.length; i += 4) {
      // Apply threshold with a small bias to enhance text
      const val = data[i] < (threshold + 10) ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    
    ctx.putImageData(imageData, 0, 0);
  } catch (preprocessingError) {
    console.warn('Advanced image preprocessing failed, reverting to basic preprocessing:', preprocessingError);
    
    // Fall back to simple thresholding if advanced fails
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simple contrast enhancement
      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale with improved contrast
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const newVal = avg > 140 ? 255 : 0; // Thresholding
        
        data[i] = newVal;     // r
        data[i + 1] = newVal; // g
        data[i + 2] = newVal; // b
      }
      
      ctx.putImageData(imageData, 0, 0);
    } catch (basicError) {
      console.error('Basic preprocessing also failed:', basicError);
    }
  }
  
  // Get the processed image data
  const processedImageUrl = canvas.toDataURL('image/png');
  setFilePreviewUrl(processedImageUrl);
  
  // Set a timeout to prevent OCR from hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('OCR timed out')), 60000); // 60 second timeout
  });
  
  try {
    // Initialize Tesseract with advanced settings and progress reporting
    const worker = await createWorker('eng', 1, {
      logger: progress => {
        if (progress.status === 'recognizing text') {
          setStatus(`OCR progress: ${Math.round(progress.progress * 100)}%`);
        }
      }
    });
    
    // Advanced configuration for Tesseract
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/.:,\'() ',
      tessjs_create_hocr: '0',
      tessjs_create_tsv: '0',
      // Use string values to avoid type errors
      tessedit_ocr_engine_mode: '3', // Use LSTM engine only for better accuracy
      tessedit_pageseg_mode: '6', // Assume uniform block of text
      textord_heavy_nr: '1', // Heavy noise removal
      textord_min_linesize: '3.0', // Helps with smaller text
    });
    
    // Extract text with timeout
    const { data } = await Promise.race([
      worker.recognize(canvas),
      timeoutPromise
    ]) as any;
    
    const extractedText = data.text;
    
    // Store debug data
    debugInfo.push({
      page: 1,
      text: data.text,
      confidence: data.confidence,
      wordConfidences: data.words ? data.words.map(w => ({ word: w.text, confidence: w.confidence })) : []
    });
    
    // Clean up
    await worker.terminate();
    
    return {
      text: extractedText,
      pageCount: 1,
      debug: debugInfo
    };
  } catch (ocrError) {
    console.error('OCR processing error:', ocrError);
    throw ocrError;
  }
};

function extractTextWithOCR(setStatus: React.Dispatch<React.SetStateAction<string>>, setFilePreviewUrl: React.Dispatch<React.SetStateAction<string | null>>) {
  return async (file: File): Promise<{text: string, pageCount: number, debug?: any}> => {
    // For images, we use the separate handler
    if (file.type.startsWith('image/')) {
      return handleImageWithOCR(file, setStatus, setFilePreviewUrl);
    }
    
    // For PDFs
    let extractedText = '';
    let pageCount = 1;
    let debugData = [];
    
    try {
      if (file.type === 'application/pdf') {
        // For PDFs, we need to convert each page to an image first
        setStatus('Converting PDF to images for OCR processing...');
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        
        pageCount = pdfDoc.numPages;
        extractedText = '';
        
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          setStatus(`Processing PDF page ${pageNum} of ${pdfDoc.numPages} with OCR...`);
          
          try {
            // Render the PDF page to a canvas with improved resolution
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 4.0 }); // Increased scale for better quality
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            
            if (!context) {
              throw new Error('Could not create canvas context for OCR processing');
            }
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
            
            // Apply image preprocessing (same as in the image handler)
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Convert to grayscale and apply threshold
            for (let i = 0; i < data.length; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              const val = gray < 140 ? 0 : 255;
              data[i] = val;
              data[i + 1] = val;
              data[i + 2] = val;
            }
            
            context.putImageData(imageData, 0, 0);
            
            // Show the preprocessed image
            if (pageNum === 1) {
              const imageUrl = canvas.toDataURL('image/png');
              setFilePreviewUrl(imageUrl);
            }
            
            // Initialize worker for OCR
            const worker = await createWorker('eng', 1, {
              logger: progress => {
                if (progress.status === 'recognizing text') {
                  setStatus(`OCR page ${pageNum}: ${Math.round(progress.progress * 100)}%`);
                }
              }
            });
            
            // Set optimal parameters for ID card recognition
            await worker.setParameters({
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/.:,\'() ',
              tessedit_ocr_engine_mode: '3',
              tessedit_pageseg_mode: '6',
            });
            
            // Extract text with timeout
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('OCR timed out')), 60000);
            });
            
            const { data: ocrData } = await Promise.race([
              worker.recognize(canvas),
              timeoutPromise
            ]) as any;
            
            extractedText += ocrData.text + '\n';
            
            // Add to debug data
            debugData.push({
              page: pageNum,
              text: ocrData.text,
              confidence: ocrData.confidence
            });
            
            // Clean up worker
            await worker.terminate();
          } catch (pageError) {
            console.error(`Error processing page ${pageNum}:`, pageError);
            extractedText += `[Error processing page ${pageNum}]\n`;
          }
        }
      } else {
        throw new Error('Unsupported file type for OCR');
      }
      
      return {
        text: extractedText,
        pageCount,
        debug: debugData
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw error;
    }
  };
}

// Function to extract text from PDF using PDF.js
const extractTextWithPdfJs = async (file: File): Promise<{text: string, pageCount: number}> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  let extractedText = '';
  
  // Set page count
  const pageCount = pdfDoc.numPages;
  
  // Extract text from each page
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.map((item: any) => item.str).join(' ');
    extractedText += textItems + '\n';
  }
  
  return {
    text: extractedText,
    pageCount
  };
};

// Function to validate Philippine IDs
const validatePhilippineID = (text: string, employerProfile?: { full_name: string } | null): PhilippineIDValidationResult => {
  const validationErrors = [];
  let isValid = true;
  let nameMatch = false;
  let idType = null;
  let idNumber = null;
  let dateIssued = null;
  let dateExpiry = null;
  
  // Convert text to lowercase for case-insensitive matching
  const lowercaseText = text.toLowerCase();
  
  // Debug data
  const debug = { extractedText: text, lowercaseText, patterns: [] };
  
  // Check if any ID type words are present
  const idTypeDetected = PHILIPPINE_ID_TYPES.find(type => 
    lowercaseText.includes(type.toLowerCase())
  );
  
  if (idTypeDetected) {
    idType = idTypeDetected;
  } else {
    // Check common ID indicators
    if (lowercaseText.includes('republic of the philippines')) {
      if (lowercaseText.includes('driver') && lowercaseText.includes('license')) {
        idType = 'Driver\'s License';
      } else if (lowercaseText.includes('philhealth')) {
        idType = 'PhilHealth ID';
      } else if (lowercaseText.includes('sss') || lowercaseText.includes('social security')) {
        idType = 'SSS ID';
      } else if (lowercaseText.includes('passport')) {
        idType = 'Passport';
      } else if (lowercaseText.includes('unified multi-purpose') || lowercaseText.includes('umid')) {
        idType = 'UMID';
      } else if (lowercaseText.includes('postal')) {
        idType = 'Postal ID';
      } else if (lowercaseText.includes('philid') || lowercaseText.includes('national id') || lowercaseText.includes('philippine identification')) {
        idType = 'PhilID/National ID';
      } else if (lowercaseText.includes('voter') || lowercaseText.includes('comelec')) {
        idType = 'Voter\'s ID';
      } else if (lowercaseText.includes('tin') || lowercaseText.includes('taxpayer')) {
        idType = 'TIN ID';
      } else if (lowercaseText.includes('prc') || lowercaseText.includes('professional regulation')) {
        idType = 'PRC ID';
      } else {
        idType = 'Other Government ID';
      }
    } else {
      idType = 'Other Government ID';
    }
  }
  
  // Pattern for common ID numbers (adjust based on Philippine ID formats)
  const idNumberPatterns = [
    // PhilID/National ID (12 digits with format: NNNN-NNNN-NNNN or NNNNNNNNNNNN)
    /\b(\d{4}-\d{4}-\d{4}|\d{12})\b/g,
    
    // Driver's License (alphanumeric, usually with format like A01-23-456789)
    /\b([A-Z]\d{2}-\d{2}-\d{6})\b/g,
    
    // Passport (letter followed by 8 digits or P followed by 8-9 alphanumeric)
    /\b([A-Z]\d{8}|P[A-Z0-9]{8,9})\b/g,
    
    // SSS (10-digit number with format like 12-3456789-0)
    /\b(\d{2}-\d{7}-\d{1})\b/g,
    
    // TIN (12 digits with format: 123-456-789-012 or 123456789012)
    /\b(\d{3}-\d{3}-\d{3}-\d{3}|\d{12})\b/g,
    
    // UMID (12-digit CRN number or formatted with hyphens)
    /\b(CRN-\d{4}-\d{4}-\d{4}|\d{12})\b/gi,
    
    // PRC (7-digit with format like 1234567)
    /\b(\d{7})\b/g,
    
    // Any other sequence that looks like an ID number (4+ digits)
    /\b(\d{4,})\b/g
  ];
  
  // Check for ID number using patterns
  for (const pattern of idNumberPatterns) {
    const matches = [...text.matchAll(pattern)];
    debug.patterns.push({ pattern: pattern.toString(), matches });
    
    if (matches.length > 0) {
      // Use the first match as the ID number
      idNumber = matches[0][0];
      break;
    }
  }
  
  // Date patterns for issue and expiry
  const datePatterns = [
    // Common date formats (MM/DD/YYYY, MM-DD-YYYY, Month DD, YYYY)
    /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](19|20)\d{2}\b/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(0?[1-9]|[12][0-9]|3[01])(st|nd|rd|th)?,?\s+(19|20)\d{2}\b/gi,
    
    // Philippine common date format (DD-MM-YYYY)
    /\b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b/g
  ];
  
  // Check for dates
  const dates = [];
  for (const pattern of datePatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      matches.forEach(match => {
        dates.push(match[0]);
      });
    }
  }
  
  // Try to determine which dates are issue and expiry
  if (dates.length >= 2) {
    // Find date indicators
    const issuedIndicators = ['issued', 'issuance', 'date of issue', 'issue date'];
    const expiryIndicators = ['expiry', 'expiration', 'valid until', 'valid thru', 'date of expiry'];
    
    let issuedDate = null;
    let expiryDate = null;
    
    // Search for date indicators near dates
    for (const date of dates) {
      const dateContext = text.substring(Math.max(0, text.indexOf(date) - 50), 
                                         Math.min(text.length, text.indexOf(date) + 50));
      
      if (!issuedDate && issuedIndicators.some(indicator => dateContext.toLowerCase().includes(indicator))) {
        issuedDate = date;
      } else if (!expiryDate && expiryIndicators.some(indicator => dateContext.toLowerCase().includes(indicator))) {
        expiryDate = date;
      }
    }
    
    // If we couldn't determine which is which, assume the earlier date is issued
    if (!issuedDate && !expiryDate && dates.length >= 2) {
      // Sort dates chronologically
      const sortedDates = [...dates].map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
      issuedDate = dates.find(d => new Date(d).getTime() === sortedDates[0].getTime());
      expiryDate = dates.find(d => new Date(d).getTime() === sortedDates[sortedDates.length - 1].getTime());
    }
    
    dateIssued = issuedDate;
    dateExpiry = expiryDate;
  } else if (dates.length === 1) {
    // If only one date found, check context to determine if it's issue or expiry
    const dateContext = text.substring(Math.max(0, text.indexOf(dates[0]) - 50), 
                                     Math.min(text.length, text.indexOf(dates[0]) + 50));
    
    if (dateContext.toLowerCase().includes('expiry') || 
        dateContext.toLowerCase().includes('expiration') || 
        dateContext.toLowerCase().includes('valid until')) {
      dateExpiry = dates[0];
    } else {
      dateIssued = dates[0];
    }
  }
  
  // Check if ID has minimum required information
  if (!idType) {
    validationErrors.push('Could not determine ID type');
    isValid = false;
  }
  
  if (!idNumber) {
    validationErrors.push('Could not extract ID number');
    isValid = false;
  }
  
  if (!dateIssued && !dateExpiry) {
    validationErrors.push('Could not extract any dates from ID');
    // This is not a critical error, so we don't set isValid to false
  }
  
  // Name matching
  if (employerProfile && employerProfile.full_name) {
    // Try to find employer name in document
    const employerName = employerProfile.full_name.toLowerCase();
    const nameParts = employerName.split(' ').filter(part => part.length > 2);
    
    // Count how many name parts are found in the text
    const foundParts = nameParts.filter(part => lowercaseText.includes(part));
    
    // If more than half of name parts are found, consider it a match
    nameMatch = foundParts.length >= Math.ceil(nameParts.length / 2);
    
    if (!nameMatch) {
      validationErrors.push('Name on ID may not match employer profile');
      // This is a warning, not an error
    }
  }
  
  return {
    isValid,
    nameMatch,
    idType,
    idNumber,
    dateIssued,
    dateExpiry,
    validationErrors,
    debug
  };
};

// Function to calculate text similarity
function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();
  
  const track = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  const distance = track[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

export function EmployerIDVerification() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [showSubmitForReview, setShowSubmitForReview] = useState<boolean>(false);
  const [submitReviewLoading, setSubmitReviewLoading] = useState<boolean>(false);
  const [hasSubmittedReview, setHasSubmittedReview] = useState<boolean>(false);
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('ocr');
  const [employerProfile, setEmployerProfile] = useState<any>(null);
  const [selectedIdType, setSelectedIdType] = useState<string>('');
  
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user) return;
      
      try {
        // Fetch employer profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        setEmployerProfile(profile);
        
        // Check if already verified
        if (profile && profile.is_verified) {
          setVerified(true);
          return;
        }
        
        // Check for pending verification requests
        const { data: requests, error: requestsError } = await supabase
          .from('employer_verification_requests')
          .select('*')
          .eq('employer_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1);
        
        if (requestsError) throw requestsError;
        
        if (requests && requests.length > 0) {
          const latestRequest = requests[0];
          if (latestRequest.status === 'pending') {
            setHasSubmittedReview(true);
          } else if (latestRequest.status === 'approved') {
            // Update verification status if request is approved but profile not updated
            if (!profile.is_verified) {
              await updateVerificationStatus(true);
            }
            setVerified(true);
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        toast.error('Failed to check verification status');
      }
    };
    
    checkVerificationStatus();
  }, [user]);
  
  const updateVerificationStatus = async (isVerified: boolean) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_verified: isVerified,
          verification_date: isVerified ? new Date().toISOString() : null
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setVerified(isVerified);
      setEmployerProfile(prev => ({ ...prev, is_verified: isVerified, verification_date: new Date().toISOString() }));
      
      if (isVerified) {
        toast.success('Your ID has been verified!');
      }
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast.error('Failed to update verification status');
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFilePreviewUrl(URL.createObjectURL(selectedFile));
      setExtractedData(null);
      setStatus('');
      setShowSubmitForReview(false);
      
      // Try to determine ID type from filename
      const filename = selectedFile.name.toLowerCase();
      const detectedType = PHILIPPINE_ID_TYPES.find(type => 
        filename.includes(type.toLowerCase())
      );
      
      if (detectedType) {
        setSelectedIdType(detectedType);
      } else {
        setSelectedIdType('');
      }
    }
  };
  
  const processFile = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }
    
    setLoading(true);
    setStatus('Processing document...');
    
    try {
      let result: ExtractedData;
      
      if (extractionMethod === 'pdfjs' && file.type === 'application/pdf') {
        const { text, pageCount } = await extractTextWithPdfJs(file);
        result = { text, pageCount };
      } else {
        // Use OCR for images or PDFs (if chosen)
        const extract = extractTextWithOCR(setStatus, setFilePreviewUrl);
        const { text, pageCount, debug } = await extract(file);
        result = { text, pageCount, debug };
      }
      
      // Validate extracted text
      const validationResult = validatePhilippineID(result.text, employerProfile);
      result.validationResult = validationResult;
      
      setExtractedData(result);
      
      // Auto-select the detected ID type if we found one
      if (validationResult.idType && !selectedIdType) {
        setSelectedIdType(validationResult.idType);
      }
      
      // Auto verify if the ID is valid and name matches
      if (validationResult.isValid && validationResult.nameMatch) {
        // Auto verification
        await updateVerificationStatus(true);
      } else {
        // Show submit for review option if validation fails
        setShowSubmitForReview(true);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      setShowSubmitForReview(true);
      toast.error('Error processing document. You can submit for manual review.');
    } finally {
      setStatus('');
      setLoading(false);
    }
  };
  
  const handleSubmitForAdminReview = async () => {
    if (!file || !user) {
      toast.error('Please select a file first');
      return;
    }
    
    setSubmitReviewLoading(true);
    setStatus('Submitting for review...');
    
    try {
      // Upload ID to storage with unique name
      const fileExt = file.name.split('.').pop();
      const filePath = `employer-ids/${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for file');
      }
      
      // Create verification request record
      const verificationRequest: AdminVerificationRequest = {
        employer_id: user.id,
        document_url: urlData.publicUrl,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        admin_notes: `ID Type: ${selectedIdType || 'Not specified'}`
      };
      
      const { error: requestError } = await supabase
        .from('employer_verification_requests')
        .insert(verificationRequest);
      
      if (requestError) throw requestError;
      
      setHasSubmittedReview(true);
      toast.success('Your ID has been submitted for review. You will be notified once verified.');
    } catch (error) {
      console.error('Error submitting for review:', error);
      toast.error('Failed to submit for review. Please try again.');
    } finally {
      setStatus('');
      setSubmitReviewLoading(false);
    }
  };
  
  if (verified) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">ID Verification Complete</h3>
          <p className="text-muted-foreground mb-4">
            Your ID has been verified successfully.
          </p>
          <p className="text-sm text-muted-foreground">
            Verified on {new Date(employerProfile?.verification_date).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }
  
  if (hasSubmittedReview) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">ID Verification Pending</h3>
          <p className="text-muted-foreground mb-4">
            Your ID has been submitted and is waiting for admin verification.
          </p>
          <p className="text-sm text-muted-foreground">
            You will be notified once your ID is verified.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Employer ID Verification</h3>
          <p className="text-sm text-muted-foreground">
            Please upload a valid Philippine ID for verification. This helps ensure the legitimacy of employers on our platform.
          </p>
        </div>
        
        <div className="space-y-6">
          {/* ID Type Selection */}
          <div>
            <Label htmlFor="id-type" className="mb-2 block">ID Type</Label>
            <select 
              id="id-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedIdType}
              onChange={(e) => setSelectedIdType(e.target.value)}
            >
              <option value="">Select ID Type</option>
              {PHILIPPINE_ID_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {/* File Upload Section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Upload Your ID</span>
            </div>
            
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 mb-4">
              <input
                type="file"
                id="id-upload"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="id-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium mb-1">Click to upload</span>
                <span className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, PDF
                </span>
              </label>
            </div>
            
            {file && (
              <div className="text-sm text-muted-foreground">
                Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
          
          {/* Extraction Method Toggle */}
          <div>
            <Label className="mb-2 block">Extraction Method</Label>
            <ToggleGroup type="single" value={extractionMethod} onValueChange={(value) => value && setExtractionMethod(value as ExtractionMethod)}>
              <ToggleGroupItem value="ocr" aria-label="OCR">
                OCR (Recommended)
              </ToggleGroupItem>
              <ToggleGroupItem value="pdfjs" aria-label="PDF.js" disabled={file?.type !== 'application/pdf'}>
                PDF Text
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground mt-1">
              OCR works on all file types. PDF Text is faster but only works if the PDF contains selectable text.
            </p>
          </div>
          
          <Button 
            onClick={processFile} 
            disabled={!file || loading || !selectedIdType}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Verify ID'
            )}
          </Button>
          
          {status && (
            <div className="text-sm text-muted-foreground text-center">
              {status}
            </div>
          )}
          
          {/* File Preview */}
          {filePreviewUrl && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Document Preview</span>
                <Button variant="ghost" size="sm" onClick={() => window.open(filePreviewUrl, '_blank')}>
                  <Eye className="h-4 w-4 mr-1" />
                  View Full Size
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                {file?.type === 'application/pdf' ? (
                  <div className="bg-slate-100 h-60 flex items-center justify-center">
                    <p className="text-center text-sm text-muted-foreground">
                      PDF Preview not available.<br />Use the "View Full Size" button to open the PDF.
                    </p>
                  </div>
                ) : (
                  <img 
                    src={filePreviewUrl} 
                    alt="Document preview" 
                    className="w-full max-h-60 object-contain"
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Extracted Data Results */}
          {extractedData?.validationResult && (
            <div className="border rounded-lg p-4 mt-4">
              <h4 className="font-medium mb-2">Verification Results</h4>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-1/3 text-sm text-muted-foreground">Status:</div>
                  <div className="w-2/3">
                    {extractedData.validationResult.isValid ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <ShieldCheck className="h-4 w-4" />
                        Valid ID
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-600">
                        <ShieldAlert className="h-4 w-4" />
                        Validation Issues
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-1/3 text-sm text-muted-foreground">ID Type:</div>
                  <div className="w-2/3">
                    {selectedIdType || extractedData.validationResult.idType || 'Unknown'}
                  </div>
                </div>
                
                {extractedData.validationResult.idNumber && (
                  <div className="flex items-center">
                    <div className="w-1/3 text-sm text-muted-foreground">ID Number:</div>
                    <div className="w-2/3">{extractedData.validationResult.idNumber}</div>
                  </div>
                )}
                
                {extractedData.validationResult.dateIssued && (
                  <div className="flex items-center">
                    <div className="w-1/3 text-sm text-muted-foreground">Date Issued:</div>
                    <div className="w-2/3">{extractedData.validationResult.dateIssued}</div>
                  </div>
                )}
                
                {extractedData.validationResult.dateExpiry && (
                  <div className="flex items-center">
                    <div className="w-1/3 text-sm text-muted-foreground">Expiry Date:</div>
                    <div className="w-2/3">{extractedData.validationResult.dateExpiry}</div>
                  </div>
                )}
                
                {extractedData.validationResult.validationErrors.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm text-muted-foreground mb-1">Validation Notes:</div>
                    <ul className="text-sm text-red-500 list-disc list-inside">
                      {extractedData.validationResult.validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Submit for review button */}
          {showSubmitForReview && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleSubmitForAdminReview}
                disabled={submitReviewLoading || !selectedIdType}
              >
                {submitReviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Admin Review'
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                If automatic verification failed, an administrator will review your ID manually.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 