import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-compress-image',
  templateUrl: './compress-image.component.html',
  styleUrls: ['./compress-image.component.css']
})
export class CompressImageComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  previewUrl: SafeUrl = '';
  blobUrl: string = '';
  compressedUrl: SafeUrl = ''; // This will hold the URL for the processed image preview
  originalSize = 0;
  compressedSize = 0; // This will hold the size of the *output* file, regardless of mode
  progress = 0;
  errorMessage: string | null = null;

  mode: 'compress' | 'resize' | 'convert' | 'crop' = 'compress';

  resizeWidth: number | null = null;
  resizeHeight: number | null = null;

  convertFormat: string = '';

  cropX: number | null = null;
  cropY: number | null = null;
  cropWidth: number | null = null;
  cropHeight: number | null = null;

  downloadedFileName = '';

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  /**
   * Triggers the hidden file input element click.
   */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  /**
   * Prevents default browser behaviors for drag events.
   * @param event The DOM event.
   */
  preventDefaults(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handles file selection from the input element.
   * @param event The change event from the file input.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
  }

  /**
   * Handles files dropped onto the drag-and-drop area.
   * @param event The drag event.
   */
  onFilesDropped(event: DragEvent): void {
    this.preventDefaults(event);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        this.setFile(file);
      } else {
        this.errorMessage = 'Please drop an image file (JPG, PNG, WebP, GIF, BMP).';
        this.clearSelectedFile();
      }
    }
  }

  /**
   * Sets the selected file and prepares for upload, resetting other states.
   * @param file The File object to set.
   */
  setFile(file: File): void {
    this.revokeObjectUrls(); // Revoke previous object URLs to free up memory

    this.selectedFile = file;
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
    this.originalSize = file.size;

    // Reset all processed/downloaded states and error messages
    this.compressedUrl = '';
    this.blobUrl = '';
    this.compressedSize = 0;
    this.progress = 0;
    this.downloadedFileName = '';
    this.errorMessage = null;

    // Reset all mode-specific input fields
    this.resizeWidth = null;
    this.resizeHeight = null;
    this.convertFormat = '';
    this.cropX = null;
    this.cropY = null;
    this.cropWidth = null;
    this.cropHeight = null;
  }

  /**
   * Gets the appropriate label for the action button based on the current mode.
   * @returns The button label string.
   */
  getButtonLabel(): string {
    switch (this.mode) {
      case 'resize': return '📐 Resize Image';
      case 'convert': return '🔄 Convert Image';
      case 'crop': return '✂️ Crop Image';
      default: return '⚡ Compress Image';
    }
  }

  /**
   * NEW: Gets the appropriate label for the result size display based on the current mode.
   * @returns The result label string.
   */
  getResultLabel(): string {
    switch (this.mode) {
      case 'compress': return 'Optimized Size';
      case 'resize': return 'Resized Size';
      case 'convert': return 'Converted Size';
      case 'crop': return 'Cropped Size';
      default: return 'Processed Size';
    }
  }

  /**
   * Initiates the upload and processing of the selected image based on the current mode.
   */
  upload(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image first.';
      return;
    }

    this.errorMessage = null; // Clear previous error messages
    this.compressedUrl = '';
    this.compressedSize = 0;
    this.blobUrl = '';
    this.downloadedFileName = '';
    this.progress = 0;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    let endpoint = '';

    if (this.mode === 'resize') {
      if (this.resizeWidth === null || this.resizeHeight === null || this.resizeWidth <= 0 || this.resizeHeight <= 0) {
        this.errorMessage = 'Resize Error: Please enter valid positive width and height.';
        return;
      }
      formData.append('width', this.resizeWidth.toString());
      formData.append('height', this.resizeHeight.toString());
      endpoint = `${environment.apiUrl}/resize-image`;

    } else if (this.mode === 'convert') {
      if (!this.convertFormat) {
        this.errorMessage = 'Convert Error: Please select a target format.';
        return;
      }
      formData.append('target_format', this.convertFormat);
      endpoint = `${environment.apiUrl}/convert-image`;

    } else if (this.mode === 'crop') {
      if (
        this.cropX === null || this.cropY === null ||
        this.cropWidth === null || this.cropHeight === null ||
        this.cropWidth <= 0 || this.cropHeight <= 0
      ) {
        this.errorMessage = 'Crop Error: Please enter valid positive crop dimensions (width, height) and coordinates (x, y).';
        return;
      }
      formData.append('x', this.cropX.toString());
      formData.append('y', this.cropY.toString());
      formData.append('width', this.cropWidth.toString());
      formData.append('height', this.cropHeight.toString());
      endpoint = `${environment.apiUrl}/crop-image`;

    } else {
      endpoint = `${environment.apiUrl}/compress-image`;
    }

    this.http.post(endpoint, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob'
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: event.body?.type || 'image/jpeg' });
        this.compressedSize = blob.size;

        this.revokeObjectUrls(true); // Revoke only compressedUrl/blobUrl

        this.blobUrl = URL.createObjectURL(blob);
        this.compressedUrl = this.sanitizer.bypassSecurityTrustUrl(this.blobUrl);
        // Pass the actual blob type to getDownloadName for accurate extension
        this.downloadedFileName = this.getDownloadName(blob.type);
        this.progress = 100;

        // Auto download
        const a = document.createElement('a');
        a.href = this.blobUrl;
        a.download = this.downloadedFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }, error => {
      console.error('Image processing failed:', error);
      this.progress = 0;
      this.errorMessage = `Processing failed: ${error.message || 'An unknown error occurred.'}`;
    });
  }

  /**
   * Generates a suitable download file name based on the mode and actual output MIME type.
   * @param outputMimeType The actual MIME type of the processed image blob from the backend.
   * @returns The download file name.
   */
  getDownloadName(outputMimeType: string): string {
    const originalName = this.selectedFile?.name || 'image';
    const lastDotIndex = originalName.lastIndexOf('.');
    let baseName = originalName.substring(0, lastDotIndex > -1 ? lastDotIndex : originalName.length);

    let suffix = '';
    let outputExtension = '';

    // Determine suffix based on mode
    switch (this.mode) {
      case 'compress':
        suffix = 'compressed';
        break;
      case 'resize':
        suffix = 'resized';
        break;
      case 'convert':
        suffix = 'converted';
        break;
      case 'crop':
        suffix = 'cropped';
        break;
      default:
        suffix = 'processed';
    }

    // Determine output extension based on MIME type first
    if (outputMimeType.includes('jpeg') || outputMimeType.includes('jpg')) {
      outputExtension = 'jpeg';
    } else if (outputMimeType.includes('png')) {
      outputExtension = 'png';
    } else if (outputMimeType.includes('webp')) {
      outputExtension = 'webp';
    } else if (outputMimeType.includes('gif')) {
      outputExtension = 'gif';
    } else if (outputMimeType.includes('bmp')) {
      outputExtension = 'bmp';
    } else {
      // Fallback: If MIME type is not specific, try to use the original extension
      outputExtension = originalName.substring(lastDotIndex + 1).toLowerCase() || 'jpeg';
    }

    // Special handling for 'convert' mode: prioritize the user's selected format for the filename
    // This ensures that if a user explicitly chose to convert to PNG, the downloaded file
    // is named with a .png extension, even if the backend's MIME type might be generic or
    // if there's a slight mismatch. This prioritizes user intent for the filename.
    if (this.mode === 'convert' && this.convertFormat) {
      outputExtension = this.convertFormat.toLowerCase();
    }

    return `${baseName}_${suffix}.${outputExtension}`;
  }

  /**
   * Clears the current file selection and resets all related states.
   */
  clearSelectedFile(): void {
    this.revokeObjectUrls();

    this.selectedFile = null;
    this.previewUrl = '';
    this.blobUrl = '';
    this.compressedUrl = '';
    this.progress = 0;
    this.compressedSize = 0;
    this.originalSize = 0;
    this.downloadedFileName = '';
    this.errorMessage = null;

    this.resizeWidth = null;
    this.resizeHeight = null;
    this.convertFormat = '';
    this.cropX = null;
    this.cropY = null;
    this.cropWidth = null;
    this.cropHeight = null;

    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Helper to revoke Object URLs to prevent memory leaks.
   * @param onlyCompressed If true, only revokes compressedUrl/blobUrl. Otherwise, revokes all.
   */
  private revokeObjectUrls(onlyCompressed: boolean = false): void {
    if (!onlyCompressed && this.previewUrl) {
      const urlString = (this.previewUrl as any).changingThisBreaksApplicationSecurity;
      if (urlString && urlString.startsWith('blob:')) {
        URL.revokeObjectURL(urlString);
      }
    }
    if (this.blobUrl && this.blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.blobUrl);
    }
  }

  // Lifecycle hook to clean up object URLs when component is destroyed
  ngOnDestroy(): void {
    this.revokeObjectUrls();
  }
}