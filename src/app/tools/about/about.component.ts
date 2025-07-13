import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { CommonModule, DOCUMENT, isPlatformServer } from '@angular/common';
import * as AOS from 'aos';
import { environment } from 'src/environments/environment';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    console.log('🚀 AboutComponent Initialized');

    AOS.init({
      duration: 1000,
      easing: 'ease-out',
      once: true
    });

    const pageUrl = `${environment.frontendUrl}/about`;
    const title = 'About Us - Document World: Free Document Tools & Templates';
    const description = `Learn about Document World's mission to provide free, high-quality digital document tools and templates like resumes, invoices, and reports.`;
    const keywords = `document world, free document tools, document templates, resume templates, invoice templates, document editor, converter, productivity tools, online documents`;
    const image = `${environment.frontendUrl}/assets/images/document-world-og-image.jpg`;

    // ✅ SSR-only meta update
    if (isPlatformServer(this.platformId)) {
      console.log('🧠 SSR: Setting meta tags');

      this.titleService.setTitle(title);

      this.metaService.updateTag({ name: 'description', content: description });
      this.metaService.updateTag({ name: 'keywords', content: keywords });
      this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
      this.metaService.updateTag({ name: 'author', content: 'Document World Team' });

      this.metaService.updateTag({ property: 'og:type', content: 'website' });
      this.metaService.updateTag({ property: 'og:url', content: pageUrl });
      this.metaService.updateTag({ property: 'og:title', content: title });
      this.metaService.updateTag({ property: 'og:description', content: description });
      this.metaService.updateTag({ property: 'og:image', content: image });

      this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.metaService.updateTag({ name: 'twitter:url', content: pageUrl });
      this.metaService.updateTag({ name: 'twitter:title', content: title });
      this.metaService.updateTag({ name: 'twitter:description', content: description });
      this.metaService.updateTag({ name: 'twitter:image', content: image });

      this.setCanonicalURL(pageUrl);
    }
  }

  private setCanonicalURL(url: string): void {
    let link: HTMLLinkElement = this.document.querySelector("link[rel='canonical']") || this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);

    if (!this.document.head.contains(link)) {
      this.document.head.appendChild(link);
    }
  }
}
