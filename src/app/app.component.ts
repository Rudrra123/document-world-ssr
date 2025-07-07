// app.component.ts (or your header component if separate)

import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-root', // or 'app-header' if it's a separate component
  templateUrl: './app.component.html', // or './header.component.html'
  styleUrls: ['./app.component.css'] // or './header.component.css'
})
export class AppComponent { // or HeaderComponent
  title = 'DocumentWorld';

  // State for PDF Tools dropdown
  showPdfTools: boolean = false;
  private isPdfToolsHovering: boolean = false; // Renamed for clarity

  // State for Compress Tools dropdown
  showCompressTools: boolean = false;
  private isCompressToolsHovering: boolean = false; // New property

  // Mouse hover events for PDF Tools dropdown
  onDropdownHover(isOver: boolean): void {
    this.isPdfToolsHovering = isOver;
    if (isOver) {
      this.showPdfTools = true;
    } else {
      setTimeout(() => {
        if (!this.isPdfToolsHovering) {
          this.showPdfTools = false;
        }
      }, 150);
    }
  }

  // Mouse hover events for Compress Tools dropdown (New method)
  onCompressDropdownHover(isOver: boolean): void {
    this.isCompressToolsHovering = isOver;
    if (isOver) {
      this.showCompressTools = true;
    } else {
      setTimeout(() => {
        if (!this.isCompressToolsHovering) {
          this.showCompressTools = false;
        }
      }, 150);
    }
  }

  // Closes the PDF Tools dropdown (existing)
  hidePdfTools(): void {
    this.showPdfTools = false;
    this.isPdfToolsHovering = false;
  }

  // Closes the Compress Tools dropdown (New method)
  hideCompressTools(): void {
    this.showCompressTools = false;
    this.isCompressToolsHovering = false;
  }

  // Closes ALL dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const targetElement = event.target as HTMLElement;
    // Check if the click is outside the entire dropdown container for PDF Tools
    if (this.showPdfTools && !targetElement.closest('.dropdown')) {
      this.showPdfTools = false;
      this.isPdfToolsHovering = false;
    }
    // Check if the click is outside the entire dropdown container for Compress Tools
    if (this.showCompressTools && !targetElement.closest('.dropdown')) { // Using .dropdown class which is common
      this.showCompressTools = false;
      this.isCompressToolsHovering = false;
    }
  }
}