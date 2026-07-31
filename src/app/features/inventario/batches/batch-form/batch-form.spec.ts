import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { BatchFormComponent } from './batch-form';
import { UnitOfMeasureService } from '../../../../core/services/unit-of-measure.service';
import { UnitOfMeasure } from '../../../../core/models/product-catalog.model';

describe('BatchFormComponent — document origin', () => {
  let component: BatchFormComponent;
  let fixture: ComponentFixture<BatchFormComponent>;

  const mockUoMs: UnitOfMeasure[] = [
    { id: 'uom-1', code: 'KG', name: 'Kilogramos', baseUnit: null, active: true },
    { id: 'uom-2', code: 'UN', name: 'Unidades', baseUnit: null, active: true },
    { id: 'uom-3', code: 'LT', name: 'Litros', baseUnit: null, active: false },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchFormComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BatchFormComponent);
    component = fixture.componentInstance;

    // Provide mock UoM data to the service
    const uomService = TestBed.inject(UnitOfMeasureService);
    (uomService.units as { value: () => UnitOfMeasure[] }).value = () => mockUoMs;

    fixture.detectChanges();
  });

  // ── RED: Form controls for document origin ──────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have sourceType form control with default NONE', () => {
    expect(component.form.contains('sourceType')).toBe(true);
    expect(component.form.get('sourceType')?.value).toBe('NONE');
  });

  it('should have ocId form control with default null', () => {
    expect(component.form.contains('ocId')).toBe(true);
    expect(component.form.get('ocId')?.value).toBeNull();
  });

  it('should have sourceReceiptId form control with default null', () => {
    expect(component.form.contains('sourceReceiptId')).toBe(true);
    expect(component.form.get('sourceReceiptId')?.value).toBeNull();
  });

  it('should have externalDocRef form control with default empty string', () => {
    expect(component.form.contains('externalDocRef')).toBe(true);
    expect(component.form.get('externalDocRef')?.value).toBe('');
  });

  // ── RED: Search signals for OC and Receipt ──────────────────────

  it('should have ocSearch signal initialized to empty string', () => {
    expect(component.ocSearch).toBeDefined();
    expect(component.ocSearch()).toBe('');
  });

  it('should have ocOptions signal initialized to empty array', () => {
    expect(component.ocOptions).toBeDefined();
    expect(component.ocOptions()).toEqual([]);
  });

  it('should have searchingOc signal initialized to false', () => {
    expect(component.searchingOc).toBeDefined();
    expect(component.searchingOc()).toBe(false);
  });

  it('should have receiptSearch signal initialized to empty string', () => {
    expect(component.receiptSearch).toBeDefined();
    expect(component.receiptSearch()).toBe('');
  });

  it('should have receiptOptions signal initialized to empty array', () => {
    expect(component.receiptOptions).toBeDefined();
    expect(component.receiptOptions()).toEqual([]);
  });

  it('should have searchingReceipt signal initialized to false', () => {
    expect(component.searchingReceipt).toBeDefined();
    expect(component.searchingReceipt()).toBe(false);
  });

  // ── RED: Existing controls still present ────────────────────────

  it('should still have supplierId form control', () => {
    expect(component.form.contains('supplierId')).toBe(true);
  });

  it('should still have warehouseId form control', () => {
    expect(component.form.contains('warehouseId')).toBe(true);
  });

  it('should still have productId form control', () => {
    expect(component.form.contains('productId')).toBe(true);
  });

  it('should still have productSearch form control', () => {
    expect(component.form.contains('productSearch')).toBe(true);
  });

  it('should still have entryDate form control', () => {
    expect(component.form.contains('entryDate')).toBe(true);
  });

  it('should still have initialWeight form control', () => {
    expect(component.form.contains('initialWeight')).toBe(true);
  });

  it('should still have purchaseCost form control', () => {
    expect(component.form.contains('purchaseCost')).toBe(true);
  });

  it('should still have notes form control', () => {
    expect(component.form.contains('notes')).toBe(true);
  });

  // ── RED: Form has exactly 14 controls (10 original + 4 doc origin) ─

  it('should have exactly 14 form controls after adding document origin fields and expirationDate/UoM', () => {
    const controls = Object.keys(component.form.controls);
    expect(controls.length).toBe(14);
  });

  // ── RED: onSourceTypeChange should clear non-selected fields ────

  it('should clear ocId when sourceType changes from OC to RECEIPT', () => {
    component.form.get('sourceType')?.setValue('OC');
    component.form.get('ocId')?.setValue('oc-123');
    // Now change to RECEIPT
    component.form.get('sourceType')?.setValue('RECEIPT');
    component.onSourceTypeChange();
    expect(component.form.get('ocId')?.value).toBeNull();
  });

  it('should clear sourceReceiptId when sourceType changes from RECEIPT to OC', () => {
    component.form.get('sourceType')?.setValue('RECEIPT');
    component.form.get('sourceReceiptId')?.setValue('rcpt-456');
    // Now change to OC
    component.form.get('sourceType')?.setValue('OC');
    component.onSourceTypeChange();
    expect(component.form.get('sourceReceiptId')?.value).toBeNull();
  });

  it('should clear ocId when switching from OC to RECEIPT', () => {
    component.form.get('sourceType')?.setValue('OC');
    component.form.get('ocId')?.setValue('oc-123');
    // Switch to RECEIPT
    component.form.get('sourceType')?.setValue('RECEIPT');
    component.onSourceTypeChange();
    expect(component.form.get('ocId')?.value).toBeNull();
  });

  it('should clear sourceReceiptId when switching from RECEIPT to OC', () => {
    component.form.get('sourceType')?.setValue('RECEIPT');
    component.form.get('sourceReceiptId')?.setValue('rcpt-456');
    // Switch to OC
    component.form.get('sourceType')?.setValue('OC');
    component.onSourceTypeChange();
    expect(component.form.get('sourceReceiptId')?.value).toBeNull();
  });

  it('should clear externalDocRef when sourceType is not EXTERNAL', () => {
    component.form.get('sourceType')?.setValue('EXTERNAL');
    component.form.get('externalDocRef')?.setValue('Factura #123');
    // Switch to OC
    component.form.get('sourceType')?.setValue('OC');
    component.onSourceTypeChange();
    expect(component.form.get('externalDocRef')?.value).toBe('');
  });

  // ── RED: onOcSelected sets ocId and clears receipt ──────────────

  it('should set ocId when OC is selected', () => {
    const po = { id: 'po-1', supplierName: 'Prov A', documentNumber: 'OC-001' } as any;
    component.onOcSelected(po);
    expect(component.form.get('ocId')?.value).toBe('po-1');
  });

  it('should clear sourceReceiptId when OC is selected', () => {
    component.form.get('sourceReceiptId')?.setValue('rcpt-789');
    const po = { id: 'po-2', supplierName: 'Prov B', documentNumber: 'OC-002' } as any;
    component.onOcSelected(po);
    expect(component.form.get('sourceReceiptId')?.value).toBeNull();
  });

  // ── RED: onReceiptSelected sets sourceReceiptId and clears OC ───

  it('should set sourceReceiptId when receipt is selected', () => {
    const receipt = { id: 'rcpt-1', receiptNumber: 'REC-001', receiptDate: '2026-07-13' } as any;
    component.onReceiptSelected(receipt);
    expect(component.form.get('sourceReceiptId')?.value).toBe('rcpt-1');
  });

  it('should clear ocId when receipt is selected', () => {
    component.form.get('ocId')?.setValue('po-3');
    const receipt = { id: 'rcpt-2', receiptNumber: 'REC-002', receiptDate: '2026-07-13' } as any;
    component.onReceiptSelected(receipt);
    expect(component.form.get('ocId')?.value).toBeNull();
  });

  // ── RED: Template — sourceType select rendered ──────────────────

  it('should render sourceType mat-select in the template', () => {
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    expect(html).toContain('formcontrolname="sourceType"');
  });

  it('should render OC autocomplete input when sourceType is OC', () => {
    component.form.get('sourceType')?.setValue('OC');
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    expect(html).toContain('Buscar por número de OC');
  });

  it('should render receipt autocomplete input when sourceType is RECEIPT', () => {
    component.form.get('sourceType')?.setValue('RECEIPT');
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    expect(html).toContain('Buscar recepción');
  });

  it('should render externalDocRef input when sourceType is EXTERNAL', () => {
    component.form.get('sourceType')?.setValue('EXTERNAL');
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    expect(html).toContain('formcontrolname="externalDocRef"');
  });

  it('should NOT render externalDocRef when sourceType is OC', () => {
    component.form.get('sourceType')?.setValue('OC');
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    expect(html).not.toContain('formcontrolname="externalDocRef"');
  });

  // ── RED: save() includes document origin fields ─────────────────

  it('should mark form as valid when all required fields are set', () => {
    component.form.get('supplierId')?.setValue('supplier-1');
    component.form.get('warehouseId')?.setValue('warehouse-1');
    component.form.get('productId')?.setValue('product-1');
    component.form.get('entryDate')?.setValue(new Date());
    component.form.get('sourceType')?.setValue('OC');
    component.form.get('initialWeight')?.setValue(100);
    component.form.get('purchaseCost')?.setValue(5000);
    expect(component.form.valid).toBe(true);
  });

  // ── TRIANGULATE: searchOc guards ─────────────────────────────────

  it('should clear ocOptions when searchOc query is shorter than 2 chars', () => {
    component.ocOptions.set([{ id: 'po-1', supplierName: 'A', documentNumber: 'OC-1' } as any]);
    component.searchOc('A');
    expect(component.ocOptions()).toEqual([]);
  });

  it('should clear ocOptions when searchOc query is empty', () => {
    component.ocOptions.set([{ id: 'po-1', supplierName: 'A', documentNumber: 'OC-1' } as any]);
    component.searchOc('');
    expect(component.ocOptions()).toEqual([]);
  });

  it('should set searchingOc to true when searchOc has valid query', () => {
    component.searchOc('OC-2026');
    expect(component.searchingOc()).toBe(true);
  });

  // ── TRIANGULATE: searchReceipt guards ────────────────────────────

  it('should clear receiptOptions when searchReceipt query is shorter than 2 chars', () => {
    component.receiptOptions.set([
      { id: 'r-1', receiptNumber: 'REC-1', receiptDate: '2026-01-01' } as any,
    ]);
    component.searchReceipt('R');
    expect(component.receiptOptions()).toEqual([]);
  });

  it('should clear receiptOptions when searchReceipt query is empty', () => {
    component.receiptOptions.set([
      { id: 'r-1', receiptNumber: 'REC-1', receiptDate: '2026-01-01' } as any,
    ]);
    component.searchReceipt('');
    expect(component.receiptOptions()).toEqual([]);
  });

  // ── TRIANGULATE: onSourceTypeChange resets search signals ────────

  it('should clear ocSearch signal when sourceType changes from OC to EXTERNAL', () => {
    component.form.get('sourceType')?.setValue('OC');
    component.ocSearch.set('OC-2026');
    component.ocOptions.set([{ id: 'po-1', supplierName: 'A', documentNumber: 'OC-1' } as any]);
    component.form.get('sourceType')?.setValue('EXTERNAL');
    component.onSourceTypeChange();
    expect(component.ocSearch()).toBe('');
    expect(component.ocOptions()).toEqual([]);
  });

  it('should clear receiptSearch signal when sourceType changes from RECEIPT to EXTERNAL', () => {
    component.form.get('sourceType')?.setValue('RECEIPT');
    component.receiptSearch.set('REC-001');
    component.receiptOptions.set([
      { id: 'r-1', receiptNumber: 'REC-1', receiptDate: '2026-01-01' } as any,
    ]);
    component.form.get('sourceType')?.setValue('EXTERNAL');
    component.onSourceTypeChange();
    expect(component.receiptSearch()).toBe('');
    expect(component.receiptOptions()).toEqual([]);
  });

  // ── TRIANGULATE: onOcInput / onReceiptInput ──────────────────────

  it('should update ocSearch signal via onOcInput', () => {
    const input = document.createElement('input');
    input.value = 'OC-2026';
    component.onOcInput({ target: input } as unknown as Event);
    expect(component.ocSearch()).toBe('OC-2026');
  });

  it('should update receiptSearch signal via onReceiptInput', () => {
    const input = document.createElement('input');
    input.value = 'REC-001';
    component.onReceiptInput({ target: input } as unknown as Event);
    expect(component.receiptSearch()).toBe('REC-001');
  });

  // ── TRIANGULATE: save() document origin mapping ──────────────────

  it('should form remain invalid when only sourceType is EXTERNAL with empty ref', () => {
    // External doc ref being empty should not make form valid
    component.form.get('sourceType')?.setValue('EXTERNAL');
    component.form.get('externalDocRef')?.setValue('');
    // Still missing required fields — form should be invalid
    expect(component.form.valid).toBe(false);
  });

  it('should set ocSearch on selecting an OC to documentNumber', () => {
    const po = { id: 'po-99', supplierName: 'Prov', documentNumber: 'OC-999' } as any;
    component.onOcSelected(po);
    expect(component.ocSearch()).toBe('OC-999');
  });

  it('should set receiptSearch on selecting a receipt to receiptNumber', () => {
    const receipt = {
      id: 'rcpt-99',
      receiptNumber: 'REC-999',
      receiptDate: '2026-07-13',
    } as any;
    component.onReceiptSelected(receipt);
    expect(component.receiptSearch()).toBe('REC-999');
  });

  // ── Phase 5: expirationDate form control ─────────────────────────

  it('should have expirationDate form control with default null', () => {
    expect(component.form.contains('expirationDate')).toBe(true);
    expect(component.form.get('expirationDate')?.value).toBeNull();
  });

  // ── Phase 5: unitOfMeasureId form control ────────────────────────

  it('should have unitOfMeasureId form control with default null', () => {
    expect(component.form.contains('unitOfMeasureId')).toBe(true);
    expect(component.form.get('unitOfMeasureId')?.value).toBeNull();
  });

  // ── Phase 5: product panel signals ────────────────────────────────

  it('should have showProductPanel signal initialized to false', () => {
    expect(component.showProductPanel).toBeDefined();
    expect(component.showProductPanel()).toBe(false);
  });

  it('should have productPanelData signal initialized to null', () => {
    expect(component.productPanelData).toBeDefined();
    expect(component.productPanelData()).toBeNull();
  });

  it('should have productPanelLoading signal initialized to false', () => {
    expect(component.productPanelLoading).toBeDefined();
    expect(component.productPanelLoading()).toBe(false);
  });

  it('should have productColumns defined with expected columns', () => {
    expect(component.productColumns).toEqual(['productCode', 'name', 'totalStock', 'salePrice']);
  });

  it('should open product panel via openProductPanel', () => {
    component.openProductPanel();
    expect(component.showProductPanel()).toBe(true);
  });

  it('should close product panel via closeProductPanel', () => {
    component.showProductPanel.set(true);
    component.productPanelData.set({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
    component.closeProductPanel();
    expect(component.showProductPanel()).toBe(false);
    expect(component.productPanelData()).toBeNull();
  });

  // ── Phase 5: selectProduct replaces onProductSelected ─────────────

  it('should set productId and unitOfMeasureId via selectProduct', () => {
    const product = {
      id: 'prod-1',
      name: 'Test Product',
      productCode: 'TP-001',
      unitOfMeasureId: 'uom-1',
    } as any;
    component.selectProduct(product);
    expect(component.form.get('productId')?.value).toBe('prod-1');
    expect(component.form.get('unitOfMeasureId')?.value).toBe('uom-1');
    expect(component.form.get('productSearch')?.value).toBe('Test Product (TP-001)');
    expect(component.showProductPanel()).toBe(false);
  });

  it('should not set unitOfMeasureId when product has no unitOfMeasureId via selectProduct', () => {
    component.form.get('unitOfMeasureId')?.setValue(null);
    const product = {
      id: 'prod-2',
      name: 'Test Product 2',
      productCode: 'TP-002',
      unitOfMeasureId: null,
    } as any;
    component.selectProduct(product);
    expect(component.form.get('unitOfMeasureId')?.value).toBeNull();
  });

  it('should clear product selection via clearProductSelection', () => {
    component.form.get('productId')?.setValue('prod-1');
    component.form.get('productSearch')?.setValue('Test');
    component.form.get('unitOfMeasureId')?.setValue('uom-1');
    component.selectedProduct.set({ id: 'prod-1', name: 'Test', productCode: 'TP' } as any);
    component.clearProductSelection();
    expect(component.form.get('productId')?.value).toBe('');
    expect(component.form.get('productSearch')?.value).toBe('');
    expect(component.form.get('unitOfMeasureId')?.value).toBeNull();
    expect(component.selectedProduct()).toBeNull();
  });

  it('isSelectedRow should return true for the selected product', () => {
    const product = { id: 'prod-3', name: 'P3', productCode: 'P3' } as any;
    component.selectedProduct.set(product);
    expect(component.isSelectedRow(product)).toBe(true);
  });

  it('isSelectedRow should return false for a different product', () => {
    component.selectedProduct.set({ id: 'prod-3', name: 'P3', productCode: 'P3' } as any);
    expect(component.isSelectedRow({ id: 'prod-9', name: 'Other', productCode: 'O' } as any)).toBe(
      false,
    );
  });

  // ── Phase 5: sourceType defaults to NONE ────────────────────────

  it('should have sourceType initialized to NONE (no Validators.required)', () => {
    expect(component.form.get('sourceType')?.value).toBe('NONE');
    expect(component.form.get('sourceType')?.valid).toBe(true);
  });

  it('should mark sourceType as valid when set to NONE', () => {
    component.form.get('sourceType')?.setValue('NONE');
    expect(component.form.get('sourceType')?.valid).toBe(true);
  });

  // ── Phase 5: NONE is the default option in sourceType dropdown ───

  it('should contain NONE option in sourceType dropdown', () => {
    component.form.get('sourceType')?.setValue('NONE');
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    expect(html).toContain('Sin documento');
  });

  // ── Phase 5: uomOptions filters active UoMs ──────────────────────

  it('should filter active UoMs in uomOptions', () => {
    const options = component.uomOptions();
    expect(options.length).toBe(2); // KG and UN only, LT is inactive
    expect(options.map((u) => u.code)).toEqual(['KG', 'UN']);
  });
});
