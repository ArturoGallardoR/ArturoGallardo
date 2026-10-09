import { describe, expect, it } from 'vitest';
import {
  buildCalConfig,
  contactLinks,
  normalizeCalLink,
  resolveBooking,
  trackingFromSearch,
} from '../src/js/booking-config.js';

describe('normalizeCalLink', () => {
  it('accepts the formats people actually paste from Cal.com', () => {
    expect(normalizeCalLink('arturo-gallardo/primera-llamada')).toBe('arturo-gallardo/primera-llamada');
    expect(normalizeCalLink('https://cal.com/arturo-gallardo/primera-llamada')).toBe('arturo-gallardo/primera-llamada');
    expect(normalizeCalLink('cal.com/arturo-gallardo/primera-llamada/?month=2026-10')).toBe('arturo-gallardo/primera-llamada');
    expect(normalizeCalLink('  /arturo-gallardo/15min/  ')).toBe('arturo-gallardo/15min');
  });

  it('rejects empty values and links that are not Cal.com', () => {
    expect(normalizeCalLink('')).toBeNull();
    expect(normalizeCalLink(undefined)).toBeNull();
    expect(normalizeCalLink('https://calendly.com/arturo/15min')).toBeNull();
    expect(normalizeCalLink('arturo/<script>')).toBeNull();
  });
});

describe('resolveBooking', () => {
  it('uses Cal.com when it is configured', () => {
    const r = resolveBooking({ provider: 'cal', cal: { link: 'https://cal.com/ag/primera-llamada' } });
    expect(r).toMatchObject({ kind: 'cal', calLink: 'ag/primera-llamada', embedScript: 'https://app.cal.com/embed/embed.js' });
  });

  it('respects a regional Cal.com origin for the embed script', () => {
    const r = resolveBooking({ cal: { link: 'ag/x', origin: 'https://app.cal.eu/' } });
    expect(r.embedScript).toBe('https://app.cal.eu/embed/embed.js');
  });

  it('falls back to the other provider when the selected one is empty', () => {
    const r = resolveBooking({ provider: 'cal', cal: { link: '' }, google: { url: 'https://calendar.app.google/AbC123' } });
    expect(r.kind).toBe('google');
    expect(new URL(r.url).searchParams.get('gv')).toBe('true');
  });

  it('does not embed arbitrary URLs as a Google booking page', () => {
    const r = resolveBooking({ provider: 'google', google: { url: 'https://evil.example.com/calendar.app.google/' } });
    expect(r.kind).toBe('none');
  });
});

describe('lead attribution', () => {
  it('keeps campaign params from the landing URL and drops unrelated ones', () => {
    expect(trackingFromSearch('?utm_source=instagram&utm_campaign=otono&foo=1&gclid=abc')).toEqual({
      utm_source: 'instagram',
      utm_campaign: 'otono',
      gclid: 'abc',
    });
  });

  it('passes the chosen plan and campaign into the booking so Arturo sees them', () => {
    const config = buildCalConfig({ interest: 'Gastos médicos mayores', tracking: { utm_source: 'facebook' } });
    expect(config.notes).toContain('Gastos médicos mayores');
    expect(config['metadata[interes]']).toBe('Gastos médicos mayores');
    expect(config['metadata[utm_source]']).toBe('facebook');
  });
});

describe('contactLinks', () => {
  it('builds a WhatsApp link with a prefilled message and skips invalid channels', () => {
    const links = contactLinks({ whatsapp: '+52 1 55 1234 5678', email: 'no-es-correo' }, 'Ahorro y retiro');
    expect(links).toHaveLength(1);
    expect(links[0].href.startsWith('https://wa.me/5215512345678?text=')).toBe(true);
    expect(decodeURIComponent(links[0].href)).toContain('Ahorro y retiro');
  });
});
