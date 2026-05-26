import '@angular/compiler';
import { describe, expect, it } from 'vitest';

import { buildSearchParams } from './animal.service';

// Pure-function tests for the ICA lot search parameter builder.
// The search integration is tested indirectly: the httpResource URL builder
// delegates to buildSearchParams, and the AnimalListComponent's ngOnInit
// sets query → reload → httpResource fires with the updated params.
describe('AnimalService — ICA lot search (buildSearchParams)', () => {
  describe('buildSearchParams', () => {
    it('includes only page and size when no query and no status', () => {
      const params = buildSearchParams({ page: 0, pageSize: 10, query: '', status: null });
      expect(params).toContain('page=0');
      expect(params).toContain('size=10');
      expect(params).not.toContain('search=');
      expect(params).not.toContain('status=');
    });

    it('includes search param when query is set', () => {
      const params = buildSearchParams({
        page: 0,
        pageSize: 10,
        query: 'LOTE-001',
        status: null,
      });
      expect(params).toContain('search=');
      expect(params).toContain('LOTE-001');
    });

    it('includes status param when status is set', () => {
      const params = buildSearchParams({
        page: 0,
        pageSize: 10,
        query: '',
        status: 'RECEIVED',
      });
      expect(params).toContain('status=RECEIVED');
      expect(params).not.toContain('search=');
    });

    it('includes both search and status when both are set', () => {
      const params = buildSearchParams({
        page: 1,
        pageSize: 20,
        query: 'ICA-42',
        status: 'SLAUGHTERED',
      });
      expect(params).toContain('page=1');
      expect(params).toContain('size=20');
      expect(params).toContain('search=');
      expect(params).toContain('ICA-42');
      expect(params).toContain('status=SLAUGHTERED');
    });

    it('trims query whitespace before encoding', () => {
      const params = buildSearchParams({
        page: 0,
        pageSize: 10,
        query: '  LOTE-X  ',
        status: null,
      });
      expect(params).toContain('LOTE-X');
      expect(params).not.toContain('  LOTE-X');
    });
  });
});
