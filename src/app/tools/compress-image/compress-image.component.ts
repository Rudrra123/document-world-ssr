import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-compress-image',
  templateUrl: './compress-image.component.html', // Ensure your HTML file is updated with crop inputs
  styleUrls: ['./compress-image.component.css'] // Ensure your CSS file has styles for .crop-inputs
})
export class CompressImageComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  previewUrl: SafeUrl = ''; // SafeUrl for displaying original image preview
  blobUrl: string = ''; // Raw blob URL for download (needs to be string for a.href)
  compressedUrl: SafeUrl = ''; // SafeUrl for displaying processed image preview
  originalSize = 0;
  compressedSize = 0;
  progress = 0;

  mode: 'compress' | 'resize' | 'convert' | 'crop' = 'compress';

  // Resize properties
  resizeWidth: number | null = null;
  resizeHeight: number | null = null;

  // Convert properties
  convertFormat: string = '';

  // Crop properties
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
    if (file) this.setFile(file);
  }

  /**
   * Sets the selected file and prepares for upload, resetting other states.
   * @param file The File object to set.
   */
  setFile(file: File): void {
    this.selectedFile = file;
    // Create and sanitize URL for preview
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
    this.originalSize = file.size;

    // Reset all processed/downloaded states
    this.compressedUrl = '';
    this.blobUrl = ''; // Clear raw blob URL
    this.compressedSize = 0;
    this.progress = 0;
    this.downloadedFileName = '';

    // Reset all mode-specific input fields
    this.resizeWidth = null;
    this.resizeHeight = null;
    this.convertFormat = '';
    this.cropX = null;
    this.cropY = null;
    this.cropWidth = null;
    this.cropHeight = null;
  } // <-- Missing closing brace was here, now fixed.

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
   * Initiates the upload and processing of the selected image based on the current mode.
   */
  upload(): void {
    if (!this.selectedFile) {
      console.warn('No file selected for upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    let endpoint = '';

    if (this.mode === 'resize') {
      // Validate resize inputs
      if (this.resizeWidth === null || this.resizeHeight === null || this.resizeWidth <= 0 || this.resizeHeight <= 0) {
        console.error('Resize Error: Please enter valid positive width and height.');
        return;
      }
      formData.append('width', this.resizeWidth.toString());
      formData.append('height', this.resizeHeight.toString());
      endpoint = 'http://127.0.0.1:8000/api/resize-image';

    } else if (this.mode === 'convert') {
      // Validate convert input
      if (!this.convertFormat) {
        console.error('Convert Error: Please select a target format.');
        return;
      }
      formData.append('target_format', this.convertFormat);
      endpoint = 'http://127.0.0.1:8000/api/convert-image';

    } else if (this.mode === 'crop') {
      // Validate crop inputs
      if (
        this.cropX === null || this.cropY === null || // X and Y can be 0
        this.cropWidth === null || this.cropHeight === null ||
        this.cropWidth <= 0 || this.cropHeight <= 0 // Width and height must be positive
      ) {
        console.error('Crop Error: Please enter valid positive crop dimensions (width, height) and coordinates (x, y).');
        return;
      }
      formData.append('x', this.cropX.toString());
      formData.append('y', this.cropY.toString());
      formData.append('width', this.cropWidth.toString());
      formData.append('height', this.cropHeight.toString());
      endpoint = 'http://127.0.0.1:8000/api/crop-image';

    } else {
      // Default to compress
      endpoint = 'http://127.0.0.1:8000/api/compress-image';
    }

    // Reset progress and result displays before new upload
    this.progress = 0;
    this.compressedUrl = '';
    this.compressedSize = 0;
    this.blobUrl = ''; // Clear raw blob URL
    this.downloadedFileName = '';

    this.http.post(endpoint, formData, {
      reportProgress: true,
      observe: 'events',
      responseType: 'blob' // Expecting a blob (image data) back from FastAPI
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: event.body?.type || 'image/jpeg' });
        this.compressedSize = blob.size;

        // Store raw blob URL for download, and sanitize for display
        this.blobUrl = URL.createObjectURL(blob);
        this.compressedUrl = this.sanitizer.bypassSecurityTrustUrl(this.blobUrl);
        this.downloadedFileName = this.getDownloadName();
        this.progress = 0; // Reset progress after successful completion

        // Auto download via raw blobUrl
        const a = document.createElement('a');
        a.href = this.blobUrl; // Use the raw blobUrl for download
        a.download = this.downloadedFileName;
        document.body.appendChild(a); // Temporarily append to body to ensure click works
        a.click();
        document.body.removeChild(a); // Clean up the temporary anchor tag
      }
    }, error => {
      console.error('Image processing failed:', error);
      this.progress = 0; // Reset progress on error
      // You might want to display a user-friendly error message on the UI here
      this.resetTool(); // Reset the tool state on error
    });
  }

  /**
   * Generates a suitable download file name based on the mode.
   * @returns The download file name.
   */
  getDownloadName(): string {
    const name = this.selectedFile?.name || 'image';
    const lastDotIndex = name.lastIndexOf('.');
    let baseName = name;
    let originalExt = 'jpg'; // Default extension

    if (lastDotIndex > -1) {
      baseName = name.substring(0, lastDotIndex);
      originalExt = name.substring(lastDotIndex + 1).toLowerCase();
    }

    let suffix = '';
    let ext = originalExt; // Default to original extension

    switch (this.mode) {
      case 'compress':
        suffix = 'compressed';
        break;
      case 'resize':
        suffix = 'resized';
        break;
      case 'convert':
        suffix = 'converted';
        ext = this.convertFormat.toLowerCase() || originalExt; // Use target format, or fallback
        break;
      case 'crop':
        suffix = 'cropped';
        // For crop, backend might return PNG if original format was unknown/complex.
        // It's usually best to trust the backend's Content-Disposition header for the exact extension.
        // For client-side filename, we can stick with originalExt or 'png' as a safe guess.
        // The backend's header will ultimately override this for the actual download.
        break;
      default:
        suffix = 'processed'; // Fallback for any other unexpected mode
    }

    return `${baseName}_${suffix}.${ext}`;
  }

  /**
   * Resets all component states and inputs. Call this when mode changes or a new operation starts.
   */
  resetTool(): void {
    // Revoke previous object URLs to free up memory
    if (this.previewUrl) {
      // previewUrl is SafeUrl, need to cast back to string to revoke
      URL.revokeObjectURL(this.previewUrl.toString());
    }
    if (this.blobUrl) {
      // blobUrl is already a string
      URL.revokeObjectURL(this.blobUrl);
    }

    this.selectedFile = null;
    this.previewUrl = '';
    this.blobUrl = ''; // Reset raw blob URL
    this.compressedUrl = '';
    this.progress = 0;
    this.compressedSize = 0;
    this.originalSize = 0;
    this.downloadedFileName = '';

    // Reset all mode-specific inputs
    this.resizeWidth = null;
    this.resizeHeight = null;
    this.convertFormat = '';
    this.cropX = null;
    this.cropY = null;
    this.cropWidth = null;
    this.cropHeight = null;

    // Clear the file input element's value to allow selecting the same file again
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
}