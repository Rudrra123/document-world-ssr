import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment'; // Ensure this path is correct for your environment

@Component({
  selector: 'app-image-tools',
  templateUrl: './image-tools.component.html',
  styleUrls: ['./image-tools.component.css']
})
export class ImageToolsComponent implements OnInit {
  @ViewChild('fileInputSingle') fileInput!: ElementRef<HTMLInputElement>;

  // Properties for Navbar Dropdowns and Mobile Menu
  showMobileMenu = false;
  showPdfTools = false;
  showCompressTools = false;
  private hoverTimeout: any;

  activeTool: string | null = null;
  selectedFile: File | null = null;
  previewUrl: SafeUrl = '';
  blobUrl: string = '';
  downloadUrl: string = '';
  downloadedFileName = '';
  originalSize = 0;
  compressedSize = 0;
  progress = 0; // Shared progress for all tools
  errorMessage: string | null = null; // Shared error message for all tools
  isDragging: boolean = false;

  // Resize Tool specific properties
  resizeWidth: number | null = null;
  resizeHeight: number | null = null;

  // Convert Tool specific properties
  targetFormat: string = 'jpeg';

  // Crop Tool specific properties
  cropX: number = 0;
  cropY: number = 0;
  cropWidth: number = 0;
  cropHeight: number = 0;

