import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-word-edit',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, QuillModule],
  templateUrl: './word-edit.component.html',
  styleUrls: ['./word-edit.component.css']
})
export class WordEditComponent {
  rawFile: File | null = null;
  fileName: string = '';
  editorContent: string = '';
  editorVisible: boolean = false;
  downloadUrl: string | null = null;

  editorModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'clean']
    ]
  };

  constructor(private http: HttpClient) {}

  // Step 1: User selects a .docx file
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      if (file.name.endsWith('.docx')) {
        this.rawFile = file;
        this.fileName = file.name;
        this.editorVisible = false;
        this.editorContent = '';
        this.downloadUrl = null; // reset old download link
      } else {
        alert('Please upload a valid .docx file.');
      }
    }
  }

  // Step 2: View and load DOCX content as HTML
  viewContent(): void {
    if (!this.rawFile) return;

    const formData = new FormData();
    formData.append('file', this.rawFile);

    this.http.post(`${environment.apiUrl}/word-to-html`, formData, {
      responseType: 'text'
    }).subscribe({
      next: (htmlContent: string) => {
        this.editorContent = htmlContent.trim();
        this.editorVisible = true;
      },
      error: (err) => {
        console.error('❌ Error loading Word content:', err);
        alert('Failed to load Word content.');
      }
    });
  }

  // Step 3: Save edited content as .docx file
 saveEditedContent(): void {
  if (!this.editorContent.trim()) {
    alert('Editor is empty!');
    return;
  }

  const payload = {
    html: this.editorContent
  };

  this.http.post(`${environment.apiUrl}/html-to-word`, payload, {
    responseType: 'blob'
  }).subscribe({
    next: (docxBlob) => {
      if (this.downloadUrl) {
        URL.revokeObjectURL(this.downloadUrl); // Clean previous blob
      }

      this.downloadUrl = window.URL.createObjectURL(docxBlob);
      alert('✅ File ready! Click the "⬇️ Download Word" link to download.');
    },
    error: (err) => {
      console.error('❌ Error saving DOCX:', err);
      alert('Failed to save Word file.');
    }
  });
}

}
