import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPdfComponent } from './edit-pdf.component';

describe('EditPdfComponent', () => {
  let component: EditPdfComponent;
  let fixture: ComponentFixture<EditPdfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPdfComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditPdfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
