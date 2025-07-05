import { Component } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pdf-to-word',
  templateUrl: './pdf-to-word.component.html',
  styleUrls: ['./pdf-to-word.component.css']
})
export class PdfToWordComponent {
  selectedFile: File | null = null;
  progress = 0;
  downloadUrl: string = '';
  downloadTriggered = false;

  constructor(private http: HttpClient) {}

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    this.downloadTriggered = false;
  }

  upload(): void {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post(`${environment.apiUrl}/pdf-to-word`, formData, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        const url = URL.createObjectURL(blob);
        this.downloadUrl = url;
        this.downloadTriggered = true;

        // auto-click to trigger download
        setTimeout(() => {
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'converted.docx';
          anchor.click();

          // Clean up
          URL.revokeObjectURL(url);
          this.resetState();
        }, 100);
      }
    });
  }

  resetState(): void {
    this.selectedFile = null;
    this.progress = 0;
    this.downloadUrl = '';
    this.downloadTriggered = false;
  }
}
