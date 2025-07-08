import { Component } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-compress-pdf',
  templateUrl: './compress-pdf.component.html',
  styleUrls: ['./compress-pdf.component.css']
})
export class CompressPdfComponent {
  selectedFile: File | null = null;
  originalSize: number | null = null;
  compressedSize: number | null = null;
  downloadUrl: string | null = null;
  isUploading = false;
  uploadProgress = 0;

  constructor(private http: HttpClient) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.originalSize = file.size;
      this.downloadUrl = null;
      this.compressedSize = null;
    } else {
      alert("Please select a valid PDF file.");
    }
  }

  compressPDF() {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    this.isUploading = true;
    this.uploadProgress = 0;

    this.http.post(
      `${environment.apiUrl}/compress-pdf`,
      formData,
      {
        responseType: 'blob',
        reportProgress: true,
        observe: 'events'
      }
    ).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.uploadProgress = Math.round(100 * (event.loaded / event.total));
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: 'application/pdf' });
        this.compressedSize = blob.size;
        this.downloadUrl = window.URL.createObjectURL(blob);
        this.isUploading = false;
      }
    }, err => {
      console.error('Compression failed', err);
      alert("Compression failed. Try again.");
      this.isUploading = false;
    });
  }

  
}
