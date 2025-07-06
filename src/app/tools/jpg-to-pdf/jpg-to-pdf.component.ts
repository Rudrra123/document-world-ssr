import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-jpg-to-pdf',
  templateUrl: './jpg-to-pdf.component.html',
  styleUrls: ['./jpg-to-pdf.component.css']
})
export class JpgToPdfComponent {
  selectedFile: File | null = null;
  downloadUrl: string = '';
  progress = 0;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedFile = target.files?.[0] || null;
  }

  upload(): void {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post(`${environment.apiUrl}/jpg-to-pdf`, formData, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        this.downloadUrl = url;
        this.progress = 0;

        // Auto download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'converted.pdf';
        link.click();

        // Clean up and reset state
        URL.revokeObjectURL(url);
        this.reset();
      }
    });
  }

  reset(): void {
    this.downloadUrl = '';
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
