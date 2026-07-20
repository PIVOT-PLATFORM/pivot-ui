import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SharePanelComponent } from './share-panel.component';
import { ToastService } from '../../core/toast/toast.service';
import { BoardMember, ShareToken } from '../../core/whiteboard/board.model';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const BOARD_ID = 'board-abc-123';
const MEMBERS_URL = `${TEST_API_URL}/whiteboard/boards/${BOARD_ID}/members`;
const SHARE_URL = `${TEST_API_URL}/whiteboard/boards/${BOARD_ID}/share`;

const FR: Record<string, unknown> = {
  whiteboard: {
    share: {
      panel: {
        title: 'Partager le tableau',
        close: 'Fermer',
        inviteSection: 'Inviter par e-mail',
        invite: {
          emailLabel: 'E-mail',
          emailPlaceholder: 'nom@exemple.com',
          submit: 'Inviter',
          submitting: 'Envoi…',
          success: 'Invitation envoyée !',
          errorNotFound: 'E-mail inconnu',
          errorSelf: 'Auto-invitation impossible',
          errorInvalidEmail: 'E-mail invalide',
          errorForbidden: 'Non autorisé',
          errorGeneric: 'Erreur invitation',
        },
        linkSection: 'Lien d\'invitation',
        selectRole: 'Rôle :',
        generateLink: 'Générer un lien',
        generatingLink: 'Génération…',
        linkLabel: 'Lien',
        copyLink: 'Copier le lien',
        linkCopied: 'Lien copié !',
        clipboardFallback: 'Copiez manuellement.',
        generateError: 'Erreur génération',
        membersSection: 'Membres',
        memberUserId: 'ID',
        memberRole: 'Rôle',
        memberJoined: 'Date',
        changeRole: 'Changer le rôle',
        removeMember: 'Retirer',
        removeError: 'Erreur suppression',
        roleUpdateError: 'Erreur rôle',
        loadMembersError: 'Erreur membres',
        confirmRemove: {
          title: 'Retirer ce membre ?',
          message: 'Accès perdu.',
          confirm: 'Confirmer',
          cancel: 'Annuler',
        },
      },
    },
  },
};

// userId est un number : le backend sérialise public.users.id (Long). Des fixtures en UUID
// string rendaient `slice:0:8` valide en test alors qu'il jette NG02100 en production.
const OWNER: BoardMember = {
  userId: 101,
  role: 'OWNER',
  joinedAt: '2026-07-01T00:00:00Z',
};

const EDITOR: BoardMember = {
  userId: 202,
  role: 'EDITOR',
  joinedAt: '2026-07-02T00:00:00Z',
};

const TOKEN: ShareToken = {
  tokenId: 'tok-1',
  boardId: 'board-1',
  shareLink: 'https://recette.pivot-platform.fr/whiteboard/join?token=abc123def456',
  role: 'EDITOR',
  expiresAt: '2026-08-01T00:00:00Z',
};

