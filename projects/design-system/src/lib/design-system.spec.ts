/**
 * @pivot/design-system library smoke test (EN17.8).
 * Vérifie que le public-api exporte les tokens d'injection et composants attendus.
 */
describe('@pivot/design-system public API', () => {
  it('exports the ConfirmDialogComponent', async () => {
    const { ConfirmDialogComponent } = await import('../public-api');
    expect(ConfirmDialogComponent).toBeDefined();
  });

  it('exports the ToastService and ToastComponent', async () => {
    const { ToastService, ToastComponent } = await import('../public-api');
    expect(ToastService).toBeDefined();
    expect(ToastComponent).toBeDefined();
  });

  it('exports PasswordStrengthComponent and DESIGN_SYSTEM_API_URL token', async () => {
    const { PasswordStrengthComponent, DESIGN_SYSTEM_API_URL } = await import('../public-api');
    expect(PasswordStrengthComponent).toBeDefined();
    expect(DESIGN_SYSTEM_API_URL).toBeDefined();
  });
});
