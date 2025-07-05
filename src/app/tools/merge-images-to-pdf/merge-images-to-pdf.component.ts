import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-merge-images-to-pdf',
  templateUrl: './merge-images-to-pdf.component.html',
  styleUrls: ['./merge-images-to-pdf.component.css']
})
export class MergeImagesToPdfComponent implements OnInit, OnDestroy {
  selectedFiles: File[] = [];
  downloadUrl = '';
  progress = 0;
  errorMessage = '';
  private uploadSubscription: Subscription | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // --- MODIFIED PROPERTIES for Usage Control ---
  isPremiumUser: boolean = false; // Still can be used if you introduce premium features later
  freeUsesLimit: number = 999999; // Set to a very high number to effectively remove the daily limit
  freeUsesRemaining: number = this.freeUsesLimit; // Will always be high
  freeFileLimit: number = 20;      // Max files for free users per merge (kept at 20 as previously set)

  previewUrl: string = ''; // Property for image preview

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // We can still call checkUserStatus if you intend to use `isPremiumUser` for other features
    this.checkUserStatus();
    // No need to load daily usage from localStorage if there's effectively no daily limit
    // However, keeping the method for future if the limit is reintroduced.
    // We will just ensure freeUsesRemaining is always high.
    this.freeUsesRemaining = this.freeUsesLimit; // Ensure it's always set to the high limit on init
  }

  checkUserStatus(): void {
    // This can still be used for other premium features if they exist (e.g., HEIC support)
    this.isPremiumUser = false; // Hardcoded to false for now
  }

  // This method's logic becomes less critical if freeUsesLimit is very high,
  // but it's kept for structural integrity or future reintroduction of a hard limit.
  loadDailyUsage(): void {
    // If you want a REAL unlimited free tier, you can entirely comment out the localStorage logic.
    // For now, we'll just ensure freeUsesRemaining is always high.
    this.freeUsesRemaining = this.freeUsesLimit;
  }

  // This method's logic becomes less critical if freeUsesLimit is very high.
  // It will still increment/decrement, but it won't hit a visible limit soon.
  incrementDailyUsage(): void {
    if (!this.isPremiumUser) {
      // If you truly want unlimited merges for free, you can comment out the localStorage update
      // and the decrement of freeUsesRemaining.
      // For now, it will just decrement from a very large number.
      const today = new Date().toDateString();
      const storedUsage = localStorage.getItem('pdfMergeUsage');
      let usageData = { date: today, count: 0 };
      if (storedUsage) {
        usageData = JSON.parse(storedUsage);
      }
      usageData.count++;
      localStorage.setItem('pdfMergeUsage', JSON.stringify(usageData));
      this.freeUsesRemaining--; // Will decrement from 999999, effectively unlimited
    }
  }

  goToPricing(): void {
    console.log('Navigating to pricing page...');
    // Example using Angular Router: this.router.navigate(['/pricing']);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
      this.resetStatesExceptFiles(); // Reset all states

      // Set preview URL for the first selected image
      if (this.selectedFiles.length > 0) {
        const firstFile = this.selectedFiles[0];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrl = e.target.result;
        };
        reader.readAsDataURL(firstFile);
      } else {
        this.previewUrl = ''; // Clear preview if no files
      }

      // Check file count limit for free users (this limit remains)
      if (!this.isPremiumUser && this.selectedFiles.length > this.freeFileLimit) {
          this.errorMessage = `Free users can merge up to ${this.freeFileLimit} images at once.`; // Removed premium upgrade suggestion
      } else {
          this.errorMessage = ''; // Clear any previous error
      }
    }
  }

  onFilesDropped(event: DragEvent): void {
    event.preventDefault(); // Prevent default browser behavior (opening file)
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFiles = Array.from(files);
      this.resetStatesExceptFiles(); // Reset all states

      // Set preview URL for the first selected image
      if (this.selectedFiles.length > 0) {
        const firstFile = this.selectedFiles[0];
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrl = e.target.result;
        };
        reader.readAsDataURL(firstFile);
      } else {
        this.previewUrl = ''; // Clear preview if no files
      }

      // Check file count limit for free users (this limit remains)
      if (!this.isPremiumUser && this.selectedFiles.length > this.freeFileLimit) {
          this.errorMessage = `Free users can merge up to ${this.freeFileLimit} images at once.`; // Removed premium upgrade suggestion
      } else {
          this.errorMessage = '';
      }
    }
  }

  preventDefaults(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  upload(): void {
    if (!this.selectedFiles.length) {
      this.errorMessage = 'Please select images to merge.';
      return;
    }

    // This check will now effectively never trigger for free users due to high freeUsesLimit
    if (!this.isPremiumUser && this.freeUsesRemaining <= 0) {
        this.errorMessage = 'Daily free merge limit reached! Please upgrade to Premium for unlimited use.';
        return;
    }

    // This check for file count PER MERGE remains active
    if (!this.isPremiumUser && this.selectedFiles.length > this.freeFileLimit) {
        this.errorMessage = `Free users can merge up to ${this.freeFileLimit} images at once.`; // Removed premium upgrade suggestion
        return;
    }

    this.resetStatesExceptFiles(); // Reset for a new upload

    const formData = new FormData();
    this.selectedFiles.forEach(file => formData.append('files', file));

    this.uploadSubscription = this.http.post(`${environment.apiUrl}/merge-images-to-pdf`, formData, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((event.loaded / event.total) * 100);
        }

        if (event.type === HttpEventType.Response) {
          if (event.body) {
            const blob = new Blob([event.body], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            this.downloadUrl = url;
            this.progress = 0; // Upload complete

            // Programmatically trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = 'merged.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the object URL
            URL.revokeObjectURL(url);

            // Increment usage upon successful merge (still happens, but from a high number)
            this.incrementDailyUsage();

          } else {
            this.errorMessage = 'PDF creation failed: Empty response from server.';
            this.progress = 0;
          }
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Upload error:', error);
        this.progress = 0; // Reset progress on error
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          this.errorMessage = `An error occurred: ${error.error.message}`;
        } else {
          // Server-side error
          if (error.error instanceof Blob && error.error.type === 'application/json') {
              const reader = new FileReader();
              reader.onload = () => {
                  try {
                      const errorBody = JSON.parse(reader.result as string);
                      this.errorMessage = errorBody.detail || `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
                  } catch (e) {
                      this.errorMessage = `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
                  }
              };
              reader.readAsText(error.error);
          } else {
              this.errorMessage = `Server responded with ${error.status}: ${error.statusText || 'Unknown error'}.`;
          }

          if (error.status === 0) {
            this.errorMessage = 'Could not connect to the server. Please ensure the backend is running.';
          }
          // Handle specific backend errors related to limits (if your backend still sends them)
          if (error.status === 403) {
              this.errorMessage = this.errorMessage || 'You have reached your daily merge limit or exceeded file count for the free plan.';
          }
        }
      },
      complete: () => {
        if (this.uploadSubscription) {
          this.uploadSubscription.unsubscribe();
          this.uploadSubscription = null;
        }
      }
    });
  }

  reset(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = null;
    }
    this.selectedFiles = []; // Clear files
    this.resetStatesExceptFiles(); // Clear other states
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    // No need to load daily usage again if it's effectively unlimited
    this.freeUsesRemaining = this.freeUsesLimit; // Reset to a very high number
  }

  // Helper method to reset common states without touching selectedFiles immediately
  private resetStatesExceptFiles(): void {
    this.downloadUrl = '';
    this.progress = 0;
    this.errorMessage = '';
    this.previewUrl = ''; // Clear preview
  }

  ngOnDestroy(): void {
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
    }
  }
}