describe('SharePanelComponent', () => {
  let fixture: ComponentFixture<SharePanelComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SharePanelComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: FR },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr'] },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SharePanelComponent);
    fixture.componentRef.setInput('boardId', BOARD_ID);
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  // ── Loading state ──
  it('shows loading spinner while members are being fetched', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[aria-busy="true"]')).toBeTruthy();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();
  });

  // ── Members loaded ──
  it('renders member rows on successful load', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.share-panel__tr');
    expect(rows.length).toBe(2);
    // OWNER badge present
    expect(fixture.nativeElement.querySelector('.share-panel__role-badge--owner')).toBeTruthy();
    // EDITOR gets a role select (non-owner)
    expect(fixture.nativeElement.querySelector(`#role-${EDITOR.userId}`)).toBeTruthy();
  });

  // ── Non-régression : identifiant numérique rendu tel quel ──
  // Le backend renvoie `public.users.id` (Long) : la cellule identifiant appliquait `slice:0:8`
  // dessus, ce qui jette NG02100 InvalidPipeArgument et vide TOUTE la ligne. Le bug était
  // invisible en test parce que les fixtures utilisaient des UUID string, sur lesquels `slice`
  // est valide. Ce test échoue si le pipe est réintroduit.
  it('renders a numeric member id without piping it through slice (NG02100 regression)', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    const idCell: HTMLElement = fixture.nativeElement.querySelector('.share-panel__td--id');
    expect(idCell).toBeTruthy();
    expect(idCell.textContent?.trim()).toBe(String(OWNER.userId));
  });

  // ── Error loading members ──
  it('shows error message when member list fails to load', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush('', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(el.textContent).toContain('Erreur membres');
  });

  // ── Owner has no remove button ──
  it('owner row has no remove button', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.share-panel__remove-btn')).toBeNull();
  });

  // ── Non-owner row has remove button ──
  it('non-owner row has remove button', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.share-panel__remove-btn')).toBeTruthy();
  });

  // ── Invite by e-mail — success (new member) ──
  it('invite form sends POST with email/role and appends the new member on success', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    const emailInput = fixture.nativeElement.querySelector('#invite-email-input') as HTMLInputElement;
    emailInput.value = 'new@pivot.invalid';
    emailInput.dispatchEvent(new Event('input'));

    const roleSelect = fixture.nativeElement.querySelector('#invite-role-select') as HTMLSelectElement;
    roleSelect.value = 'VIEWER';
    roleSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.share-panel__invite-btn') as HTMLButtonElement).click();

    const req = httpMock.expectOne(r => r.url === MEMBERS_URL && r.method === 'POST');
    expect(req.request.body).toEqual({ email: 'new@pivot.invalid', role: 'VIEWER' });

    const newMember: BoardMember = {
      userId: 303,
      role: 'VIEWER',
      joinedAt: '2026-07-10T00:00:00Z',
    };
    req.flush(newMember);
    fixture.detectChanges();

    expect(toastSpy).toHaveBeenCalledWith('whiteboard.share.panel.invite.success', 'success');
    expect((fixture.nativeElement.querySelector('#invite-email-input') as HTMLInputElement).value).toBe('');
    expect(fixture.nativeElement.textContent).toContain(String(newMember.userId));
  });

  // ── Invite by e-mail — success (re-invite updates existing member) ──
  it('invite form updates an existing member in place rather than duplicating it', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    const emailInput = fixture.nativeElement.querySelector('#invite-email-input') as HTMLInputElement;
    emailInput.value = 'editor@pivot.invalid';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.share-panel__invite-btn') as HTMLButtonElement).click();

    const req = httpMock.expectOne(r => r.url === MEMBERS_URL && r.method === 'POST');
    req.flush({ ...EDITOR, role: 'VIEWER' });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.share-panel__tr');
    expect(rows.length).toBe(2);
    const roleSelect = fixture.nativeElement.querySelector(
      `#role-${EDITOR.userId}`,
    ) as HTMLSelectElement;
    expect(roleSelect.value).toBe('VIEWER');
  });

  // ── Invite by e-mail — submit disabled without an e-mail ──
  it('invite submit button is disabled while the e-mail field is empty', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.share-panel__invite-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  // ── Invite by e-mail — INVITEE_NOT_FOUND ──
  it('shows the unknown-e-mail toast when the backend returns INVITEE_NOT_FOUND', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    const emailInput = fixture.nativeElement.querySelector('#invite-email-input') as HTMLInputElement;
    emailInput.value = 'nobody@pivot.invalid';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.share-panel__invite-btn') as HTMLButtonElement).click();

    httpMock.expectOne(r => r.url === MEMBERS_URL && r.method === 'POST')
      .flush({ code: 'INVITEE_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(toastSpy).toHaveBeenCalledWith('whiteboard.share.panel.invite.errorNotFound', 'error');
  });

  // ── Invite by e-mail — SELF_INVITE ──
  it('shows the self-invite toast when the backend returns SELF_INVITE', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    const emailInput = fixture.nativeElement.querySelector('#invite-email-input') as HTMLInputElement;
    emailInput.value = 'me@pivot.invalid';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.share-panel__invite-btn') as HTMLButtonElement).click();

    httpMock.expectOne(r => r.url === MEMBERS_URL && r.method === 'POST')
      .flush({ code: 'SELF_INVITE' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(toastSpy).toHaveBeenCalledWith('whiteboard.share.panel.invite.errorSelf', 'error');
  });

  // ── Invite by e-mail — non-owner caller (403, no code) ──
  it('shows the forbidden toast on a 403 with no machine-readable code', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    const emailInput = fixture.nativeElement.querySelector('#invite-email-input') as HTMLInputElement;
    emailInput.value = 'someone@pivot.invalid';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.share-panel__invite-btn') as HTMLButtonElement).click();

    httpMock.expectOne(r => r.url === MEMBERS_URL && r.method === 'POST')
      .flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(toastSpy).toHaveBeenCalledWith('whiteboard.share.panel.invite.errorForbidden', 'error');
  });

  // ── Invite by e-mail — generic failure ──
  it('shows the generic invite-error toast for an unmapped failure', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    const emailInput = fixture.nativeElement.querySelector('#invite-email-input') as HTMLInputElement;
    emailInput.value = 'someone@pivot.invalid';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.share-panel__invite-btn') as HTMLButtonElement).click();

    httpMock.expectOne(r => r.url === MEMBERS_URL && r.method === 'POST')
      .flush('', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(toastSpy).toHaveBeenCalledWith('whiteboard.share.panel.invite.errorGeneric', 'error');
  });

  // ── Generate link ──
  it('generate link button sends POST and shows the invitation link', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.share-panel__generate-btn') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    const req = httpMock.expectOne(r => r.url === SHARE_URL && r.method === 'POST');
    expect(req.request.body).toEqual({ role: 'EDITOR' });
    req.flush(TOKEN);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(TOKEN.shareLink);
  });

  // ── Generate link error ──
  it('shows toast when link generation fails', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__generate-btn').click();
    fixture.detectChanges();

    httpMock.expectOne(r => r.url === SHARE_URL && r.method === 'POST')
      .flush('', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(toastSpy).toHaveBeenCalledWith('whiteboard.share.panel.generateError', 'error');
  });

  // ── Copy link — clipboard available ──
  it('sets linkCopied after successful clipboard write', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__generate-btn').click();
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === SHARE_URL).flush(TOKEN);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__copy-btn').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Lien copié !');
  });

  // ── Copy link — clipboard unavailable → fallback input ──
  it('shows fallback readonly input when clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__generate-btn').click();
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === SHARE_URL).flush(TOKEN);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__copy-btn').click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('.share-panel__link-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.readOnly).toBe(true);
    expect(input.value).toContain(TOKEN.shareLink);
  });

  // ── Role change ──
  it('sends PATCH on role select change and updates member in list', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector(`#role-${EDITOR.userId}`) as HTMLSelectElement;
    select.value = 'VIEWER';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne(
      r => r.url === `${TEST_API_URL}/whiteboard/boards/${BOARD_ID}/members/${EDITOR.userId}/role` && r.method === 'PATCH',
    );
    expect(req.request.body).toEqual({ role: 'VIEWER' });
    req.flush({ ...EDITOR, role: 'VIEWER' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(`#role-${EDITOR.userId}`)).toBeTruthy();
  });

  // ── Role change error ──
  it('shows toast on role update failure', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector(`#role-${EDITOR.userId}`) as HTMLSelectElement;
    select.value = 'VIEWER';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    httpMock.expectOne(
      r => r.url.includes(`/members/${EDITOR.userId}/role`) && r.method === 'PATCH',
    ).flush('', { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(toastSpy).toHaveBeenCalledWith('whiteboard.share.panel.roleUpdateError', 'error');
  });

  // ── Remove member — confirm dialog opens ──
  it('clicking remove opens the confirm alertdialog', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__remove-btn').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Retirer ce membre ?');
  });

  // ── Remove member — cancel ──
  it('cancel in confirm dialog closes dialog without HTTP call', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__remove-btn').click();
    fixture.detectChanges();

    const cancelBtn = fixture.nativeElement.querySelector('.share-panel__dialog-btn--cancel') as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.share-panel__remove-btn')).toBeTruthy();
  });

  // ── Remove member — success ──
  it('confirms remove: sends DELETE and removes member from list', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__remove-btn').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__dialog-btn--confirm').click();
    fixture.detectChanges();

    httpMock.expectOne(
      r => r.url === `${TEST_API_URL}/whiteboard/boards/${BOARD_ID}/members/${EDITOR.userId}` && r.method === 'DELETE',
    ).flush(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector(`#role-${EDITOR.userId}`)).toBeNull();
  });

  // ── Remove member — error ──
  it('shows toast on remove failure', () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([OWNER, EDITOR]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.share-panel__remove-btn').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.share-panel__dialog-btn--confirm').click();
    fixture.detectChanges();

    httpMock.expectOne(
      r => r.url.includes(`/members/${EDITOR.userId}`) && r.method === 'DELETE',
    ).flush('', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(toastSpy).toHaveBeenCalledWith('whiteboard.share.panel.removeError', 'error');
  });

  // ── Close button ──
  it('close button emits closed event', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([]);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.closed.subscribe(() => { emitted = true; });

    fixture.nativeElement.querySelector('.share-panel__close-btn').click();
    expect(emitted).toBe(true);
  });

  // ── Escape key ──
  it('Escape key emits closed event', () => {
    fixture.detectChanges();
    httpMock.expectOne(MEMBERS_URL).flush([]);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.closed.subscribe(() => { emitted = true; });

    const panel = fixture.nativeElement.querySelector('.share-panel') as HTMLElement;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(emitted).toBe(true);
  });
});
