import { describe, expect, it } from 'vitest';
import { CARD_ORDER, ROUTE_ORDER, checkRoute, connectedPrefix, dropCard, initialRoute, placeInSlot, selectCard, submitRoute, trayCards } from '../../src/model/route.ts';
import { routeFeedback } from '../../src/content/feedback.ts';
import { validateContent } from '../../src/content/validate.ts';

function placeAll(order: readonly (typeof ROUTE_ORDER)[number][]) {
  let s = initialRoute();
  order.forEach((id, i) => {
    s = placeInSlot(selectCard(s, id), i);
  });
  return s;
}

describe('connection exercise (PC-03)', () => {
  it('the tray order is not already the answer', () => {
    expect(CARD_ORDER).not.toEqual(ROUTE_ORDER);
    expect([...CARD_ORDER].sort()).toEqual([...ROUTE_ORDER].sort());
  });

  it('the correct order connects the route', () => {
    const { state, result } = submitRoute(placeAll(ROUTE_ORDER));
    expect(result.correct).toBe(true);
    expect(state.connected).toBe(true);
    expect(state.attempts).toBe(1);
  });

  it('an incorrect order explains the misplaced stage and allows retry', () => {
    const swapped = ['generation', 'substation', 'transmission', 'distribution', 'buildings'] as const;
    const first = submitRoute(placeAll(swapped));
    expect(first.result.correct).toBe(false);
    expect(first.state.connected).toBe(false);
    const text = routeFeedback(first.result).join(' ');
    expect(text).toContain('Substation is not in step 2');
    expect(text).toContain('Transmission is not in step 3');

    // Retry: pick up the transmission card from slot 3 and put it in slot 2 (swaps with substation's slot).
    let s = first.state;
    s = placeInSlot(s, 2); // picks up transmission
    s = placeInSlot(s, 1); // drops it in step 2; substation leaves step 2
    s = placeInSlot(selectCard(s, 'substation'), 2);
    const second = submitRoute(s);
    expect(second.result.correct).toBe(true);
    expect(second.state.attempts).toBe(2);
  });

  it('flags an incomplete route', () => {
    const r = checkRoute([null, null, null, null, null]);
    expect(r.correct).toBe(false);
    if (!r.correct) expect(r.incomplete).toBe(true);
  });

  it('moving a card between slots never duplicates it', () => {
    let s = placeInSlot(selectCard(initialRoute(), 'generation'), 3);
    s = placeInSlot(selectCard(s, 'generation'), 0);
    expect(s.slots).toEqual(['generation', null, null, null, null]);
    expect(trayCards(s)).not.toContain('generation');
  });

  it('a connected route cannot be edited', () => {
    const { state } = submitRoute(placeAll(ROUTE_ORDER));
    expect(placeInSlot(selectCard(state, 'buildings'), 0)).toEqual(state);
  });

  it('lights the route only up to the first gap', () => {
    expect(connectedPrefix(['generation', 'transmission', null, 'distribution', 'buildings'])).toBe(2);
    expect(connectedPrefix(ROUTE_ORDER)).toBe(5);
  });
});

describe('drag and drop', () => {
  it('drops a tray card into an empty step', () => {
    const s = dropCard(initialRoute(), 'generation', 0);
    expect(s.slots[0]).toBe('generation');
    expect(trayCards(s)).not.toContain('generation');
  });

  it('a tray card dropped on a filled step sends the old card back to the tray', () => {
    let s = dropCard(initialRoute(), 'substation', 0);
    s = dropCard(s, 'generation', 0);
    expect(s.slots[0]).toBe('generation');
    expect(trayCards(s)).toContain('substation');
  });

  it('dragging between steps swaps the two cards', () => {
    let s = dropCard(initialRoute(), 'substation', 1);
    s = dropCard(s, 'transmission', 2);
    s = dropCard(s, 'transmission', 1);
    expect(s.slots.slice(0, 3)).toEqual([null, 'transmission', 'substation']);
  });

  it('dropping on the tray removes the card from its step', () => {
    const s = dropCard(dropCard(initialRoute(), 'buildings', 4), 'buildings', null);
    expect(s.slots).toEqual([null, null, null, null, null]);
  });

  it('a full drag-built route checks the same as a tapped one', () => {
    const s = ROUTE_ORDER.reduce((acc, id, i) => dropCard(acc, id, i), initialRoute());
    expect(submitRoute(s).result.correct).toBe(true);
  });

  it('ignores drops once connected or out of range', () => {
    const connected = submitRoute(ROUTE_ORDER.reduce((acc, id, i) => dropCard(acc, id, i), initialRoute())).state;
    expect(dropCard(connected, 'generation', 3)).toEqual(connected);
    const s = initialRoute();
    expect(dropCard(s, 'generation', 9)).toEqual(s);
  });
});

describe('content', () => {
  it('passes development validation', () => {
    expect(validateContent(false)).toEqual([]);
  });
  it('release validation blocks unreviewed drafts', () => {
    expect(validateContent(true).length).toBeGreaterThan(0);
  });
});
