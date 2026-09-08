import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { BuyMeACoffeeButton, BmcCupIcon } from '../windi/buy-me-a-coffee';

describe('Buy Me A Coffee widget button', () => {
  it('renders authentic Buy Me A Coffee button attributes and link', () => {
    const html = renderToString(React.createElement(BuyMeACoffeeButton));

    expect(html).toContain('href="https://buymeacoffee.com/windistudio"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('data-name="bmc-button"');
    expect(html).toContain('data-slug="windistudio"');
    expect(html).toContain('data-color="#FFDD00"');
    expect(html).toContain('data-font="Comic"');
    expect(html).toContain('data-text="Buy me a coffee"');
    expect(html).toContain('Buy me a coffee');
    expect(html).toContain('bmc-button-badge');
  });

  it('renders the official Buy Me A Coffee SVG cup icon', () => {
    const iconHtml = renderToString(React.createElement(BmcCupIcon, { size: 16 }));
    expect(iconHtml).toContain('<svg');
    expect(iconHtml).toContain('viewBox="0 0 884 1279"');
    expect(iconHtml).toContain('logo-coffee');
    expect(iconHtml).toContain('fill="#ffffff"');
  });

  it('embeds Buy Me A Coffee button inside DuckHuntModal', async () => {
    const { DuckHuntModal } = await import('../windi/duck-hunt-modal');
    const html = renderToString(
      React.createElement(DuckHuntModal, { isOpen: true, onClose: () => {} })
    );

    expect(html).toContain('href="https://buymeacoffee.com/windistudio"');
    expect(html).toContain('duck-bmc-btn');
    expect(html).toContain('duck-bmc-divider');
    expect(html).toContain('HOẶC ỦNG HỘ QUA');
    expect(html).toContain('QUACK // CẶP CẶP');
    expect(html).toContain('[ Tùy tâm ]');
    expect(html).toContain('Bỏ qua');
  });

  it('renders DuckHuntModal in English when language is en', async () => {
    const { DuckHuntModal } = await import('../windi/duck-hunt-modal');
    const { LanguageProvider } = await import('../windi/language-mode');

    const html = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'en' },
        React.createElement(DuckHuntModal, { isOpen: true, onClose: () => {} })
      )
    );

    expect(html).toContain('QUACK // QUACK QUACK');
    expect(html).toContain('[ Custom ]');
    expect(html).toContain('DONATE VIA VIETQR');
    expect(html).toContain('OR SUPPORT VIA');
    expect(html).toContain('Maybe later');
  });
});

