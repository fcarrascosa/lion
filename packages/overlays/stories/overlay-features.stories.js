import { storiesOf, html } from '@open-wc/demoing-storybook';
import { css, LitElement } from '@lion/core';
import { fixtureSync } from '@open-wc/testing-helpers';
import { OverlayController } from '../index.js';

const globalOverlayDemoStyle = css`
  .demo-overlay {
    background-color: white;
    width: 200px;
    border: 1px solid lightgrey;
  }
`;

storiesOf('Overlay System | Behavior Features', module)
  .add('preventsScroll', () => {
    const overlayCtrl = new OverlayController({
      placementMode: 'global',
      preventsScroll: true,
      contentNode: fixtureSync(html`
        <div class="demo-overlay">
          <p>Scrolling the body is blocked</p>
          <button @click="${() => overlayCtrl.hide()}">Close</button>
        </div>
      `),
    });

    return html`
      <style>
        ${globalOverlayDemoStyle}
      </style>
      <button
        @click="${event => overlayCtrl.show(event.target)}"
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        Open overlay
      </button>
      ${Array(50).fill(
        html`
          <p>Lorem ipsum</p>
        `,
      )}
    `;
  })
  .add('hasBackdrop', () => {
    const overlayCtrl = new OverlayController({
      placementMode: 'global',
      hasBackdrop: true,
      contentNode: fixtureSync(html`
        <div class="demo-overlay">
          <p>There is a backdrop</p>
          <button @click="${() => overlayCtrl.hide()}">Close</button>
        </div>
      `),
    });

    return html`
      <style>
        ${globalOverlayDemoStyle}
      </style>
      <button
        @click="${event => overlayCtrl.show(event.target)}"
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        Open overlay
      </button>
    `;
  })
  .add('trapsKeyboardFocus', () => {
    const overlayCtrl = new OverlayController({
      placementMode: 'global',
      trapsKeyboardFocus: true,
      contentNode: fixtureSync(html`
        <div class="demo-overlay">
          <p>Tab key is trapped within the overlay</p>

          <button id="el1">Button</button>
          <a id="el2" href="#">Anchor</a>
          <div id="el3" tabindex="0">Tabindex</div>
          <input id="el4" placeholder="Input" />
          <div id="el5" contenteditable="true">Contenteditable</div>
          <textarea id="el6">Textarea</textarea>
          <select id="el7">
            <option>1</option>
          </select>
          <button @click="${() => overlayCtrl.hide()}">Close</button>
        </div>
      `),
    });

    return html`
      <style>
        ${globalOverlayDemoStyle}
      </style>
      <a href="#">Anchor 1</a>
      <button
        @click="${event => overlayCtrl.show(event.target)}"
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        Open overlay
      </button>
      <a href="#">Anchor 2</a>
    `;
  })
  .add('trapsKeyboardFocus" (multiple)', () => {
    const overlayCtrl2 = new OverlayController({
      placementMode: 'global',
      trapsKeyboardFocus: true,
      viewportConfig: {
        placement: 'left',
      },
      contentNode: fixtureSync(html`
        <div class="demo-overlay">
          <p>Overlay 2. Tab key is trapped within the overlay</p>
          <button @click="${() => overlayCtrl2.hide()}">Close</button>
        </div>
      `),
    });

    const overlayCtrl1 = new OverlayController({
      placementMode: 'global',
      trapsKeyboardFocus: true,
      contentNode: fixtureSync(html`
        <div class="demo-overlay">
          <p>Overlay 1. Tab key is trapped within the overlay</p>
          <button
            @click="${event => overlayCtrl2.show(event.target)}"
            aria-haspopup="dialog"
            aria-expanded="false"
          >
            Open overlay 2
          </button>
          <button @click="${() => overlayCtrl1.hide()}">Close</button>
        </div>
      `),
    });

    return html`
      <style>
        ${globalOverlayDemoStyle}
      </style>
      <a href="#">Anchor 1</a>
      <button
        @click="${event => overlayCtrl1.show(event.target)}"
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        Open overlay 1
      </button>
      <a href="#">Anchor 2</a>
    `;
  })
  .add('isBlocking', () => {
    const blockingOverlayCtrl = new OverlayController({
      placementMode: 'global',
      isBlocking: true,
      viewportConfig: {
        placement: 'left',
      },
      contentNode: fixtureSync(html`
        <div class="demo-overlay">
          <p>Hides other overlays</p>
          <button @click="${() => blockingOverlayCtrl.hide()}">Close</button>
        </div>
      `),
    });

    const normalOverlayCtrl = new OverlayController({
      placementMode: 'global',
      contentNode: fixtureSync(html`
        <div class="demo-overlay">
          <p>Normal overlay</p>
          <button
            @click="${event => blockingOverlayCtrl.show(event.target)}"
            aria-haspopup="dialog"
            aria-expanded="false"
          >
            Open blocking overlay
          </button>
          <button @click="${() => normalOverlayCtrl.hide()}">Close</button>
        </div>
      `),
    });

    return html`
      <style>
        ${globalOverlayDemoStyle}
      </style>
      <button
        @click="${event => normalOverlayCtrl.show(event.target)}"
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        Open overlay
      </button>
    `;
  })
  .add('viewportConfig:placement', () => {
    const tagName = 'lion-overlay-placement-demo';
    if (!customElements.get(tagName)) {
      customElements.define(
        tagName,
        class extends LitElement {
          static get properties() {
            return {
              // controller: { type: Object },
              placement: { type: String },
            };
          }

          constructor() {
            super();
            this.options = [
              'top',
              'top-right',
              'right',
              'bottom-right',
              'bottom',
              'bottom-left',
              'left',
              'top-left',
              'center',
            ];
          }

          render() {
            return html`
              <p>Overlay placement: ${this.placement}</p>
              <button @click="${this._togglePlacement}">
                Toggle
                ${this.options[(this.options.indexOf(this.placement) + 1) % this.options.length]}
                position
              </button>
              <button @click="${() => this.dispatchEvent(new CustomEvent('close'))}">Close</button>
            `;
          }

          _togglePlacement() {
            this.placement = this.options[
              (this.options.indexOf(this.placement) + 1) % this.options.length
            ];
            this.dispatchEvent(
              new CustomEvent('toggle-placement', {
                detail: this.placement,
              }),
            );
          }
        },
      );
    }
    const initialPlacement = 'center';
    const overlayCtrl = new OverlayController({
      placementMode: 'global',
      viewportConfig: {
        placement: initialPlacement,
      },
      contentNode: fixtureSync(html`
        <lion-overlay-placement-demo class="demo-overlay"> </lion-overlay-placement-demo>
      `),
    });
    const element = overlayCtrl.content.querySelector(tagName);
    element.placement = initialPlacement;
    element.addEventListener('toggle-placement', e => {
      overlayCtrl.updateConfig({ viewportConfig: { placement: e.detail } });
    });
    element.addEventListener('close', () => {
      overlayCtrl.hide();
    });
    return html`
      <style>
        ${globalOverlayDemoStyle}
      </style>
      <button @click="${e => overlayCtrl.show(e.target)}">
        Open overlay
      </button>
    `;
  })
  .add('hidesOnOutsideClick', () => {
    const shadowContent = document.createElement('div');
    shadowContent.attachShadow({ mode: 'open' });
    shadowContent.shadowRoot.appendChild(
      fixtureSync(html`
        <div style="width: 100px; padding: 10px; background: black; color: white;">
          Shadow area
        </div>
      `),
    );

    const ctrl = new OverlayController({
      placementMode: 'global',
      hidesOnOutsideClick: true,
      contentNode: fixtureSync(html`
        <div class="demo-overlay">
          <p>Hides when clicked outside</p>
          ${shadowContent}
          <button @click="${() => ctrl.hide()}">Close</button>
        </div>
      `),
    });

    return html`
      <style>
        ${globalOverlayDemoStyle}
      </style>
      <button @click="${event => ctrl.show(event.target)}">
        Open overlay
      </button>
    `;
  });
