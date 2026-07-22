import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PiDependencyResponse } from '../models/pi-planning.model';
import { PiDependencyLayerComponent } from './pi-dependency-layer.component';

const dependency: PiDependencyResponse = {
  id: 'd-1',
  cycleId: 'c-1',
  fromTicketId: 'tk-a',
  toTicketId: 'tk-b',
  status: 'OK',
  note: 'Blocked by API delivery',
};

describe('PiDependencyLayerComponent', () => {
  let wrapper: HTMLDivElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PiDependencyLayerComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    }).compileComponents();

    wrapper = document.createElement('div');
    const from = document.createElement('div');
    from.setAttribute('data-ticket-id', 'tk-a');
    const to = document.createElement('div');
    to.setAttribute('data-ticket-id', 'tk-b');
    wrapper.appendChild(from);
    wrapper.appendChild(to);
    document.body.appendChild(wrapper);
  });

  afterEach(() => {
    wrapper.remove();
  });

  function createFixture(dependencies: PiDependencyResponse[] = [dependency]) {
    const fixture = TestBed.createComponent(PiDependencyLayerComponent);
    fixture.componentRef.setInput('dependencies', dependencies);
    fixture.componentRef.setInput('wrapperElement', wrapper);
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();
    return fixture;
  }

  it('computes no arrows without a wrapper element', () => {
    const fixture = TestBed.createComponent(PiDependencyLayerComponent);
    fixture.componentRef.setInput('dependencies', [dependency]);
    fixture.detectChanges();
    expect(fixture.componentInstance.arrows()).toEqual([]);
  });

  it('computes an arrow when both ticket anchors exist in the wrapper', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.arrows()).toHaveLength(1);
    expect(fixture.componentInstance.arrows()[0].dependency.id).toBe('d-1');
  });

  it('skips a dependency whose ticket anchor is missing from the DOM', () => {
    const missing: PiDependencyResponse = { ...dependency, id: 'd-2', toTicketId: 'tk-missing' };
    const fixture = createFixture([missing]);
    expect(fixture.componentInstance.arrows()).toEqual([]);
  });

  it('openPopover()/closePopover() toggle the open dependency and prefill the note draft', () => {
    const fixture = createFixture();
    fixture.componentInstance.openPopover('d-1');
    expect(fixture.componentInstance.openDependencyId()).toBe('d-1');
    expect(fixture.componentInstance.noteDraft()).toBe('Blocked by API delivery');

    fixture.componentInstance.closePopover();
    expect(fixture.componentInstance.openDependencyId()).toBeNull();
  });

  it('setStatus() emits updateDependency with the open dependency id and new status', () => {
    const fixture = createFixture();
    fixture.componentInstance.openPopover('d-1');
    let emitted: { depId: string; patch: { status?: 'OK' | 'BLOCKED' } } | undefined;
    fixture.componentInstance.updateDependency.subscribe(e => (emitted = e));

    fixture.componentInstance.setStatus('BLOCKED');
    expect(emitted).toEqual({ depId: 'd-1', patch: { status: 'BLOCKED' } });
  });

  it('saveNote() emits only when the note actually changed', () => {
    const fixture = createFixture();
    fixture.componentInstance.openPopover('d-1');
    const emissions: unknown[] = [];
    fixture.componentInstance.updateDependency.subscribe(e => emissions.push(e));

    // Unchanged note (same as the dependency's) — no emission.
    fixture.componentInstance.saveNote();
    expect(emissions).toHaveLength(0);

    fixture.componentInstance.onNoteInput({ target: { value: 'New note' } } as unknown as Event);
    fixture.componentInstance.saveNote();
    expect(emissions).toEqual([{ depId: 'd-1', patch: { note: 'New note' } }]);
  });

  it('deleteOpen() emits deleteDependency and closes the popover', () => {
    const fixture = createFixture();
    fixture.componentInstance.openPopover('d-1');
    let emitted: string | undefined;
    fixture.componentInstance.deleteDependency.subscribe(id => (emitted = id));

    fixture.componentInstance.deleteOpen();
    expect(emitted).toBe('d-1');
    expect(fixture.componentInstance.openDependencyId()).toBeNull();
  });
});
