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

const routes: Routes = [
  { path: 'pdf-tools', component: PdfToolsComponent },  
  { path: 'compress-image', component: CompressImageComponent },
  { path: 'edit-pdf', component: EditPdfComponent },
  { path: 'word-to-pdf', component: WordToPdfComponent },
  { path: 'merge-images-to-pdf', component: MergeImagesToPdfComponent },
  { path: 'protect-pdf-password', component: ProtectPdfPasswordComponent },
  { path: 'remove-pdf-password', component: RemovePdfPasswordComponent },
  { path: '', redirectTo: '/pdf-tools', pathMatch: 'full' },
  { path: '**', redirectTo: '/pdf-tools' }, // optional: handle 404s

];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
