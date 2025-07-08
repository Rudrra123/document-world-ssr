import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-compress-image',
  templateUrl: './compress-image.component.html',
  styleUrls: ['./compress-image.component.css']
})
export class CompressImageComponent implements OnInit {
  @ViewChild('fileInputSingle') fileInput!: ElementRef<HTMLInputElement>;

  activeTool: string | null = null;
  selectedFile: File | null = null;
  previewUrl: SafeUrl = '';
  blobUrl: string = '';
  downloadUrl: string = '';
  downloadedFileName = '';
  originalSize = 0;
  compressedSize = 0;
  progress = 0;
  errorMessage: string | null = null;
  isDragging: boolean = false;

  // Resize
  resizeWidth: number | null = null;
  resizeHeight: number | null = null;

  // Convert
  targetFormat: string = 'jpeg';

  // Crop
  cropX: number = 0;
  cropY: number = 0;
  cropWidth: number = 0;
  cropHeight: number = 0;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router 
  ) {}

  
  ngOnInit(): void {
    // 🔥 Activate tool from route param
    this.route.paramMap.subscribe(params => {
      const toolParam = params.get('tool');
      this.activeTool = toolParam || 'compress-image'; // Default to 'compress-image'
    });
  }

setActiveTool(tool: string | null): void {
  this.activeTool = tool;
  this.resetSingleFile();

  if (tool) {
    this.router.navigate(['/compress-image', tool]);
  } else {
    this.router.navigate(['/compress-image']); // clean URL
  }
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
    if (file?.type.startsWith('image/')) {
      this.setFile(file);
    } else {
      this.errorMessage = 'Please drop a valid image file.';
      this.resetSingleFile();
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
    this.downloadUrl = '';
    this.compressedSize = 0;
    this.progress = 0;
    this.errorMessage = null;
  }

  uploadSingleFile(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select an image.';
      return;
    }

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
      }
    }, error => {
      console.error('Compression error:', error);
      this.errorMessage = 'Compression failed.';
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
      }
    }, error => {
      console.error('Resize error:', error);
      this.errorMessage = 'Resize failed.';
      this.progress = 0;
    });
  }

  uploadConvertFile(): void {
    if (!this.selectedFile || !this.targetFormat) {
      this.errorMessage = 'Select an image and target format.';
      return;
    }

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
        this.progress = 100;
      }
    }, error => {
      console.error('Crop error:', error);
      this.errorMessage = error?.error?.detail || 'Cropping failed.';
      this.progress = 0;
    });
  }

  resetSingleFile(): void {
    this.selectedFile = null;
    this.previewUrl = '';
    this.downloadUrl = '';
    this.blobUrl = '';
    this.progress = 0;
    this.compressedSize = 0;
    this.originalSize = 0;
    this.downloadedFileName = '';
    this.errorMessage = null;
    this.resizeWidth = null;
    this.resizeHeight = null;
    this.targetFormat = 'jpeg';

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }

    this.revokeObjectUrls();
  }

  revokeObjectUrls(): void {
    if (this.blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.blobUrl);
    }

    if (this.previewUrl && (this.previewUrl as any).changingThisBreaksApplicationSecurity) {
      URL.revokeObjectURL((this.previewUrl as any).changingThisBreaksApplicationSecurity);
    }
  }
}
