import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import type { Role } from '@/types/auth';
import { RequireRole } from './guards';
const state = vi.hoisted(() => ({ roles: [] as string[] }));
vi.mock('@/contexts/useAuth', () => ({ useAuth: () => ({ hasRole: (role: string) => state.roles.includes(role), homeRoute: '/' }) }));
const render = (role: Role | readonly Role[]) => renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(RequireRole, { role, children: 'protected-content' })));
it.each(['TEACHER', 'ADMIN'])('allows %s to reach the analytics shell', role => {
  state.roles = [role]; expect(render(['TEACHER', 'ADMIN'])).toContain('protected-content');
});
it('denies students and missing roles while preserving single-role admin routes', () => {
  for (const roles of [['STUDENT'], []]) { state.roles = roles; expect(render(['TEACHER', 'ADMIN'])).not.toContain('protected-content'); }
  state.roles = ['TEACHER']; expect(render('ADMIN')).not.toContain('protected-content');
  state.roles = ['ADMIN']; expect(render('ADMIN')).toContain('protected-content');
});
