import { NgModule } from '@angular/core';
import { BrowserModule, Title, Meta, provideClientHydration } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Traditional Components
import { JpgToPdfComponent } from './tools/jpg-to-pdf/jpg-to-pdf.component';
import { EditPdfComponent } from './tools/edit-pdf/edit-pdf.component';
import { PdfToWordComponent } from './tools/pdf-to-word/pdf-to-word.component';
import { WordToPdfComponent } from './tools/word-to-pdf/word-to-pdf.component';
import { MergeImagesToPdfComponent } from './tools/merge-images-to-pdf/merge-images-to-pdf.component';
import { PdfToolsComponent } from './tools/pdf-tools/pdf-tools.component';
import { CompressPdfComponent } from './tools/compress-pdf/compress-pdf.component';
import { ImageToolsComponent } from './tools/image-tools/image-tools.component';

// Standalone Components
import { ProtectPdfPasswordComponent } from './tools/protect-pdf-password/protect-pdf-password.component';
import { RemovePdfPasswordComponent } from './tools/remove-pdf-password/remove-pdf-password.component';
import { WordEditComponent } from './tools/word-edit/word-edit.component';
import { PrivacyPolicyComponent } from './tools/privacy-policy/privacy-policy.component';
import { ContactComponent } from './tools/contact/contact.component';
import { AboutComponent } from './tools/about/about.component';

@NgModule({
  declarations: [
    AppComponent,
    JpgToPdfComponent,
    EditPdfComponent,
    PdfToWordComponent,
    WordToPdfComponent,
    MergeImagesToPdfComponent,
    PdfToolsComponent,
    CompressPdfComponent,
    ImageToolsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule,

    // ✅ Standalone components (put in `imports[]`)
    ProtectPdfPasswordComponent,
    RemovePdfPasswordComponent,
    WordEditComponent,
    PrivacyPolicyComponent,
    ContactComponent,
    AboutComponent
  ],
  providers: [Title, Meta, provideClientHydration()],
  bootstrap: [AppComponent]
})
export class AppModule { }
