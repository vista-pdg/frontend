import { runDemo } from './hu19';

export function openCodePanel() {
  cy.clearLocalStorage();
  cy.window().then(win => win.localStorage.setItem('vista_visualization_mode', '2D'));
  cy.registerStudentByApi('ui.panel');
  cy.visit('/');
  runDemo('demo-stack-simple', '3, 42, 8');
  cy.get('[data-cy=algorithm-panel] button[aria-label="Cerrar panel"]').click();
  cy.get('[data-cy=code-toggle]').then($button => {
    if ($button.attr('aria-expanded') === 'false') cy.wrap($button).click();
  });
  cy.get('[data-cy=code-panel]').should('be.visible');
}

export function panelRect() {
  // Keep the whole measurement a Cypress query so assertions retry against the current DOM.
  return cy.get('[data-cy=code-panel]').invoke('get', 0).invoke('getBoundingClientRect').invoke('toJSON');
}

/** Cypress synthetic pointers are not active OS pointers. Stub only native capture; rendered QA
 * exercises actual mouse capture. All trace/API, geometry and UI event handlers remain real. */
export function dragPanel(handleCy: 'code-move' | 'code-resize', dx: number, dy: number, pointerType = 'mouse', cancel: boolean | 'escape' = false) {
  cy.get(`[data-cy=${handleCy}]`).then($handle => {
    const handle = $handle[0];
    const rect = handle.getBoundingClientRect();
    const capture = cy.stub(handle, 'setPointerCapture');
    const options = { bubbles: true, pointerId: 17, isPrimary: true, button: 0, pointerType,
      clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 };
    try {
      handle.dispatchEvent(new PointerEvent('pointerdown', options));
      handle.dispatchEvent(new PointerEvent('pointermove', { ...options, clientX: options.clientX + dx, clientY: options.clientY + dy }));
      if (cancel === 'escape') handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      handle.dispatchEvent(new PointerEvent(cancel === true ? 'pointercancel' : 'pointerup', options));
    } finally { capture.restore(); }
  });
  // Synthetic move/up are synchronous; let React commit before capturing a comparison snapshot.
  cy.window().then(win => new Cypress.Promise<void>(resolve => win.requestAnimationFrame(() => resolve())));
}

export function expectPanelContained() {
  cy.get('[data-cy=code-panel]').should($panel => {
    const rect = $panel[0].getBoundingClientRect();
    const canvas = $panel[0].parentElement!.getBoundingClientRect();
    expect(rect.left).to.be.at.least(canvas.left);
    expect(rect.right).to.be.at.most(canvas.right);
    expect(rect.top).to.be.at.least(canvas.top);
    const player = Cypress.$('[data-cy=step-next]')[0].getBoundingClientRect();
    expect(rect.bottom).to.be.at.most(player.top - 8);
  });
  cy.get('[data-cy=step-next]').should('be.visible');
  cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth));
}
