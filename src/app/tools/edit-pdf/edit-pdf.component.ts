import { Component } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-edit-pdf',
  templateUrl: './edit-pdf.component.html',
  styleUrls: ['./edit-pdf.component.css']
})
export class EditPdfComponent {
  selectedFile: File | null = null;
  oldText: string = '';
  newText: string = '';
  color: string = '#000000';
  downloadUrl: string = '';
  progress = 0;

  constructor(private http: HttpClient) {}

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  editPdf(): void {
    if (!this.selectedFile || !this.oldText || !this.newText) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('old_text', this.oldText);
    formData.append('new_text', this.newText);
    formData.append('hex_color', this.color);

    this.http.post('http://127.0.0.1:8000/api/edit-pdf', formData, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        this.progress = Math.round((event.loaded / event.total) * 100);
      }

      if (event.type === HttpEventType.Response) {
        const blob = new Blob([event.body!], { type: 'application/pdf' });
        this.downloadUrl = URL.createObjectURL(blob);
        this.progress = 0;
      }
    });
  }
}
