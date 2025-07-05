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
  // Common properties for both functionalities
  mode: string = 'jpg-to-pdf'; // Default mode
  progress = 0;
  downloadUrl: string = '';
  errorMessage = '';
  private uploadSubscription: Subscription | null = null;

  // Properties for Single File Conversions (JPG/PNG to PDF, PDF to Word, Word to PDF)
  selectedFileSingle: File | null = null;
  isDragging: boolean = false; // For single file drag-over effect

  @ViewChild('fileInputSingle') fileInputSingle!: ElementRef<HTMLInputElement>;

  // Properties for Merge Images to PDF
  selectedFilesMultiple: File[] = [];
  previewUrlMultiple: string = ''; // Preview for the first image
  // Usage Control for Merge Images to PDF (as provided in your code)
  isPremiumUserMerge: boolean = false; // Can be true if user logs in as premium
  freeUsesLimitMerge: number = 999999; // Set to a very high number for effectively unlimited daily merges
  freeUsesRemainingMerge: number = this.freeUsesLimitMerge;
  freeFileLimitMerge: number = 20; // Max files for free users per merge

  @ViewChild('fileInputMultiple') fileInputMultiple!: ElementRef<HTMLInputElement>;


  constructor(private http: HttpClient, private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Initialize usage limits for merge images tool
    // We can still call checkUserStatus if you intend to use `isPremiumUserMerge` for other features
    this.checkUserStatusMerge();
    // No need to load daily usage from localStorage if there's effectively no daily limit
    this.freeUsesRemainingMerge = this.freeUsesLimitMerge; // Ensure it's always set to the high limit on init
  }

  ngOnDestroy(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }
  }

  // --- Helper for file input accept attribute ---
  getFileAcceptTypes(mode: string): string {
    switch (mode) {
      case 'jpg-to-pdf':
        return 'image/*'; // Accepts all image types
      case 'pdf-to-word':
        return '.pdf';
      case 'word-to-pdf':
        return '.docx'; // Accepts only .docx files
      case 'merge-images-to-pdf':
        return 'image/*'; // Accepts all image types for merge
      default:
        return '*/*'; // Fallback
    }
  }

  // --- Common Reset Logic ---
  reset(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }

    // Reset single file properties
    this.selectedFileSingle = null;
    this.isDragging = false;
    if (this.fileInputSingle) {
      this.fileInputSingle.nativeElement.value = ''; // Clear single file input
    }

    // Reset multiple files properties
    this.selectedFilesMultiple = [];
    this.previewUrlMultiple = '';
    if (this.fileInputMultiple) {
      this.fileInputMultiple.nativeElement.value = ''; // Clear multiple file input
    }

    // Reset common properties
    this.progress = 0;
    this.downloadUrl = '';
    this.errorMessage = '';
    this.freeUsesRemainingMerge = this.freeUsesLimitMerge; // Reset merge usage to high limit
  }

  // --- Single File Conversion Methods ---

  onFileSelectedSingle(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFileSingle = input.files?.[0] || null;
    this.resetCommonStatesForNewUpload(); // Reset states common to all uploads
    this.selectedFilesMultiple = []; // Ensure multiple is cleared
    this.previewUrlMultiple = ''; // Ensure multiple preview is cleared
  }

  onDragOverSingle(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeaveSingle(event: DragEvent): void {
    event.stopPropagation();
    this.isDragging = false;
  }

  onDropSingle(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const acceptedTypes = this.getFileAcceptTypes(this.mode);
      const isFileTypeAccepted = this.checkFileType(file, acceptedTypes);

      if (isFileTypeAccepted) {
        this.selectedFileSingle = file;
        this.resetCommonStatesForNewUpload();
        this.selectedFilesMultiple = []; // Ensure multiple is cleared
        this.previewUrlMultiple = ''; // Ensure multiple preview is cleared
      } else {
        this.errorMessage = `Unsupported file type for ${this.mode} mode. Please select a valid file.`;
        this.reset();
      }
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

    switch (this.mode) {
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
        this.errorMessage = 'Invalid conversion mode selected.';
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
          const url = URL.createObjectURL(blob);
          this.downloadUrl = url; // Set download URL for success message
          // No need to set downloadTriggered for auto-download, but it can be used for UI visibility

          setTimeout(() => {
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            this.reset(); // Auto-clear after download
          }, 500);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.handleUploadError(error);
        this.reset();
      },
      complete: () => {
        this.unsubscribeUpload();
      }
    });
  }

  // --- Merge Images to PDF Methods ---

  onFilesSelectedMultiple(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFilesMultiple = Array.from(input.files).filter(file => file.type.startsWith('image/'));
      this.resetCommonStatesForNewUpload(); // Reset common states
      this.selectedFileSingle = null; // Ensure single file is cleared

      if (this.selectedFilesMultiple.length > 0) {
        const firstFile = this.selectedFilesMultiple[0];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrlMultiple = e.target.result;
        };
        reader.readAsDataURL(firstFile);
      } else {
        this.previewUrlMultiple = '';
      }

      // Check file count limit for free users
      if (!this.isPremiumUserMerge && this.selectedFilesMultiple.length > this.freeFileLimitMerge) {
        this.errorMessage = `Free users can merge up to ${this.freeFileLimitMerge} images at once.`;
      } else {
        this.errorMessage = '';
      }
    }
  }

  onFilesDroppedMultiple(event: DragEvent): void {
    this.preventDefaults(event);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFilesMultiple = Array.from(files).filter(file => file.type.startsWith('image/'));
      this.resetCommonStatesForNewUpload();
      this.selectedFileSingle = null; // Ensure single file is cleared

      if (this.selectedFilesMultiple.length > 0) {
        const firstFile = this.selectedFilesMultiple[0];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrlMultiple = e.target.result;
        };
        reader.readAsDataURL(firstFile);
      } else {
        this.previewUrlMultiple = '';
      }

      // Check file count limit for free users
      if (!this.isPremiumUserMerge && this.selectedFilesMultiple.length > this.freeFileLimitMerge) {
        this.errorMessage = `Free users can merge up to ${this.freeFileLimitMerge} images at once.`;
      } else {
        this.errorMessage = '';
      }
    }
  }

  preventDefaults(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  checkUserStatusMerge(): void {
    // This is where you'd typically check user's premium status from an auth service
    // For now, it's hardcoded to false as per your original request to essentially remove daily limits for free users.
    this.isPremiumUserMerge = false;
  }

  incrementDailyUsageMerge(): void {
    // This method will still decrement `freeUsesRemainingMerge` but from a very large number,
    // so it will effectively never hit zero for free users.
    if (!this.isPremiumUserMerge) {
      this.freeUsesRemainingMerge--;
    }
  }

  uploadMultipleFiles(): void {
    if (!this.selectedFilesMultiple.length) {
      this.errorMessage = 'Please select images to merge.';
      return;
    }

    if (!this.isPremiumUserMerge && this.freeUsesRemainingMerge <= 0) {
      this.errorMessage = 'Daily free merge limit reached! Please upgrade to Premium for unlimited use.';
      return;
    }

    if (!this.isPremiumUserMerge && this.selectedFilesMultiple.length > this.freeFileLimitMerge) {
      this.errorMessage = `Free users can merge up to ${this.freeFileLimitMerge} images at once.`;
      return;
    }

    this.resetCommonStatesForNewUpload(); // Reset before starting new upload
    this.progress = 1; // Start progress bar immediately

    const formData = new FormData();
    this.selectedFilesMultiple.forEach(file => formData.append('files', file)); // Note: 'files' is the backend expected field name

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
            const url = URL.createObjectURL(blob);
            this.downloadUrl = url; // Set download URL for success message

            // Programmatically trigger download (optional, but good for multi-file tools)
            const link = document.createElement('a');
            link.href = url;
            link.download = 'merged_images.pdf'; // Specific name for merged PDF
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.incrementDailyUsageMerge(); // Increment usage upon successful merge
            // DO NOT reset immediately here. Let the user see the download link and click "Merge Another".
            // The download URL is set, which shows the download section.
          } else {
            this.errorMessage = 'PDF creation failed: Empty response from server.';
            this.progress = 0;
          }
        }
      },
      error: (error: HttpErrorResponse) => {
        this.handleUploadError(error);
      },
      complete: () => {
        this.unsubscribeUpload();
      }
    });
  }

  // --- Utility methods ---
  private resetCommonStatesForNewUpload(): void {
    this.progress = 0;
    this.downloadUrl = '';
    this.errorMessage = '';
    // Ensure both file inputs are cleared visually if new files are selected in either mode
    if (this.fileInputSingle && this.fileInputSingle.nativeElement.value) {
      this.fileInputSingle.nativeElement.value = '';
    }
    if (this.fileInputMultiple && this.fileInputMultiple.nativeElement.value) {
        this.fileInputMultiple.nativeElement.value = '';
    }
  }

  private handleUploadError(error: HttpErrorResponse): void {
    console.error('Upload error:', error);
    this.progress = 0;
    if (error.error instanceof ErrorEvent) {
      this.errorMessage = `An error occurred: ${error.error.message}`;
    } else {
      if (error.error instanceof Blob && error.error.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorBody = JSON.parse(reader.result as string);
            this.errorMessage = errorBody.detail || `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
          } catch (e) {
            this.errorMessage = `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
          }
        };
        reader.readAsText(error.error);
      } else {
        this.errorMessage = `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
      }

      if (error.status === 0) {
        this.errorMessage = 'Could not connect to the server. Please ensure the backend is running.';
      }
      if (error.status === 403) {
        this.errorMessage = this.errorMessage || 'You have reached your daily limit or exceeded file count for the free plan.';
      }
    }
  }

  private unsubscribeUpload(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }
  }

  // Helper for more robust file type checking (can be expanded)
  private checkFileType(file: File, acceptedTypes: string): boolean {
      if (acceptedTypes === '*/*') return true;
      if (acceptedTypes.includes(file.type)) return true; // Direct MIME type match

      // Check by extension for common types where MIME might be tricky
      const fileNameLower = file.name.toLowerCase();
      if (acceptedTypes === '.pdf' && fileNameLower.endsWith('.pdf')) return true;
      if (acceptedTypes === '.docx' && fileNameLower.endsWith('.docx')) return true;
      if (acceptedTypes === 'image/*' && (fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg') || fileNameLower.endsWith('.png') || fileNameLower.endsWith('.gif') || fileNameLower.endsWith('.bmp'))) return true;

      return false;
  }
}