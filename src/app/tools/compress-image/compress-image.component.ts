import { Component, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-compress-image',
  templateUrl: './compress-image.component.html',
  styleUrls: ['./compress-image.component.css']
})
export class CompressImageComponent implements OnInit, OnDestroy {
  @ViewChild('fileInputSingle') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  previewUrl: SafeUrl = '';
  blobUrl: string = '';
  compressedUrl: SafeUrl = '';
  downloadUrl: string = '';
  originalSize = 0;
  compressedSize = 0;
  progress = 0;
  errorMessage: string | null = null;
  isDragging: boolean = false;

  mode: 'compress' | 'resize' | 'convert' | 'crop' = 'compress';

  resizeWidth: number | null = null;
  resizeHeight: number | null = null;
  convertFormat: string = '';
  cropX: number | null = null;
  cropY: number | null = null;
  cropWidth: number | null = null;
  cropHeight: number | null = null;
  downloadedFileName = '';

  private routeSubscription: Subscription | undefined;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      const modeParam = params['mode'];
      if (modeParam && ['compress', 'resize', 'convert', 'crop'].includes(modeParam)) {
        this.mode = modeParam as any;
      } else {
        this.mode = 'compress';
      }
    });
  }

  ngOnDestroy(): void {
    this.revokeObjectUrls();
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

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
    if (file) {
      if (file.type.startsWith('image/')) {
        this.setFile(file);
      } else {
        this.errorMessage = 'Please drop an image file (JPG, PNG, WebP, GIF, BMP).';
        this.resetSingleFile();
      }
    }
  }

  onFileSelectedSingle(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
  }

  setFile(file: File): void {
    this.revokeObjectUrls();

    this.selectedFile = file;
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
    this.originalSize = file.size;

    this.compressedUrl = '';
    this.blobUrl = '';
    this.downloadUrl = '';
    this.compressedSize = 0;
    this.progress = 0;
    this.downloadedFileName = '';
    this.errorMessage = null;

    // Reset input fields
    this.resizeWidth = null;
    this.resizeHeight = null;
    this.convertFormat = '';
    this.cropX = null;
    this.cropY = null;
    this.cropWidth = null;
    this.cropHeight = null;
  }

  getButtonLabel(): string {
    switch (this.mode) {
      case 'resize': return '📐 Resize Image';
      case 'convert': return '🔄 Convert Image';
      case 'crop': return '✂️ Crop Image';
      default: return '⚡ Compress Image';
    }
  }

  getResultLabel(): string {
    switch (this.mode) {
      case 'compress': return 'Optimized Size';
      case 'resize': return 'Resized Size';
      case 'convert': return 'Converted Size';
      case 'crop': return 'Cropped Size';
      default: return 'Processed Size';
    }
  }

  uploadSingleFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image first.';
      return;
    }

    this.errorMessage = null;
    this.compressedUrl = '';
    this.compressedSize = 0;
    this.blobUrl = '';
    this.downloadUrl = '';
    this.downloadedFileName = '';
    this.progress = 0;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    let endpoint = '';

    if (this.mode === 'resize') {
      if (!this.resizeWidth || !this.resizeHeight) {
        this.errorMessage = 'Resize Error: Please enter valid width and height.';
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
        this.errorMessage = 'Crop Error: Please enter valid crop values.';
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

        this.revokeObjectUrls(true);

        this.blobUrl = URL.createObjectURL(blob);
        this.compressedUrl = this.sanitizer.bypassSecurityTrustUrl(this.blobUrl);
        this.downloadUrl = this.blobUrl;
        this.downloadedFileName = this.getDownloadName(blob.type);
        this.progress = 100;
      }
    }, error => {
      console.error('Image processing failed:', error);
      this.progress = 0;
      this.errorMessage = `Processing failed: ${error.message || 'An unknown error occurred.'}`;
    });
  }

  getDownloadName(outputMimeType: string): string {
    const originalName = this.selectedFile?.name || 'image';
    const lastDotIndex = originalName.lastIndexOf('.');
    let baseName = originalName.substring(0, lastDotIndex > -1 ? lastDotIndex : originalName.length);

    let suffix = '';
    let outputExtension = '';

    switch (this.mode) {
      case 'compress': suffix = 'compressed'; break;
      case 'resize': suffix = 'resized'; break;
      case 'convert': suffix = 'converted'; break;
      case 'crop': suffix = 'cropped'; break;
      default: suffix = 'processed';
    }

    if (outputMimeType.includes('jpeg')) outputExtension = 'jpeg';
    else if (outputMimeType.includes('png')) outputExtension = 'png';
    else if (outputMimeType.includes('webp')) outputExtension = 'webp';
    else if (outputMimeType.includes('gif')) outputExtension = 'gif';
    else if (outputMimeType.includes('bmp')) outputExtension = 'bmp';
    else outputExtension = originalName.substring(lastDotIndex + 1).toLowerCase() || 'jpeg';

    if (this.mode === 'convert' && this.convertFormat) {
      outputExtension = this.convertFormat.toLowerCase();
    }

    return `${baseName}_${suffix}.${outputExtension}`;
  }

  resetSingleFile(): void {
    this.revokeObjectUrls();

    this.selectedFile = null;
    this.previewUrl = '';
    this.blobUrl = '';
    this.compressedUrl = '';
    this.downloadUrl = '';
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
}
