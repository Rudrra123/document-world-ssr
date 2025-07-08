import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JpgToPdfComponent } from './tools/jpg-to-pdf/jpg-to-pdf.component';
import { EditPdfComponent } from './tools/edit-pdf/edit-pdf.component';
import { PdfToWordComponent } from './tools/pdf-to-word/pdf-to-word.component';
import { WordToPdfComponent } from './tools/word-to-pdf/word-to-pdf.component';
import { CompressImageComponent } from './tools/compress-image/compress-image.component';
import { MergeImagesToPdfComponent } from './tools/merge-images-to-pdf/merge-images-to-pdf.component';
import { PdfToolsComponent } from './tools/pdf-tools/pdf-tools.component'; 
import { ProtectPdfPasswordComponent } from './tools/protect-pdf-password/protect-pdf-password.component';
import { RemovePdfPasswordComponent } from './tools/remove-pdf-password/remove-pdf-password.component';
import { WordEditComponent } from './tools/word-edit/word-edit.component';
import { CompressPdfComponent } from './tools/compress-pdf/compress-pdf.component';

const routes: Routes = [
  // ✅ PDF Tools with optional parameter to switch tools like /pdf-tools/compress-pdf
  { path: 'pdf-tools/:tool', component: PdfToolsComponent },
  { path: 'pdf-tools', component: PdfToolsComponent },

  // ✅ PDF Tools with optional parameter to switch tools like /pdf-tools/compress-pdf
 { path: 'compress-image/:tool', component: CompressImageComponent },
{ path: 'compress-image', component: CompressImageComponent },



  // ✅ Other direct tools
  { path: 'edit-pdf', component: EditPdfComponent },
  { path: 'word-to-pdf', component: WordToPdfComponent },
  { path: 'merge-images-to-pdf', component: MergeImagesToPdfComponent },
  { path: 'protect-pdf-password', component: ProtectPdfPasswordComponent },
  { path: 'remove-pdf-password', component: RemovePdfPasswordComponent },
  { path: 'edit-word', component: WordEditComponent },
  { path: 'compress-pdf', component: CompressPdfComponent }, // optional if still used directly

  // ✅ Default and fallback routes
  { path: '', redirectTo: '/pdf-tools', pathMatch: 'full' },
  { path: '**', redirectTo: '/pdf-tools' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
