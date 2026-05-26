import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ThirdPartyService } from '../../../../core/services/third-party.service';
import { ThirdPartyCategoryService } from '../../../../core/services/third-party-category.service';

@Component({
  selector: 'app-third-party-list',
  standalone: true,
  imports: [
    DecimalPipe, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatChipsModule,
    MatProgressSpinnerModule, MatPaginatorModule,
  ],
  templateUrl: './third-party-list.html',
  styleUrl: './third-party-list.css',
})
export class ThirdPartyListComponent implements OnInit {
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly service    = inject(ThirdPartyService);
  readonly catService = inject(ThirdPartyCategoryService);

  readonly displayedColumns = ['index', 'numIdentification', 'name', 'category', 'personType', 'creditLimit', 'actions'];
  readonly pageSizeOptions  = [10, 20, 30];

  readonly searchControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(value => {
        this.service.query.set(value.trim());
        this.service.page.set(0);
      });
  }

  getCategoryName(id: string | null | undefined): string {
    if (!id) return '';
    return this.catService.categories.value()?.find(c => c.id === id)?.name ?? '';
  }

  openNew(): void {
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  openEdit(id: string): void {
    this.router.navigate([id], { relativeTo: this.route });
  }

  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.service.pageSize()) {
      this.service.pageSize.set(ev.pageSize);
      this.service.page.set(0);
    } else {
      this.service.page.set(ev.pageIndex);
    }
  }
}
