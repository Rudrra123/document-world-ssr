import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { JpgToPdfComponent } from './tools/jpg-to-pdf/jpg-to-pdf.component';
import { EditPdfComponent } from './tools/edit-pdf/edit-pdf.component';
import { PdfToWordComponent } from './tools/pdf-to-word/pdf-to-word.component';
import { WordToPdfComponent } from './tools/word-to-pdf/word-to-pdf.component';
import { MergeImagesToPdfComponent } from './tools/merge-images-to-pdf/merge-images-to-pdf.component';
import { PdfToolsComponent } from './tools/pdf-tools/pdf-tools.component';

// ✅ Standalone components should go in `imports[]`, not `declarations[]`
import { ProtectPdfPasswordComponent } from './tools/protect-pdf-password/protect-pdf-password.component';
import { RemovePdfPasswordComponent } from './tools/remove-pdf-password/remove-pdf-password.component';
import { WordEditComponent } from './tools/word-edit/word-edit.component'; // ✅ Import
import { CompressPdfComponent } from './tools/compress-pdf/compress-pdf.component';
import { ImageToolsComponent } from './tools/image-tools/image-tools.component';

@NgModule({
  declarations: [
    AppComponent,
    JpgToPdfComponent,
    EditPdfComponent,
    PdfToWordComponent,
    WordToPdfComponent,
    ImageToolsComponent,
    MergeImagesToPdfComponent,
    PdfToolsComponent,
    CompressPdfComponent 
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule,

    // ✅ Import standalone components here
    ProtectPdfPasswordComponent,
    RemovePdfPasswordComponent,
   WordEditComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
