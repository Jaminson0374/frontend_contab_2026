import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { QuickCreateCategoryDialogComponent } from '../dialogs/quick-create-category.dialog';
import { QuickCreateIdTypeDialogComponent } from '../dialogs/quick-create-id-type.dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ThirdParty, ThirdPartyRequest } from '../../../../core/models/third-party.model';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { ThirdPartyCategoryService } from '../../../../core/services/third-party-category.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { calculateNitDv } from '../utils/nit-dv.utils';
import { PageResponse } from '../../../../core/models/page.model';

type FormMode = 'view' | 'new' | 'edit';

@Component({
  selector: 'app-third-party-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './third-party-form.html',
  styleUrl: './third-party-form.css',
})
export class ThirdPartyFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ThirdPartyService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly catService = inject(ThirdPartyCategoryService);
  readonly catalogService = inject(CatalogService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mode = signal<FormMode>('new');
  readonly selectedTab = signal(0);
  readonly showSearch = signal(false);
  readonly loadedId = signal<string | null>(null);
  readonly searching = signal(false);
  readonly searchResults = signal<ThirdParty[]>([]);
  readonly searchControl = new FormControl('', { nonNullable: true });

  // ── Autocomplete display controls ──────────────────────────────────
  readonly catDisplay = new FormControl('');
  readonly idTypeDisplay = new FormControl('');
  readonly deptDisplay = new FormControl('');
  readonly cityDisplay = new FormControl('');

  // ── Filter signals ─────────────────────────────────────────────────
  readonly catFilter = signal('');
  readonly idTypeFilter = signal('');
  readonly deptFilter = signal('');
  readonly cityFilter = signal('');

  // ── Filtered options ───────────────────────────────────────────────
  readonly filteredCats = computed(() => {
    const q = this.catFilter().toLowerCase();
    const all = this.catService.categories.value() ?? [];
    return q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
  });

  readonly filteredIdTypes = computed(() => {
    const q = this.idTypeFilter().toLowerCase();
    const all = this.catalogService.identificationTypes.value() ?? [];
    return q
      ? all.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
      : all;
  });

  readonly filteredDepts = computed(() => {
    const q = this.deptFilter().toLowerCase();
    const all = this.catalogService.departments.value() ?? [];
    return q ? all.filter((d) => d.name.toLowerCase().includes(q)) : all;
  });

  readonly filteredCities = computed(() => {
    const q = this.cityFilter().toLowerCase();
    const all = this.catalogService.cities.value() ?? [];
    return q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
  });

  // ── Main reactive form ─────────────────────────────────────────────
  readonly form = this.fb.group({
    thirdPartyCategoryId: [null as string | null, Validators.required],
    personType: ['JURIDICA', Validators.required],
    identificationTypeId: [null as string | null, Validators.required],
    numIdentification: ['', [Validators.required, Validators.maxLength(20)]],
    dv: [{ value: '', disabled: true }],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    lastName: [''],
    phone: [''],
    commonName: [''],
    address: [''],
    departmentId: [null as string | null],
    cityId: [null as string | null],
    email: ['', Validators.email],
    website: [''],
    active: [true],
    creditDays: [30],
    creditLimit: [0, [Validators.required, Validators.min(0)]],
    priceListId: [null as string | null],
    entryDate: [null as Date | null],
    contactName: [''],
    contactPhone: [''],
    contactAddress: [''],
    contactEmail: ['', Validators.email],
    taxContactFirstName: [''],
    taxContactLastName: [''],
    taxEmail: ['', Validators.email],
    billingPhone: [''],
    taxRegime: ['ORDINARIO'],
    isGranContribuyente: [false],
    isAutoretenedor: [false],
    isAgenteRetencionIva: [false],
    isRegimenSimple: [false],
    otherTaxResp: [false],
    empPosition: [''],
    empCostCenter: [''],
    empWorkCenter: [''],
    empGender: [''],
    empCivilStatus: [''],
    empSalesGroup: [''],
    empBirthDate: [null as Date | null],
    empBirthPlace: [''],
    empMilitaryId: [''],
    empIsForeigner: [false],
    empNatResidentExterior: [false],
    empIsDeclarant: [false],
    empAssociatedSeller: [''],
    empRequiresEndowment: [false],
    empIsSenior: [false],
  });

  // ── toSignals for effects ──────────────────────────────────────────
  private readonly numIdentificationSig = toSignal(
    this.form.get('numIdentification')!.valueChanges,
    { initialValue: '' },
  );
  private readonly idTypeSig = toSignal(this.form.get('identificationTypeId')!.valueChanges, {
    initialValue: null as string | null,
  });
  private readonly deptSig = toSignal(this.form.get('departmentId')!.valueChanges, {
    initialValue: null as string | null,
  });
  private readonly catSig = toSignal(this.form.get('thirdPartyCategoryId')!.valueChanges, {
    initialValue: null as string | null,
  });
  private readonly citySig = toSignal(this.form.get('cityId')!.valueChanges, {
    initialValue: null as string | null,
  });
  private readonly personTypeSig = toSignal(this.form.get('personType')!.valueChanges, {
    initialValue: 'JURIDICA',
  });

  // ── Derived computed ───────────────────────────────────────────────
  readonly isEmployee = computed(() => {
    const catId = this.catSig();
    return this.catService.categories.value()?.find((c) => c.id === catId)?.baseType === 'EMPLOYEE';
  });

  readonly requiresDv = computed(() => {
    const id = this.idTypeSig();
    return (
      this.catalogService.identificationTypes.value()?.find((t) => t.id === id)?.requiresDv ?? false
    );
  });

  readonly isNatural = computed(() => this.personTypeSig() === 'NATURAL');

  // ── Toolbar computed ───────────────────────────────────────────────
  readonly isEditing = computed(() => this.mode() === 'new' || this.mode() === 'edit');
  readonly onTab0 = computed(() => this.selectedTab() === 0);
  readonly canNuevo = computed(() => this.onTab0() && this.mode() === 'view');
  readonly canEditar = computed(() => this.mode() === 'view' && !!this.loadedId());
  readonly canGuardar = computed(() => this.isEditing() && !this.saving());
  readonly canCancelar = computed(() => this.isEditing());
  readonly canBuscar = computed(() => this.mode() !== 'edit');

  readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'new':
        return 'Nuevo tercero';
      case 'edit':
        return 'Editando tercero';
      default:
        return 'Detalle de tercero';
    }
  });

  readonly empSubNav = [
    { label: 'Datos Básicos', icon: 'info', active: true },
    { label: 'Núcleo Familiar', icon: 'family_restroom', active: false },
    { label: 'Liquidación Nómina', icon: 'payments', active: false },
    { label: 'Contratos', icon: 'description', active: false },
    { label: 'Tipo Nómina', icon: 'list_alt', active: false },
    { label: 'Aportes', icon: 'account_balance', active: false },
    { label: 'Estado de Salud', icon: 'health_and_safety', active: false },
    { label: 'Info. Académica', icon: 'school', active: false },
    { label: 'Exp. Laboral', icon: 'work_history', active: false },
    { label: 'Evaluaciones', icon: 'star_rate', active: false },
    { label: 'Memorandos', icon: 'mail', active: false },
    { label: 'Ver Liquidaciones', icon: 'receipt_long', active: false },
    { label: 'Procesos', icon: 'manage_accounts', active: false },
    { label: 'Dotación', icon: 'checkroom', active: false },
    { label: 'Desc. Automáticos', icon: 'discount', active: false },
  ];

  constructor() {
    // DV auto-calculation
    effect(() => {
      const numIdentification = this.numIdentificationSig() ?? '';
      this.form
        .get('dv')!
        .setValue(
          this.requiresDv() && numIdentification.length > 0
            ? calculateNitDv(numIdentification)
            : '',
          { emitEvent: false },
        );
    });

    // City cascade on department change
    effect(() => {
      const deptId = this.deptSig();
      this.catalogService.selectedDepartmentId.set(deptId);
      if (!deptId) {
        this.form.get('cityId')!.setValue(null, { emitEvent: false });
        this.cityDisplay.setValue('', { emitEvent: false });
      }
    });

    // Sync display controls when catalog data loads or form value changes
    effect(() => {
      const cats = this.catService.categories.value();
      const id = this.catSig();
      this.catDisplay.setValue(cats?.find((c) => c.id === id)?.name ?? '', { emitEvent: false });
    });

    effect(() => {
      const types = this.catalogService.identificationTypes.value();
      const id = this.idTypeSig();
      const t = types?.find((t) => t.id === id);
      this.idTypeDisplay.setValue(t ? `${t.code} — ${t.name}` : '', { emitEvent: false });
    });

    effect(() => {
      const depts = this.catalogService.departments.value();
      const id = this.deptSig();
      this.deptDisplay.setValue(depts?.find((d) => d.id === id)?.name ?? '', { emitEvent: false });
    });

    effect(() => {
      const cities = this.catalogService.cities.value();
      const id = this.citySig();
      this.cityDisplay.setValue(cities?.find((c) => c.id === id)?.name ?? '', { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.error.set(null);
      this.showSearch.set(false);
      this.selectedTab.set(0);

      if (!id) {
        this.loadedId.set(null);
        this.resetForm();
        this.mode.set('new');
        this.enableForm();
      } else {
        this.loadedId.set(id);
        this.loading.set(true);
        this.mode.set('view');
        this.disableForm();
        this.service.getById(id).subscribe({
          next: (data) => {
            this.loading.set(false);
            this.loadIntoForm(data);
          },
          error: () => {
            this.loading.set(false);
            this.error.set('Error al cargar el tercero.');
          },
        });
      }
    });

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => {
          const q = (value ?? '').trim();
          if (!q) {
            this.searching.set(false);
            this.searchResults.set([]);
            return of(null);
          }
          this.searching.set(true);
          return this.http.get<PageResponse<ThirdParty>>(
            `/api/v1/third-parties?q=${encodeURIComponent(q)}&size=10`,
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          this.searching.set(false);
          if (page) this.searchResults.set(page.content);
        },
        error: () => this.searching.set(false),
      });
  }

  // ── Form helpers ───────────────────────────────────────────────────
  private resetForm(): void {
    this.form.reset({
      personType: 'JURIDICA',
      active: true,
      creditDays: 30,
      creditLimit: 0,
      taxRegime: 'ORDINARIO',
    });
    [this.catDisplay, this.idTypeDisplay, this.deptDisplay, this.cityDisplay].forEach((c) =>
      c.setValue('', { emitEvent: false }),
    );
  }

  private loadIntoForm(data: ThirdParty): void {
    this.form.patchValue({
      thirdPartyCategoryId: data.thirdPartyCategoryId,
      personType: data.personType,
      identificationTypeId: data.identificationTypeId,
      numIdentification: data.numIdentification,
      dv: data.dv ?? '',
      name: data.name,
      lastName: data.lastName ?? '',
      phone: data.phone ?? '',
      commonName: data.commonName ?? '',
      address: data.address ?? '',
      departmentId: data.departmentId,
      cityId: data.cityId,
      email: data.email ?? '',
      website: data.website ?? '',
      active: data.active,
      creditDays: data.creditDays,
      creditLimit: data.creditLimit,
      priceListId: data.priceListId,
      entryDate: data.entryDate ? new Date(data.entryDate) : null,
      contactName: data.contactName ?? '',
      contactPhone: data.contactPhone ?? '',
      contactAddress: data.contactAddress ?? '',
      contactEmail: data.contactEmail ?? '',
      taxContactFirstName: data.taxContactFirstName ?? '',
      taxContactLastName: data.taxContactLastName ?? '',
      taxEmail: data.taxEmail ?? '',
      billingPhone: data.billingPhone ?? '',
      taxRegime: data.taxRegime,
      isGranContribuyente: data.isGranContribuyente,
      isAutoretenedor: data.isAutoretenedor,
      isAgenteRetencionIva: data.isAgenteRetencionIva,
      isRegimenSimple: data.isRegimenSimple,
      otherTaxResp: data.otherTaxResp,
      empPosition: data.employeeData?.position ?? '',
      empCostCenter: data.employeeData?.costCenter ?? '',
      empWorkCenter: data.employeeData?.workCenter ?? '',
      empGender: data.employeeData?.gender ?? '',
      empCivilStatus: data.employeeData?.civilStatus ?? '',
      empSalesGroup: data.employeeData?.salesGroup ?? '',
      empBirthDate: data.employeeData?.birthDate ? new Date(data.employeeData.birthDate) : null,
      empBirthPlace: data.employeeData?.birthPlace ?? '',
      empMilitaryId: data.employeeData?.militaryId ?? '',
      empIsForeigner: data.employeeData?.isForeigner ?? false,
      empNatResidentExterior: data.employeeData?.natResidentExterior ?? false,
      empIsDeclarant: data.employeeData?.isDeclarant ?? false,
      empAssociatedSeller: data.employeeData?.associatedSeller ?? '',
      empRequiresEndowment: data.employeeData?.requiresEndowment ?? false,
      empIsSenior: data.employeeData?.isSenior ?? false,
    });
    if (data.departmentId) {
      this.catalogService.selectedDepartmentId.set(data.departmentId);
    }
  }

  private enableForm(): void {
    this.form.enable();
    this.form.get('dv')!.disable();
    [this.catDisplay, this.idTypeDisplay, this.deptDisplay, this.cityDisplay].forEach((c) =>
      c.enable(),
    );
  }

  private disableForm(): void {
    this.form.disable();
    [this.catDisplay, this.idTypeDisplay, this.deptDisplay, this.cityDisplay].forEach((c) =>
      c.disable(),
    );
  }

  // ── Autocomplete selection + blur-sync handlers ────────────────────
  onCatSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncCatDisplay();
      this.openCreateCat();
      return;
    }
    this.form.get('thirdPartyCategoryId')!.setValue(ev.option.value);
    this.catDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.catFilter.set('');

    // Empleado → forzar Persona Natural y limpiar tipo de identificación
    setTimeout(() => {
      if (this.isEmployee()) {
        this.form.get('personType')!.setValue('NATURAL');
      }
    });
  }
  syncCatDisplay(): void {
    const id = this.form.get('thirdPartyCategoryId')!.value;
    this.catDisplay.setValue(
      this.catService.categories.value()?.find((c) => c.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.catFilter.set('');
  }

  onIdTypeSelected(ev: MatAutocompleteSelectedEvent): void {
    if (ev.option.value === '__create__') {
      this.syncIdTypeDisplay();
      this.openCreateIdType();
      return;
    }
    this.form.get('identificationTypeId')!.setValue(ev.option.value);
    this.idTypeDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.idTypeFilter.set('');
  }
  syncIdTypeDisplay(): void {
    const id = this.form.get('identificationTypeId')!.value;
    const t = this.catalogService.identificationTypes.value()?.find((t) => t.id === id);
    this.idTypeDisplay.setValue(t ? `${t.code} — ${t.name}` : '', { emitEvent: false });
    this.idTypeFilter.set('');
  }

  onDeptSelected(ev: MatAutocompleteSelectedEvent): void {
    this.form.get('departmentId')!.setValue(ev.option.value);
    this.deptDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.deptFilter.set('');
  }
  syncDeptDisplay(): void {
    const id = this.form.get('departmentId')!.value;
    this.deptDisplay.setValue(
      this.catalogService.departments.value()?.find((d) => d.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.deptFilter.set('');
  }

  onCitySelected(ev: MatAutocompleteSelectedEvent): void {
    this.form.get('cityId')!.setValue(ev.option.value);
    this.cityDisplay.setValue(ev.option.viewValue, { emitEvent: false });
    this.cityFilter.set('');
  }
  syncCityDisplay(): void {
    const id = this.form.get('cityId')!.value;
    this.cityDisplay.setValue(
      this.catalogService.cities.value()?.find((c) => c.id === id)?.name ?? '',
      { emitEvent: false },
    );
    this.cityFilter.set('');
  }

  // ── Quick-create dialogs ───────────────────────────────────────────
  openCreateCat(): void {
    this.dialog
      .open(QuickCreateCategoryDialogComponent, {
        disableClose: true,
        width: '400px',
        data: { initialName: this.catFilter() },
      })
      .afterClosed()
      .subscribe((cat) => {
        if (!cat) return;
        this.form.get('thirdPartyCategoryId')!.setValue(cat.id);
        this.catDisplay.setValue(cat.name, { emitEvent: false });
        this.catFilter.set('');
      });
  }

  openCreateIdType(): void {
    this.dialog
      .open(QuickCreateIdTypeDialogComponent, {
        disableClose: true,
        width: '400px',
        data: { initialCode: this.idTypeFilter() },
      })
      .afterClosed()
      .subscribe((idType) => {
        if (!idType) return;
        this.form.get('identificationTypeId')!.setValue(idType.id);
        this.idTypeDisplay.setValue(`${idType.code} — ${idType.name}`, { emitEvent: false });
        this.idTypeFilter.set('');
      });
  }

  // ── Toolbar actions ────────────────────────────────────────────────
  nuevo(): void {
    this.router.navigate(['..', 'nuevo'], { relativeTo: this.route });
  }

  editar(): void {
    this.mode.set('edit');
    this.enableForm();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing = this.collectMissingFieldLabels();
      const detail = missing.length ? `<br><br><b>Falta(n):</b> ${missing.join(', ')}.` : '';
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        html: `Hay campos obligatorios sin diligenciar.${detail}`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ef4444',
      });
      return;
    }
    const v = this.form.getRawValue();

    const request: ThirdPartyRequest = {
      numIdentification: v.numIdentification!,
      dv: v.dv || null,
      identificationTypeId: v.identificationTypeId,
      thirdPartyCategoryId: v.thirdPartyCategoryId,
      personType: v.personType as any,
      name: v.name!,
      lastName: v.lastName || null,
      commonName: v.commonName || null,
      phone: v.phone || null,
      address: v.address || null,
      departmentId: v.departmentId,
      cityId: v.cityId,
      email: v.email || null,
      website: v.website || null,
      creditDays: v.creditDays ?? 30,
      creditLimit: v.creditLimit ?? 0,
      priceListId: v.priceListId,
      entryDate: v.entryDate ? (v.entryDate as Date).toISOString().split('T')[0] : null,
      contactName: v.contactName || null,
      contactPhone: v.contactPhone || null,
      contactAddress: v.contactAddress || null,
      contactEmail: v.contactEmail || null,
      taxContactFirstName: v.taxContactFirstName || null,
      taxContactLastName: v.taxContactLastName || null,
      taxEmail: v.taxEmail || null,
      billingPhone: v.billingPhone || null,
      taxRegime: (v.taxRegime as any) ?? 'ORDINARIO',
      taxResponsibilities: [],
      isGranContribuyente: v.isGranContribuyente ?? false,
      isAutoretenedor: v.isAutoretenedor ?? false,
      isAgenteRetencionIva: v.isAgenteRetencionIva ?? false,
      isRegimenSimple: v.isRegimenSimple ?? false,
      otherTaxResp: v.otherTaxResp ?? false,
      cityCode: null,
      dianClassification: null,
      employeeData: this.isEmployee()
        ? {
            position: v.empPosition || null,
            costCenter: v.empCostCenter || null,
            workCenter: v.empWorkCenter || null,
            gender: v.empGender || null,
            civilStatus: v.empCivilStatus || null,
            salesGroup: v.empSalesGroup || null,
            birthDate: v.empBirthDate ? (v.empBirthDate as Date).toISOString().split('T')[0] : null,
            birthPlace: v.empBirthPlace || null,
            militaryId: v.empMilitaryId || null,
            isForeigner: v.empIsForeigner ?? false,
            natResidentExterior: v.empNatResidentExterior ?? false,
            isDeclarant: v.empIsDeclarant ?? false,
            associatedSeller: v.empAssociatedSeller || null,
            requiresEndowment: v.empRequiresEndowment ?? false,
            isSenior: v.empIsSenior ?? false,
          }
        : null,
    };

    this.saving.set(true);
    this.error.set(null);

    const id = this.loadedId();
    const op$ = id ? this.service.update(id, request) : this.service.create(request);

    op$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.mode.set('view');
        this.disableForm();
        this.service.reload();
        Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          text: 'Tercero guardado correctamente.',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        if (!id) {
          this.router.navigate(['..', saved.id], { relativeTo: this.route });
        } else {
          this.loadedId.set(saved.id);
          this.loadIntoForm(saved);
        }
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Error al guardar. Intentá de nuevo.';
        this.error.set(msg);
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: msg,
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#ef4444',
        });
      },
    });
  }

  private collectMissingFieldLabels(): string[] {
    const labels: Record<string, string> = {
      thirdPartyCategoryId: 'Tipo de tercero',
      personType: 'Tipo de persona',
      identificationTypeId: 'Tipo de identificación',
      numIdentification: 'NIT / identificación',
      name: 'Nombre / Razón social',
      creditLimit: 'Cupo de crédito',
      email: 'Email (formato inválido)',
      contactEmail: 'Email de contacto (formato inválido)',
      taxEmail: 'Email facturación (formato inválido)',
    };
    const missing: string[] = [];
    Object.entries(this.form.controls).forEach(([key, ctrl]) => {
      if (ctrl.invalid && labels[key]) missing.push(labels[key]);
    });
    return missing;
  }

  async cancelar(): Promise<void> {
    const isNew = this.mode() === 'new';
    const result = await Swal.fire({
      icon: 'warning',
      title: isNew ? '¿Cancelar creación?' : '¿Cancelar edición?',
      text: isNew ? 'Los datos ingresados se perderán.' : 'Los cambios no guardados se perderán.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Seguir editando',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const id = this.loadedId();
    if (id) {
      this.mode.set('view');
      this.disableForm();
      this.service.getById(id).subscribe({
        next: (data) => this.loadIntoForm(data),
        error: () => this.error.set('Error al recargar los datos.'),
      });
    } else {
      this.resetForm();
    }
  }

  buscar(): void {
    this.showSearch.set(!this.showSearch());
    if (!this.showSearch()) {
      this.searchControl.setValue('', { emitEvent: false });
      this.searchResults.set([]);
    }
  }

  selectSearchResult(tp: ThirdParty): void {
    this.showSearch.set(false);
    this.searchControl.setValue('', { emitEvent: false });
    this.searchResults.set([]);
    this.router.navigate(['..', tp.id], { relativeTo: this.route });
  }

  goBack(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
