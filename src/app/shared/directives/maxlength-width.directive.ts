import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({ selector: 'input[matInput][maxlength]' })
export class MaxlengthWidthDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLInputElement>);

  ngAfterViewInit() {
    const max = Number(this.el.nativeElement.getAttribute('maxlength'));
    if (!max) return;

    const field = this.el.nativeElement.closest('mat-form-field') as HTMLElement | null;
    if (!field) return;

    // ~0.65ch per char + 4ch de padding, máx 50ch (~400px a 13px)
    const ch = Math.min(max * 0.65 + 4, 50);
    field.style.width = `${ch}ch`;
  }
}
