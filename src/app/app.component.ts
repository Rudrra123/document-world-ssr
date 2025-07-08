import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  showMobileMenu = false;
  showPdfTools = false;
  showCompressTools = false;

  // Track window size changes
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (window.innerWidth > 768) {
      this.showMobileMenu = false;
    }
  }

  // Mobile menu toggle
  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  // Close mobile menu when a link is clicked
  closeMobileMenu(): void {
    this.showMobileMenu = false;
  }

  // Handle dropdown hover (for desktop)
  onDropdownHover(show: boolean, type?: string): void {
    if (window.innerWidth > 768) { // Only for desktop
      if (type === 'pdf') {
        this.showPdfTools = show;
        if (show) this.showCompressTools = false;
      } else if (type === 'compress') {
        this.showCompressTools = show;
        if (show) this.showPdfTools = false;
      }
    }
  }

  // Toggle dropdown (for mobile)
  toggleDropdown(type: string): void {
    if (window.innerWidth <= 768) { // Only for mobile
      if (type === 'pdf') {
        this.showPdfTools = !this.showPdfTools;
        if (this.showPdfTools) this.showCompressTools = false;
      } else if (type === 'compress') {
        this.showCompressTools = !this.showCompressTools;
        if (this.showCompressTools) this.showPdfTools = false;
      }
    }
  }

// Hide compress tools dropdown
hideCompressTools(): void {
  this.showCompressTools = false;
  this.closeMobileMenu();
}

// Hide pdf tools dropdown
hidePdfTools(): void {
  this.showPdfTools = false;
  this.closeMobileMenu();
}

}