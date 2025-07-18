import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { JpgToPdfComponent } from './tools/jpg-to-pdf/jpg-to-pdf.component';
import { EditPdfComponent } from './tools/edit-pdf/edit-pdf.component';
import { PdfToWordComponent } from './tools/pdf-to-word/pdf-to-word.component';
import { WordToPdfComponent } from './tools/word-to-pdf/word-to-pdf.component';
import { MergeImagesToPdfComponent } from './tools/merge-images-to-pdf/merge-images-to-pdf.component';
import { PdfToolsComponent } from './tools/pdf-tools/pdf-tools.component';
import { ProtectPdfPasswordComponent } from './tools/protect-pdf-password/protect-pdf-password.component';
import { RemovePdfPasswordComponent } from './tools/remove-pdf-password/remove-pdf-password.component';
import { WordEditComponent } from './tools/word-edit/word-edit.component';
import { CompressPdfComponent } from './tools/compress-pdf/compress-pdf.component';
import { ImageToolsComponent } from './tools/image-tools/image-tools.component';
import { PrivacyPolicyComponent } from './tools/privacy-policy/privacy-policy.component';
import { ContactComponent } from './tools/contact/contact.component';
import { PageNotFoundComponent } from './tools/page-not-found/page-not-found.component';
import { AboutComponent } from './tools/about/about.component'; // ✅ Add this import

const routes: Routes = [
  { path: 'pdf-tools/:tool', component: PdfToolsComponent },
  { path: 'pdf-tools', component: PdfToolsComponent },

  { path: 'image-tools/:tool', component: ImageToolsComponent },
  { path: 'image-tools', component: ImageToolsComponent },

  // ✅ Replace loadComponent with component for module-based
  { path: 'about', component: AboutComponent },

  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: 'contact', component: ContactComponent },

  { path: 'edit-pdf', component: EditPdfComponent },
  { path: 'word-to-pdf', component: WordToPdfComponent },
  { path: 'merge-images-to-pdf', component: MergeImagesToPdfComponent },
  { path: 'protect-pdf-password', component: ProtectPdfPasswordComponent },
  { path: 'remove-pdf-password', component: RemovePdfPasswordComponent },
  { path: 'edit-word', component: WordEditComponent },
  { path: 'compress-pdf', component: CompressPdfComponent },

  { path: '', redirectTo: '/pdf-tools', pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
