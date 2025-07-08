import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pdf-tools',
  templateUrl: './pdf-tools.component.html',
  styleUrls: ['./pdf-tools.component.css']
})

export class PdfToolsComponent implements OnInit, OnDestroy {
  // --- Common Properties ---
  activeTool: string | null = null; // Changed initial state to null so grid is visible initially

  progress = 0;
  downloadUrl: string = ''; // This will hold the URL for the download link
  downloadFileName: string = ''; // To store the specific filename for the download
  errorMessage = '';
  private uploadSubscription: Subscription | null = null;

  // --- Properties for Single File Conversions (JPG/PNG to PDF, PDF to Word, Word to PDF) ---
  selectedFileSingle: File | null = null;
  isDragging: boolean = false; // For drag-over effect, used by both single and multiple
  @ViewChild('fileInputSingle') fileInputSingle!: ElementRef<HTMLInputElement>;

  // --- Properties for Merge Images to PDF ---
  selectedFilesMultiple: File[] = [];
  previewUrlMultiple: string = ''; // Preview for the first image of multiple files
  @ViewChild('fileInputMultiple') fileInputMultiple!: ElementRef<HTMLInputElement>;

  // Usage Control for Merge Images to PDF (as provided in your code)
  isPremiumUserMerge: boolean = false; // Can be true if user logs in as premium
  freeUsesLimitMerge: number = 999999; // Set to a very high number for effectively unlimited daily merges
  freeUsesRemainingMerge: number = this.freeUsesLimitMerge; // Will always be high
  freeFileLimitMerge: number = 20; // Max files for free users per merge

  originalSizeKB: number = 0;
  compressedSizeKB: number = 0;

  constructor(private http: HttpClient, private route: ActivatedRoute) { }
  
ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    const toolParam = params.get('tool');

