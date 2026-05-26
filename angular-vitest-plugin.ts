import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Plugin } from 'vite';

const TEMPLATE_URL_RE = /templateUrl:\s*['"]([^'"]+)['"]/g;
const STYLE_URL_RE = /styleUrl:\s*['"]([^'"]+)['"]/g;

export function angularVitestPlugin(): Plugin {
  return {
    name: 'angular-vitest',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.endsWith('.ts') || id.includes('.spec.ts') || id.includes('.test.ts')) {
        return null;
      }

      if (!code.includes('templateUrl') && !code.includes('styleUrl')) {
        return null;
      }

      const dir = dirname(id);
      let transformed = code;

      transformed = transformed.replace(TEMPLATE_URL_RE, (_, url: string) => {
        const templatePath = resolve(dir, url);
        if (existsSync(templatePath)) {
          const content = readFileSync(templatePath, 'utf-8');
          const escaped = content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
          return `template: \`${escaped}\``;
        }
        return _;
      });

      transformed = transformed.replace(STYLE_URL_RE, (_, url: string) => {
        const stylePath = resolve(dir, url);
        if (existsSync(stylePath)) {
          const content = readFileSync(stylePath, 'utf-8');
          const escaped = content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
          return `styles: [\`${escaped}\`]`;
        }
        return _;
      });

      if (transformed !== code) {
        return { code: transformed, map: null };
      }
      return null;
    },
  };
}