  // Image to Text (OCR) specific properties
  extractedText: string = '';
  isLoadingText: boolean = false; // Specific loading state for OCR

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const toolParam = params.get('tool');
      // Use the tool from the URL, or show the main grid if no tool is specified
      this.activeTool = toolParam || null;
      // Reset state when navigating to a new tool or back to grid
      this.resetSingleFile();
    });
  }

  // --- Navbar Dropdown and Mobile Menu Functions ---
  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
  }

  onDropdownHover(isHovering: boolean, type: 'pdf' | 'compress'): void {
    clearTimeout(this.hoverTimeout);
    if (isHovering) {
      this.showPdfTools = type === 'pdf';
      this.showCompressTools = type === 'compress';
    } else {
      this.hoverTimeout = setTimeout(() => {
        this.showPdfTools = false;
        this.showCompressTools = false;
      }, 100); // Small delay to prevent closing when moving mouse between button and menu
    }
  }

  toggleDropdown(type: 'pdf' | 'compress'): void {
    if (type === 'pdf') {
      this.showPdfTools = !this.showPdfTools;
      this.showCompressTools = false; // Close other dropdown
    } else if (type === 'compress') {
      this.showCompressTools = !this.showCompressTools;
      this.showPdfTools = false; // Close other dropdown
    }
  }

  hidePdfTools(): void {
    this.showPdfTools = false;
    this.showMobileMenu = false;
  }

  hideCompressTools(): void {
    this.showCompressTools = false;
    this.showMobileMenu = false;
  }

  setActiveTool(tool: string | null): void {
    this.activeTool = tool;
    this.resetSingleFile(); // Reset all tool-specific states when changing tool

    if (tool) {
      this.router.navigate(['/image-tools', tool]);
    } else {
      this.router.navigate(['/image-tools']); // clean URL
    }
  }

  // --- File Selection and Drag/Drop Handlers (Common for all single-file tools) ---
  preventDefaults(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragOverSingle(event: DragEvent): void {
    this.preventDefaults(event);
    this.isDragging = true;
  }

  onDragLeaveSingle(event: DragEvent): void {
    this.preventDefaults(event);
    this.isDragging = false;
  }

  onDropSingle(event: DragEvent): void {
    this.preventDefaults(event);
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) {
      this.setFile(file);
      this.resetResultState(); // Reset results when a new file is dropped
    } else {
      this.errorMessage = 'Please drop a valid image file.';
      this.resetSingleFile();
    }
  }

  onFileSelectedSingle(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setFile(file);
      this.resetResultState(); // Reset results when a new file is selected
    }
  }

  setFile(file: File): void {
    this.revokeObjectUrls();
    this.selectedFile = file;
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
    this.originalSize = file.size;
    // Reset general result states here, specific tool states are reset in resetSingleFile
    this.downloadUrl = '';
    this.compressedSize = 0;
    this.progress = 0;
    this.errorMessage = null;
  }

  // --- Tool-Specific Upload Functions ---

  uploadSingleFile(): void { // For Compress Image
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image.';
      return;
    }

    this.resetResultState(); // Clear previous results/errors for this operation
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post(`${environment.apiUrl}/compress-image`, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob'
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: 'image/jpeg' });
        this.revokeObjectUrls();
        this.blobUrl = URL.createObjectURL(blob);
        this.downloadUrl = this.blobUrl;
        this.compressedSize = blob.size;
        this.downloadedFileName = 'compressed_' + this.selectedFile!.name;
        this.progress = 100;
        this.errorMessage = null; // Clear error on success
      }
    }, error => {
      console.error('Compression error:', error);
      this.errorMessage = error?.error?.detail || 'Compression failed.';
      this.progress = 0;
    });
  }

  uploadResizeFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image.';
      return;
    }

    if (!this.resizeWidth || !this.resizeHeight) {
      this.errorMessage = 'Please enter valid width and height.';
      return;
    }

    this.resetResultState(); // Clear previous results/errors for this operation
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('width', this.resizeWidth.toString());
    formData.append('height', this.resizeHeight.toString());

    this.http.post(`${environment.apiUrl}/resize-image`, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob'
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: event.body?.type || 'image/jpeg' });
        this.revokeObjectUrls();
        this.blobUrl = URL.createObjectURL(blob);
        this.downloadUrl = this.blobUrl;
        this.compressedSize = blob.size;
        this.downloadedFileName = 'resized_' + this.selectedFile!.name;
        this.progress = 100;
        this.errorMessage = null; // Clear error on success
      }
    }, error => {
      console.error('Resize error:', error);
      this.errorMessage = error?.error?.detail || 'Resize failed.';
      this.progress = 0;
    });
  }

  uploadConvertFile(): void {
    if (!this.selectedFile || !this.targetFormat) {
      this.errorMessage = 'Select an image and target format.';
      return;
    }

    this.resetResultState(); // Clear previous results/errors for this operation
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('target_format', this.targetFormat);

    this.http.post(`${environment.apiUrl}/convert-image`, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob'
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: `image/${this.targetFormat}` });
        this.revokeObjectUrls();
        this.blobUrl = URL.createObjectURL(blob);
        this.downloadUrl = this.blobUrl;
        this.compressedSize = blob.size;
        this.downloadedFileName = `converted_${this.selectedFile!.name.split('.')[0]}.${this.targetFormat}`;
        this.progress = 100;
        this.errorMessage = null; // Clear error on success
      }
    }, error => {
      console.error('Conversion error:', error);
      this.errorMessage = error?.error?.detail || 'Conversion failed.';
      this.progress = 0;
    });
  }

  uploadCropFile(): void {
    if (!this.selectedFile || !this.cropWidth || !this.cropHeight) {
      this.errorMessage = 'Please provide image and crop dimensions.';
      return;
    }

    this.resetResultState(); // Clear previous results/errors for this operation
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('x', String(this.cropX));
    formData.append('y', String(this.cropY));
    formData.append('width', String(this.cropWidth));
    formData.append('height', String(this.cropHeight));

    this.http.post(`${environment.apiUrl}/crop-image`, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob'
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: this.selectedFile!.type });
        this.revokeObjectUrls();
        this.blobUrl = URL.createObjectURL(blob);
        this.downloadUrl = this.blobUrl;
        this.compressedSize = blob.size;
        this.downloadedFileName = `cropped_${this.selectedFile!.name}`;
        this.progress = 100; // Ensure it's 100
        this.errorMessage = null; // Clear error on success
      }
    }, error => {
      console.error('Crop error:', error);
      this.errorMessage = error?.error?.detail || 'Cropping failed.';
      this.progress = 0;
    });
  }

  // --- Image to Text (OCR) Function ---
  extractText(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image file first.';
      return;
    }

    this.resetResultState(); // Clear previous results/errors for this operation
    this.isLoadingText = true; // Activate OCR specific loading state
    this.progress = 1; // Start progress from 1 to show activity immediately

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<{ text: string }>(`${environment.apiUrl}/image-to-text`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((event.loaded / event.total) * 100);
        } else if (event.type === HttpEventType.Response) {
          this.extractedText = event.body?.text || 'No text found.';
          if (!event.body?.text || event.body.text.trim() === '') {
            this.errorMessage = 'No discernible text was extracted from the image.';
          }
          this.isLoadingText = false; // Deactivate OCR specific loading state
          this.progress = 100; // Complete progress
          this.errorMessage = null; // Clear error on success
        }
      },
      error: (error) => {
        console.error('Error during OCR:', error);
        this.errorMessage = error?.error?.detail || 'An unexpected error occurred during OCR. Please try again.';
        this.isLoadingText = false; // Deactivate OCR specific loading state
        this.progress = 0; // Reset progress on error
        this.extractedText = ''; // Clear any previous text on error
      }
    });
  }

  // --- Copy to Clipboard for OCR Text ---
  copyTextToClipboard(): void {
    if (this.extractedText) {
      // Modern approach: navigator.clipboard.writeText(this.extractedText)
      navigator.clipboard.writeText(this.extractedText)
        .then(() => {
          // You can replace alert with a custom message box or toast notification
          alert('Text copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy text. Please copy manually.');
        });
    }
  }

  /**
   * Resets the extracted text, loading state, and error message for the OCR tool.
   * This is called before starting a new OCR operation or when a new file is selected/dropped.
   */
  private resetResultState(): void {
    this.extractedText = '';
    this.isLoadingText = false;
    // Don't reset general progress/error here, as other tools also use them
    // and they might be in an ongoing state.
    // The specific tool's function (e.g., extractText, uploadSingleFile)
    // will manage `progress` and `errorMessage` for its own operation.
    // However, when a new file is *selected*, `setFile` and `resetSingleFile`
    // will clear `progress` and `errorMessage` globally.
  }


  // --- Reset All Tool States ---
  resetSingleFile(): void {
    // Common resets for all tools
    this.selectedFile = null;
    this.previewUrl = '';
    this.blobUrl = '';
    this.downloadUrl = '';
    this.downloadedFileName = '';
    this.originalSize = 0;
    this.compressedSize = 0;
    this.progress = 0; // Reset shared progress
    this.errorMessage = null; // Reset shared error message
    this.isDragging = false;

    // Reset Resize specific properties
    this.resizeWidth = null;
    this.resizeHeight = null;

    // Reset Convert specific properties
    this.targetFormat = 'jpeg';

    // Reset Crop specific properties
    this.cropX = 0;
    this.cropY = 0;
    this.cropWidth = 0;
    this.cropHeight = 0;

    // Reset Image to Text (OCR) specific properties
    // Ensure these are explicitly reset here for a full tool reset
    this.extractedText = '';
    this.isLoadingText = false;

    // Clear file input element
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }

    this.revokeObjectUrls();
  }

  revokeObjectUrls(): void {
    if (this.blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.blobUrl);
    }
    // Check if previewUrl is a SafeUrl and extract the underlying blob URL if it is
    if (this.previewUrl && typeof this.previewUrl === 'object' && (this.previewUrl as any).changingThisBreaksApplicationSecurity?.startsWith('blob:')) {
      URL.revokeObjectURL((this.previewUrl as any).changingThisBreaksApplicationSecurity);
    }
  }
}