    if (toolParam) {
      this.setActiveTool(toolParam);

      // Scroll into view if section ID exists
      setTimeout(() => {
        const section = document.getElementById(`${toolParam}-section`);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
          section.classList.add('highlight-section');
          setTimeout(() => section.classList.remove('highlight-section'), 3000);
        }
      }, 300);
    } else {
      this.setActiveTool(null); // show full tool grid
    }
  });

  this.checkUserStatusMerge();
}


  ngOnDestroy(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }
    // Clean up Blob URL if any exists
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
  }

  // --- UI Switching Method (Call from your navigation buttons in HTML) ---
  setActiveTool(toolName: string | null): void { // Modified to accept null
    this.activeTool = toolName;
    this.reset(); // Reset states when switching tools for a clean slate
  }

  // --- Helper for file input accept attribute ---
  getFileAcceptTypes(mode: string): string {
    switch (mode) {
      case 'jpg-to-pdf':
        return 'image/jpeg,image/png,image/gif,image/bmp'; // Specific image MIME types
      case 'pdf-to-word':
        return 'application/pdf';
      case 'word-to-pdf':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword'; // .docx and .doc
      case 'merge-images-to-pdf':
        return 'image/jpeg,image/png,image/gif,image/bmp'; // Specific image MIME types for merge
      default:
        return '*/*'; // Fallback
    }
  }

  // --- Global Reset Logic ---
  // This resets EVERYTHING, ideal when switching tools or starting fresh after success/error.
  reset(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }

    // Clean up Blob URL before resetting
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }

    // Reset single file properties
    this.selectedFileSingle = null;
    if (this.fileInputSingle && this.fileInputSingle.nativeElement) {
      this.fileInputSingle.nativeElement.value = ''; // Clear single file input
    }

    // Reset multiple files properties
    this.selectedFilesMultiple = [];
    this.previewUrlMultiple = '';
    if (this.fileInputMultiple && this.fileInputMultiple.nativeElement) {
      this.fileInputMultiple.nativeElement.value = ''; // Clear multiple file input
    }

    // Reset common properties
    this.progress = 0;
    this.downloadUrl = '';
    this.downloadFileName = '';
    this.errorMessage = '';
    this.isDragging = false; // Always reset dragging state
    this.freeUsesRemainingMerge = this.freeUsesLimitMerge; // Reset merge usage to high limit
  }

  // --- Reset specific to single file input, used when clearing only that input ---
  resetSingleFile(): void {
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl); // Clean up Blob URL
    }
    this.selectedFileSingle = null;
    this.progress = 0;
    this.downloadUrl = '';
    this.downloadFileName = '';
    this.errorMessage = '';
    this.isDragging = false;
    if (this.fileInputSingle) {
      this.fileInputSingle.nativeElement.value = '';
    }
  }

  // --- Reset specific to multiple files input, used when clearing only that input ---
  resetMultipleFiles(): void {
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl); // Clean up Blob URL
    }
    this.selectedFilesMultiple = [];
    this.previewUrlMultiple = '';
    this.progress = 0;
    this.downloadUrl = '';
    this.downloadFileName = '';
    this.errorMessage = '';
    this.isDragging = false;
    if (this.fileInputMultiple) {
      this.fileInputMultiple.nativeElement.value = '';
    }
  }


  // --- Common State Reset for New Upload Initiation ---
  // This is called before any new upload starts to clear previous results/errors.
  private resetCommonStatesForNewUpload(): void {
    this.progress = 0;
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl); // Clean up old Blob URL before new upload
    }
    this.downloadUrl = '';
    this.downloadFileName = '';
    this.errorMessage = '';
    this.isDragging = false; // Ensure dragging state is reset
  }

  // --- Single File Conversion Methods ---

  onFileSelectedSingle(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (file) {
      const acceptedTypes = this.getFileAcceptTypes(this.activeTool || ''); // Use activeTool here, provide fallback
      const isFileTypeAccepted = this.checkFileType(file, acceptedTypes);

      if (isFileTypeAccepted) {
        this.selectedFileSingle = file;
        this.resetCommonStatesForNewUpload(); // Reset states common to all uploads
        this.selectedFilesMultiple = []; // Ensure multiple is cleared when a single file is selected
        this.previewUrlMultiple = ''; // Ensure multiple preview is cleared
      } else {
        this.errorMessage = `Unsupported file type for this conversion. Please select a valid file (e.g., ${acceptedTypes}).`;
        this.selectedFileSingle = null; // Clear invalid selection
        if (this.fileInputSingle) {
          this.fileInputSingle.nativeElement.value = ''; // Clear input visually
        }
      }
    } else {
      this.selectedFileSingle = null;
      this.resetCommonStatesForNewUpload();
    }
  }

  onDragOverSingle(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeaveSingle(event: DragEvent): void {
    event.stopPropagation(); // Only stop propagation, don't preventDefault here
    this.isDragging = false;
  }

  onDropSingle(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false; // Reset dragging state

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const acceptedTypes = this.getFileAcceptTypes(this.activeTool || ''); // Use activeTool here, provide fallback
      const isFileTypeAccepted = this.checkFileType(file, acceptedTypes);

      if (isFileTypeAccepted) {
        this.selectedFileSingle = file;
        this.resetCommonStatesForNewUpload();
        this.selectedFilesMultiple = []; // Ensure multiple is cleared
        this.previewUrlMultiple = ''; // Ensure multiple preview is cleared
      } else {
        this.errorMessage = `Unsupported file type for this conversion. Please select a valid file (e.g., ${acceptedTypes}).`;
        this.selectedFileSingle = null; // Clear invalid selection
        if (this.fileInputSingle) {
          this.fileInputSingle.nativeElement.value = ''; // Clear input visually
        }
      }
    } else {
      this.selectedFileSingle = null;
      this.resetCommonStatesForNewUpload();
    }
  }

  uploadSingleFile(): void {
    if (!this.selectedFileSingle) {
      this.errorMessage = 'Please select a file to convert.';
      return;
    }

    this.resetCommonStatesForNewUpload(); // Reset before starting new upload
    this.progress = 1; // Start progress bar immediately

    const formData = new FormData();
    formData.append('file', this.selectedFileSingle);

    let apiUrl = '';
    let mimeType = '';
    let fileName = '';

    switch (this.activeTool) { // Use activeTool here
      case 'jpg-to-pdf':
        apiUrl = `${environment.apiUrl}/jpg-to-pdf`;
        mimeType = 'application/pdf';
        fileName = 'converted.pdf';
        break;
      case 'pdf-to-word':
        apiUrl = `${environment.apiUrl}/pdf-to-word`;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileName = 'converted.docx';
        break;
      case 'word-to-pdf':
        apiUrl = `${environment.apiUrl}/word-to-pdf`;
        mimeType = 'application/pdf';
        fileName = 'converted.pdf';
        break;
      default:
        this.errorMessage = 'Invalid conversion tool selected.';
        this.reset();
        return;
    }

    this.uploadSubscription = this.http.post(apiUrl, formData, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((event.loaded / event.total) * 100);
        }

        if (event.type === HttpEventType.Response) {
          this.progress = 100; // Ensure 100% on completion

          const blob = new Blob([event.body!], { type: mimeType });
          this.downloadUrl = URL.createObjectURL(blob); // Set download URL for success message
          this.downloadFileName = fileName; // Store filename for the manual download button

          // NO AUTOMATIC DOWNLOAD HERE
        }
      },
      error: (error: HttpErrorResponse) => {
        this.handleUploadError(error);
        this.resetCommonStatesForNewUpload(); // Reset common states on error
      },
      complete: () => {
        this.unsubscribeUpload();
      }
    });
  }

  // --- Merge Images to PDF Methods (Multiple Files) ---

  onFilesSelectedMultiple(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const filesArray = Array.from(input.files).filter(file => file.type.startsWith('image/'));
      this.selectedFilesMultiple = filesArray;
      this.resetCommonStatesForNewUpload(); // Reset common states
      this.selectedFileSingle = null; // Ensure single file is cleared

      if (this.selectedFilesMultiple.length > 0) {
        // You could create a preview for the first image if needed
        // For now, it's just a count display.
      } else {
        this.previewUrlMultiple = '';
      }

      this.checkMergeLimits(); // Check and update error message based on limits
    }
  }

  // This handles dragover for multiple files. `preventDefaults` is called from HTML.
  // We keep `isDragging` true during dragover.
  onDragLeaveMultiple(event: DragEvent): void {
    event.stopPropagation();
    this.isDragging = false;
  }

  onFilesDroppedMultiple(event: DragEvent): void {
    this.preventDefaults(event); // Already calls preventDefault & stopPropagation & sets isDragging=true
    this.isDragging = false; // Reset dragging state

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files).filter(file => file.type.startsWith('image/'));
      this.selectedFilesMultiple = filesArray;
      this.resetCommonStatesForNewUpload();
      this.selectedFileSingle = null; // Ensure single file is cleared

      if (this.selectedFilesMultiple.length > 0) {
        // You could create a preview for the first image if needed
      } else {
        this.previewUrlMultiple = '';
      }

      this.checkMergeLimits(); // Check and update error message based on limits
    }
  }

  // Combined preventDefaults for dragover/drop zones
  preventDefaults(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    // Only set isDragging to true on dragover, not drop
    if (event.type === 'dragover') {
      this.isDragging = true;
    }
  }

  checkUserStatusMerge(): void {
    // Implement your actual user premium status check here
    // For now, hardcoded to false as per your setup for "effectively unlimited free merges"
    this.isPremiumUserMerge = false;
  }

  // A dedicated method to check and set merge related error messages
  private checkMergeLimits(): void {
    this.errorMessage = ''; // Clear previous error
    if (!this.isPremiumUserMerge) {
      if (this.selectedFilesMultiple.length > this.freeFileLimitMerge) {
        this.errorMessage = `Free users can merge up to ${this.freeFileLimitMerge} images at once.`;
      }
      // No check for freeUsesRemainingMerge here as it's effectively unlimited with 999999
    }
  }

  // This method will decrement from a very large number, so it won't affect free users significantly
  incrementDailyUsageMerge(): void {
    if (!this.isPremiumUserMerge) {
      this.freeUsesRemainingMerge--;
      // This decrement is mostly for theoretical tracking if you ever revert limits
    }
  }

  uploadMultipleFiles(): void {
    if (!this.selectedFilesMultiple.length) {
      this.errorMessage = 'Please select images to merge.';
      return;
    }

    // Re-check limits right before upload to ensure no last-second changes
    this.checkMergeLimits();
    if (this.errorMessage) { // If checkMergeLimits set an error, stop
      return;
    }

    // Additional check for freeUsesRemainingMerge, although it's very high
    if (!this.isPremiumUserMerge && this.freeUsesRemainingMerge <= 0) {
      this.errorMessage = 'Daily free merge limit reached! Please upgrade to Premium for unlimited use.';
      return;
    }

    this.resetCommonStatesForNewUpload(); // Reset before starting new upload
    this.progress = 1; // Start progress bar immediately

    const formData = new FormData();
    this.selectedFilesMultiple.forEach(file => formData.append('files', file)); // 'files' is the backend expected field name

    this.uploadSubscription = this.http.post(`${environment.apiUrl}/merge-images-to-pdf`, formData, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((event.loaded / event.total) * 100);
        }

        if (event.type === HttpEventType.Response) {
          this.progress = 100; // Ensure 100% on completion

          if (event.body) {
            const blob = new Blob([event.body], { type: 'application/pdf' });
            this.downloadUrl = URL.createObjectURL(blob); // Set download URL for success message
            this.downloadFileName = 'merged_images.pdf'; // Specific name for merged PDF for manual download

            // NO AUTOMATIC DOWNLOAD HERE
            this.incrementDailyUsageMerge(); // Increment usage upon successful merge
          } else {
            this.errorMessage = 'PDF creation failed: Empty response from server.';
            this.progress = 0; // Reset progress on empty response error
          }
        }
      },
      error: (error: HttpErrorResponse) => {
        this.handleUploadError(error);
        this.resetCommonStatesForNewUpload(); // Reset common states on error
      },
      complete: () => {
        this.unsubscribeUpload();
      }
    });
  }

  compressPdfFile(): void {
    if (!this.selectedFileSingle) {
      this.errorMessage = 'Please select a PDF file to compress.';
      return;
    }

    this.resetCommonStatesForNewUpload();
    this.progress = 1;

    const formData = new FormData();
    formData.append('file', this.selectedFileSingle);

    const originalSizeBytes = this.selectedFileSingle.size;

    this.uploadSubscription = this.http.post(`${environment.apiUrl}/compress-pdf`, formData, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((event.loaded / event.total) * 100);
        }

        if (event.type === HttpEventType.Response) {
          const blob = new Blob([event.body!], { type: 'application/pdf' });
          this.downloadUrl = URL.createObjectURL(blob);
          this.downloadFileName = 'compressed.pdf';

          const compressedSizeBytes = blob.size;
          this.originalSizeKB = +(originalSizeBytes / 1024).toFixed(1);
          this.compressedSizeKB = +(compressedSizeBytes / 1024).toFixed(1);

          this.progress = 0;
        }
      },
      error: (error: HttpErrorResponse) => {
        this.handleUploadError(error);
        this.resetCommonStatesForNewUpload();
      },
      complete: () => this.unsubscribeUpload()
    });
  }

  
  /**
   * Triggers the download of the file (for both single and multiple conversions).
   * This method is called when the "Download PDF" or "Download Word" button is clicked.
   */
  downloadPdf(): void {
    if (this.downloadUrl && this.downloadFileName) {
      const link = document.createElement('a');
      link.href = this.downloadUrl;
      link.download = this.downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // It's a good practice to revoke the object URL after it's no longer needed,
      // but if the user might click "Download" multiple times, you might delay this
      // until `resetSingleFile()` or `resetMultipleFiles()` is called.
      // For now, we'll keep it here as it's triggered by a button.
      // URL.revokeObjectURL(this.downloadUrl); // Uncomment this if you only want a single download opportunity
    }
  }


  // --- Utility methods ---
  private handleUploadError(error: HttpErrorResponse): void {
    console.error('Upload error:', error);
    this.progress = 0; // Reset progress on error
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl); // Clean up Blob URL on error
    }
    this.downloadUrl = ''; // Clear any download URL on error
    this.downloadFileName = ''; // Clear filename on error

    if (error.error instanceof ErrorEvent) {
      // Client-side error or network error
      this.errorMessage = `An error occurred: ${error.error.message}`;
    } else {
      // Backend error
      if (error.error instanceof Blob && error.error.type === 'application/json') {
        // Try to parse the error message from a JSON blob
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorBody = JSON.parse(reader.result as string);
            this.errorMessage = errorBody.detail || errorBody.message || `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
          } catch (e) {
            this.errorMessage = `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
          }
        };
        reader.readAsText(error.error);
      } else {
        // Handle non-JSON or other error formats
        this.errorMessage = `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
      }

      // Specific error status messages
      if (error.status === 0) {
        this.errorMessage = 'Could not connect to the server. Please ensure the backend is running and accessible.';
      }
      if (error.status === 403) {
        this.errorMessage = this.errorMessage || 'You have reached your daily limit or exceeded file count for the free plan.';
      }
      // Add more specific status code handling here as needed (e.g., 400, 404, 500)
    }
  }

  private unsubscribeUpload(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }
  }

  // Helper for more robust file type checking by MIME or extension
  private checkFileType(file: File, acceptedTypes: string): boolean {
    const mimeTypes = acceptedTypes.split(',').map(type => type.trim().toLowerCase());
    const fileNameLower = file.name.toLowerCase();

    // Check direct MIME type match
    if (mimeTypes.includes(file.type.toLowerCase())) {
      return true;
    }

    // Check for broad image type if 'image/*' is accepted
    if (mimeTypes.includes('image/*') && file.type.startsWith('image/')) {
      return true;
    }

    // Check by common file extensions if MIME types don't fully cover
    if (mimeTypes.includes('application/pdf') && fileNameLower.endsWith('.pdf')) return true;
    if (mimeTypes.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') && fileNameLower.endsWith('.docx')) return true;
    if (mimeTypes.includes('application/msword') && fileNameLower.endsWith('.doc')) return true;

    // Specific image extension checks if 'image/*' isn't used or for more rigor
    if (mimeTypes.includes('image/jpeg') && (fileNameLower.endsWith('.jpeg') || fileNameLower.endsWith('.jpg'))) return true;
    if (mimeTypes.includes('image/png') && fileNameLower.endsWith('.png')) return true;
    if (mimeTypes.includes('image/gif') && fileNameLower.endsWith('.gif')) return true;
    if (mimeTypes.includes('image/bmp') && fileNameLower.endsWith('.bmp')) return true;

    // If '*/*' is accepted, then all files are technically accepted
    if (mimeTypes.includes('*/*')) return true;

    return false;
  }

  
}