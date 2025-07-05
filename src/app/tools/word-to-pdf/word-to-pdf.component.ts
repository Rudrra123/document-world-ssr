import { Component } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
selector: 'app-word-to-pdf',
templateUrl: './word-to-pdf.component.html',
styleUrls: ['./word-to-pdf.component.css']
})
export class WordToPdfComponent {
selectedFile: File | null = null;
progress = 0;
downloadUrl: string = '';

constructor(private http: HttpClient) {}

onFileSelected(event: any): void {
this.selectedFile = event.target.files[0];
}

upload(): void {
if (!this.selectedFile) return;

const formData = new FormData();
formData.append('file', this.selectedFile);

this.http.post(`${environment.apiUrl}/word-to-pdf`, formData, {
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

    // auto-download and reset
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'converted.pdf';
    anchor.click();
    URL.revokeObjectURL(url);

    this.reset();
  }
});
}

reset(): void {
this.selectedFile = null;
this.progress = 0;
this.downloadUrl = '';
}
}