import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgClass } from '@angular/common';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-protect-pdf-password',
  standalone: true,
  imports: [FormsModule, CommonModule, NgClass],
  templateUrl: './protect-pdf-password.component.html',
  styleUrls: ['./protect-pdf-password.component.css']
})
export class ProtectPdfPasswordComponent {
  selectedFile: File | null = null;
  password: string = '';
  isLoading = false;
  message = '';

  constructor(private http: HttpClient) { }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      // You can implement a toast notification system for a better UX
      alert('❌ Please select a valid PDF file.');
      return;
    }
    this.selectedFile = file;
  }
  
  // The rest of your onSubmit, resetForm, etc. logic remains the same.
  onSubmit(): void {
    if (!this.selectedFile || !this.password) {
      alert('❗ Please select a file and enter a password.');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('password', this.password);

    this.isLoading = true;
    this.message = '';

    this.http.post(`${environment.apiUrl}/protect-pdf-password`, formData, {
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        const blob = new Blob([response.body!], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const header = response.headers.get('Content-Disposition');
        const match = header?.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : 'protected.pdf';

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        alert('✅ PDF protected and downloaded successfully!');
        this.resetForm();
      },
      error: (err) => {
        console.error('❌ Error:', err);
        alert(err.error?.detail || '❌ Failed to protect PDF. Please try again.');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  resetForm(): void {
    this.selectedFile = null;
    this.password = '';
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}