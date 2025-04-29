import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { Button } from './ui/button';
import { Loader2, Shield, ShieldCheck, ShieldAlert, FileText, Upload, Eye, SwitchCamera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import {
  ToggleGroup,
  ToggleGroupItem
} from './ui/toggle-group';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface NBIValidationResult {
  isValid: boolean;
  nameMatch: boolean;
  nbiNumber: string | null;
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

// Extraction method types
type ExtractionMethod = 'pdfjs' | 'ocr';

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
          
            // Advanced image preprocessing for better OCR results
          try {
              // Get the image data
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              
              // Step 1: Convert to grayscale
              for (let i = 0; i < data.length; i += 4) {
                // Weighted grayscale conversion (human eye is more sensitive to green)
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
              
              // Step 5: Noise removal - remove isolated pixels
              const tempData = new Uint8ClampedArray(data.length);
              tempData.set(data);
              
              // Only apply to smaller images to avoid performance issues
              if (canvas.width < 2000 && canvas.height < 2000) {
                for (let y = 1; y < canvas.height - 1; y++) {
                  for (let x = 1; x < canvas.width - 1; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    const isBlack = data[idx] === 0;
                    
                    // Check surrounding pixels
                    let surroundingBlackCount = 0;
                    for (let yy = -1; yy <= 1; yy++) {
                      for (let xx = -1; xx <= 1; xx++) {
                        if (xx === 0 && yy === 0) continue;
                        const nidx = ((y + yy) * canvas.width + (x + xx)) * 4;
                        if (data[nidx] === 0) surroundingBlackCount++;
                      }
                    }
                    
                    // Remove isolated black pixels (noise)
                    if (isBlack && surroundingBlackCount < 2) {
                      tempData[idx] = 255;
                      tempData[idx + 1] = 255;
                      tempData[idx + 2] = 255;
                    }
                    
                    // Remove isolated white pixels in text
                    if (!isBlack && surroundingBlackCount > 6) {
                      tempData[idx] = 0;
                      tempData[idx + 1] = 0;
                      tempData[idx + 2] = 0;
                    }
                  }
                }
                
                // Copy the filtered data back
                data.set(tempData);
              }
              
              context.putImageData(imageData, 0, 0);
            } catch (preprocessingError) {
              console.warn('Advanced image preprocessing failed, reverting to basic preprocessing:', preprocessingError);
              
              // Fall back to simple thresholding if advanced fails
              try {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
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
            
            context.putImageData(imageData, 0, 0);
              } catch (basicError) {
                console.error('Basic preprocessing also failed:', basicError);
              }
          }
          
          // Get image data from canvas
          const imageData = canvas.toDataURL('image/png');
          setFilePreviewUrl(imageData); // Show the preprocessed image
          
          // Initialize Tesseract with better configuration
          setStatus(`Running OCR on page ${pageNum} with advanced settings...`);
          
            // Create a new worker with improved configuration and timeout handling
            const worker = await createWorker('eng', 1, {
              logger: progress => {
                if (progress.status === 'recognizing text') {
                  setStatus(`OCR progress: ${Math.round(progress.progress * 100)}%`);
                }
              }
            });
            
            // Set a timeout to prevent OCR from hanging
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('OCR timed out')), 60000); // 60 second timeout
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
              worker.recognize(imageData),
              timeoutPromise
            ]) as any;
            
          extractedText += data.text + '\n';
          
          // Store debug data
          debugData.push({
            page: pageNum,
            text: data.text,
              confidence: data.confidence,
              wordConfidences: data.words ? data.words.map(w => ({ word: w.text, confidence: w.confidence })) : []
          });
          
          // Clean up
          await worker.terminate();
          } catch (pageError) {
            console.error(`Error processing page ${pageNum}:`, pageError);
            toast.error(`Error on page ${pageNum}: ${pageError.message}`);
            // Continue with next page instead of failing completely
            extractedText += `[Error processing page ${pageNum}]\n`;
          }
        }
      } else {
        // For images, use direct OCR processing
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
        
        try {
          // Apply advanced preprocessing similar to PDF processing
          // Get the image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Step 1: Convert to grayscale with improved accuracy
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
          
        extractedText = data.text;
        
        // Store debug data
        debugData.push({
          page: 1,
          text: data.text,
            confidence: data.confidence,
            wordConfidences: data.words ? data.words.map(w => ({ word: w.text, confidence: w.confidence })) : []
        });
        
        // Clean up
        await worker.terminate();
        } catch (ocrError) {
          console.error('OCR processing error:', ocrError);
          toast.error(`OCR failed: ${ocrError.message}`);
          throw ocrError;
        }
      }
      
      // Enhanced quality check for OCR results
      const avgConfidence = debugData.reduce((sum, item) => sum + item.confidence, 0) / debugData.length;
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      const hasKeyPhrases = /NBI|CLEARANCE|NATIONAL|BUREAU|investigation/i.test(extractedText);
      
      // Log detailed quality metrics for debugging
      console.log('OCR Quality Metrics:', {
        avgConfidence,
        textLength: extractedText.length,
        wordCount,
        hasKeyPhrases,
        detailedConfidence: debugData.map(d => ({ page: d.page, confidence: d.confidence }))
      });
      
      // Warn about potentially low quality results
      if (avgConfidence < 70 || wordCount < 50 || !hasKeyPhrases) {
        console.warn(`Potentially low quality OCR result: confidence ${avgConfidence}%, words ${wordCount}`);
        
        if (avgConfidence < 50 && wordCount < 30) {
          toast.warning('OCR quality is very low. The document may be unclear or poorly scanned.');
        } else if (avgConfidence < 70) {
          toast.info('OCR quality is moderate. Some text may not be accurately recognized.');
        }
      }
      
      return { 
        text: extractedText, 
        pageCount,
        debug: debugData
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error(`OCR text extraction failed: ${error.message}`);
      
      // Return partial results if available
      if (extractedText.length > 0) {
        toast.info('Returning partial OCR results');
        return {
          text: extractedText,
          pageCount,
          debug: debugData
        };
      }
      
      throw error;
    }
  };
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
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('pdfjs');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isScannedPdf, setIsScannedPdf] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Initialize the OCR extractor with the state setters
  const extractWithOCR = extractTextWithOCR(setStatus, setFilePreviewUrl);

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

  // Enhanced NBI validation patterns
  const nbiPatterns = {
    // More flexible pattern for NBI Number 
    nbiNumber: /(?:NBI\s*(?:No\.|Number|Clearance|ID\s*NO\.|ID)\s*[:.]?\s*|^T\d+)([A-Z0-9][A-Z0-9\-]+\d+)/im,
    
    // More flexible date patterns
    dateIssued: /(?:Date\s*(?:of)?\s*Issue|Issued\s*on|Printed|OR\.\s*Date)\s*[:.]?\s*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i,
    
    dateExpiry: /(?:Valid\s*Until|Expiry\s*Date|VALID\s*UNTIL)\s*[:.]?\s*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i,
    
    // More flexible name patterns including variations
    namePattern: /(?:NAME\s*[:.]?\s*|^)([A-Z\s\-\',\.]+(?:\s+[A-Z][A-Za-z\-\']+){1,4})/im,
    
    // Fallback - look for text in all caps that might be a name
    namePatternFallback: /([A-Z][A-Z\s]+[A-Z])/g,
  };

  // Enhanced validation with detailed error handling and fallback logic
  const validateNBIClearance = (text: string, userProfile?: { full_name: string } | null): NBIValidationResult => {
    const validationErrors: string[] = [];
    const result: NBIValidationResult = {
      isValid: false,
      nameMatch: false,
      nbiNumber: null,
      dateIssued: null,
      dateExpiry: null,
      validationErrors: [],
      debug: { foundPatterns: {} }
    };

    console.log("OCR Text to validate:", text);

    // Check if it contains key NBI Clearance indicators
    const isNBIClearance = text.match(/NATIONAL\s+BUREAU\s+OF\s+INVESTIGATION|NBI\s+CLEARANCE|NBI\s+ID|THIS\s+IS\s+TO\s+CERTIFY/i);
    
    if (!isNBIClearance) {
      validationErrors.push('Document does not appear to be an NBI Clearance. Please ensure you uploaded the correct document.');
      result.validationErrors = validationErrors;
      return result;
    } 

    // Extract NBI Number
    const nbiMatch = text.match(nbiPatterns.nbiNumber);
    result.nbiNumber = nbiMatch ? nbiMatch[1] : null;
    result.debug.foundPatterns.nbiNumber = nbiMatch ? nbiMatch[0] : "Not found";
    
    if (!result.nbiNumber) {
      // Try a fallback pattern looking for T followed by numbers and letters
      const fallbackMatch = text.match(/T\d+[A-Z0-9\-]+\d+/i);
      result.nbiNumber = fallbackMatch ? fallbackMatch[0] : null;
      result.debug.foundPatterns.nbiNumberFallback = fallbackMatch ? fallbackMatch[0] : "Not found";
      
      if (!result.nbiNumber) {
        validationErrors.push('NBI Number not found. Please ensure the document shows the complete NBI Number.');
      }
    }

    // Extract dates
    const issuedMatch = text.match(nbiPatterns.dateIssued);
    result.dateIssued = issuedMatch ? issuedMatch[1] : null;
    result.debug.foundPatterns.dateIssued = issuedMatch ? issuedMatch[0] : "Not found";
    
    if (!result.dateIssued) {
      // Try a more general date pattern as fallback
      const dateMatches = text.match(/\d{1,2}[-\/\.\s][A-Za-z]+[-\/\.\s]\d{2,4}|\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}/g);
      if (dateMatches && dateMatches.length >= 2) {
        // Assume first date might be issue date
        result.dateIssued = dateMatches[0];
        result.debug.foundPatterns.dateIssuedFallback = dateMatches[0];
      } else {
        validationErrors.push('Issue date not found. Please ensure the document clearly shows the issue date.');
      }
    }

    const expiryMatch = text.match(nbiPatterns.dateExpiry);
    result.dateExpiry = expiryMatch ? expiryMatch[1] : null;
    result.debug.foundPatterns.dateExpiry = expiryMatch ? expiryMatch[0] : "Not found";
    
    if (!result.dateExpiry) {
      // Try a more general date pattern as fallback
      const dateMatches = text.match(/\d{1,2}[-\/\.\s][A-Za-z]+[-\/\.\s]\d{2,4}|\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}/g);
      if (dateMatches && dateMatches.length >= 2) {
        // Assume second date might be expiry date
        result.dateExpiry = dateMatches[1];
        result.debug.foundPatterns.dateExpiryFallback = dateMatches[1];
      } else {
        validationErrors.push('Expiry date not found. Please ensure the document clearly shows the expiry/valid until date.');
      }
    }

    // Name matching with multiple attempts
    if (userProfile?.full_name) {
      // First attempt with standard pattern
      let nameMatch = text.match(nbiPatterns.namePattern);
      let extractedName = nameMatch ? nameMatch[1].trim() : "";
      result.debug.foundPatterns.namePattern = nameMatch ? nameMatch[0] : "Not found";
      
      // If no name found, try the fallback pattern looking for all caps text
      if (!extractedName) {
        const allCapsMatches = Array.from(text.matchAll(nbiPatterns.namePatternFallback) || []);
        // Find the longest all-caps text that's likely to be a name (not too short, not too long)
        const likelyName = allCapsMatches
          .map(m => m[0].trim())
          .filter(name => name.length > 4 && name.length < 50 && !/NATIONAL|BUREAU|INVESTIGATION|CLEARANCE|REPUBLIC|PHILIPPINES/.test(name))
          .sort((a, b) => b.length - a.length)[0];
        
        if (likelyName) {
          extractedName = likelyName;
          result.debug.foundPatterns.namePatternFallback = likelyName;
        }
      }
      
      if (extractedName) {
        const nbiName = extractedName.toLowerCase();
        const profileName = userProfile.full_name.toLowerCase();
        
        result.debug.nameComparison = {
          extracted: nbiName,
          profile: profileName
        };
        
        // Enhanced name matching with multiple strategies
        
        // 1. Direct substring check
        const directMatch = nbiName.includes(profileName) || profileName.includes(nbiName);
        
        // 2. Parts matching (more flexible)
        const nbiNameParts = nbiName.split(/[\s,.-]+/).filter(Boolean);
        const profileNameParts = profileName.split(/[\s,.-]+/).filter(Boolean);
        
        // Check if at least 50% of profile name parts are present in NBI name
        const matchingParts = profileNameParts.filter(namePart => 
          nbiNameParts.some(nbiPart => nbiPart.includes(namePart) || namePart.includes(nbiPart))
        );
        
        const partialMatch = matchingParts.length / profileNameParts.length >= 0.5;
        
        // 3. Levenshtein distance for fuzzy matching
        const levenshteinMatch = calculateLevenshteinSimilarity(nbiName, profileName) > 0.6;
        
        result.nameMatch = directMatch || partialMatch || levenshteinMatch;
        result.debug.nameMatchDetails = {
          directMatch,
          partialMatch,
          levenshteinMatch,
          matchingParts: matchingParts
        };

        if (!result.nameMatch) {
          validationErrors.push('Name on NBI Clearance does not match your profile name. Please ensure your profile name matches the document exactly.');
        }
      } else {
        validationErrors.push('Name not found on document. Please ensure the document clearly shows your complete name.');
      }
    }

    result.validationErrors = validationErrors;
    result.isValid = validationErrors.length === 0;

    return result;
  };

  // Helper function to calculate Levenshtein distance similarity ratio
  function calculateLevenshteinSimilarity(str1: string, str2: string): number {
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
    return maxLength > 0 ? 1 - distance / maxLength : 1;
  }

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

  // Extract text from PDF using PDF.js
  const extractTextWithPdfJs = async (file: File): Promise<{text: string, pageCount: number}> => {
    setStatus('Reading PDF file with PDF.js...');
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    
    let fullText = '';
    const pageCount = pdfDoc.numPages;
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      setStatus(`Processing page ${pageNum} of ${pageCount}...`);
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Check if the PDF has extractable text or is a scanned document
    if (fullText.trim().length < 50 && pageCount > 0) {
      setIsScannedPdf(true);
      toast.info('This appears to be a scanned PDF with little text. Try OCR extraction instead.');
    }
    
    return { text: fullText, pageCount };
  };

  const handleExtract = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setExtractedData(null);

      let extractionResult;
      
      // Use the selected extraction method
      if (extractionMethod === 'pdfjs' && selectedFile.type === 'application/pdf') {
        extractionResult = await extractTextWithPdfJs(selectedFile);
      } else {
        extractionResult = await extractWithOCR(selectedFile);
      }
      
      // Quality check for OCR text
      if (extractionResult.text.trim().length < 100) {
        toast.warning('The extracted text is very short or low quality. OCR results may be unreliable.');
      }

      const validationResult = validateNBIClearance(extractionResult.text, userProfile);
      
      setExtractedData({
        text: extractionResult.text,
        pageCount: extractionResult.pageCount,
        debug: extractionResult.debug,
        validationResult
      });

      if (validationResult.isValid && validationResult.nameMatch) {
        await updateVerificationStatus(true);
      } else {
        // Don't upload here, just set status to none so user can choose to submit for review
        setAdminVerificationStatus('none');
      }

    } catch (error) {
      console.error('Document processing error:', error);
      toast.error('Failed to process document');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }, [selectedFile, userProfile, extractionMethod, validateNBIClearance, updateVerificationStatus]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setExtractedData(null);
    setIsScannedPdf(false);
  };

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Handle upload for admin review
  const handleSubmitForAdminReview = async () => {
    if (!selectedFile || !user) return;

    try {
      setLoading(true);
      setStatus('Uploading document to storage...');

      // 1. Upload file to Supabase storage bucket
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `verification-docs/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true // Use upsert to replace existing file if needed
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload document: ${uploadError.message}`);
      }

      if (!uploadData || !uploadData.path) {
        throw new Error('Upload completed but no file path returned');
      }

      setStatus('Getting file URL...');

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded document');
      }

      setStatus('Creating verification request...');

      // 3. Create verification request for admin review
      const { data, error: requestError } = await supabase
        .from('admin_verification_requests')
        .insert({
          user_id: user.id,
          document_url: publicUrl,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (requestError) {
        console.error('Verification request error:', requestError);
        throw new Error(`Failed to create verification request: ${requestError.message}`);
      }

      // 4. Update UI and show success message
      if (data) {
        setAdminVerificationId(data.id);
      setAdminVerificationStatus('pending');
      setSelectedFile(null);
        toast.success('Document successfully submitted for admin review');
      } else {
        throw new Error('Verification request created but no data returned');
      }

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit document for review');
      // Don't update verification status on error
      setAdminVerificationStatus('none');
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
            Please upload your NBI Clearance to verify your identity. The document should be in PDF format or a clear image.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileSelect}
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

          {selectedFile && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Extraction Method:</h4>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                  <Switch
                    id="extraction-toggle"
                    checked={extractionMethod === 'ocr'}
                    onCheckedChange={(checked) => setExtractionMethod(checked ? 'ocr' : 'pdfjs')}
                    disabled={selectedFile && !selectedFile.type.includes('pdf')}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="extraction-toggle" className="font-medium text-gray-700">
                    {extractionMethod === 'pdfjs' ? 'Standard PDF Extraction' : 'OCR Image Extraction'}
                  </Label>
                </div>
                {isScannedPdf && (
                  <div className="text-sm text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded-md">
                    <SwitchCamera className="h-4 w-4" />
                    <span>Scanned PDF detected! OCR recommended</span>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                <p>
                  <strong>Standard PDF Extraction:</strong> Works best with digital PDFs that contain selectable text.
                </p>
                <p className="mt-1">
                  <strong>OCR Image Extraction:</strong> Better for scanned documents and images where text isn't selectable.
                </p>
              </div>
            </div>
          )}
          
          {filePreviewUrl && (
            <div className="mt-4 border p-2 rounded-md max-w-md mx-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Eye className="h-4 w-4 mr-1" /> Document Preview
              </h4>
              <img 
                src={filePreviewUrl} 
                alt="Document preview" 
                className="max-h-64 mx-auto object-contain"
              />
            </div>
          )}
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
              <div className="flex items-center justify-between">
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
                <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                  {extractionMethod === 'pdfjs' ? 'PDF Text Extraction' : 'OCR Image Processing'}
                </div>
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

              {/* Add toggle for debug info */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button 
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                >
                  {showDebugInfo ? 'Hide' : 'Show'} Technical Details
                </button>
                
                {showDebugInfo && extractedData.validationResult.debug && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
                    <p className="font-semibold mb-1">Pattern Matches:</p>
                    <pre className="overflow-auto max-h-40">
                      {JSON.stringify(extractedData.validationResult.debug.foundPatterns, null, 2)}
                    </pre>
                    
                    {extractedData.validationResult.debug.nameComparison && (
                      <>
                        <p className="font-semibold mt-2 mb-1">Name Comparison:</p>
                        <pre className="overflow-auto max-h-40">
                          {JSON.stringify(extractedData.validationResult.debug.nameComparison, null, 2)}
                        </pre>
                        <p className="font-semibold mt-2 mb-1">Name Match Details:</p>
                        <pre className="overflow-auto max-h-40">
                          {JSON.stringify(extractedData.validationResult.debug.nameMatchDetails, null, 2)}
                        </pre>
                      </>
                    )}
                    
                    {extractedData.debug && (
                      <>
                        <p className="font-semibold mt-2 mb-1">OCR Confidence:</p>
                        <pre className="overflow-auto max-h-40">
                          {JSON.stringify(extractedData.debug.map(d => ({
                            page: d.page,
                            confidence: d.confidence
                          })), null, 2)}
                        </pre>
                      </>
                    )}
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
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 text-yellow-500" />
                  <p className="text-sm text-yellow-700">
                    Your document has been submitted and is pending review by our admin team.
                  </p>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  Request ID: {adminVerificationId || 'Processing...'}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Submitted on: {new Date().toLocaleDateString()}
                </p>
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





