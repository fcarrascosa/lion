import { html, ifDefined, render } from '@lion/core';
import { LionInputDate } from '@lion/input-date';
import { OverlayController, withModalDialogConfig, OverlayMixin } from '@lion/overlays';

import '@lion/calendar/lion-calendar.js';
import './lion-calendar-overlay-frame.js';

/**
 * @customElement lion-input-datepicker
 * @extends {LionInputDate}
 */
export class LionInputDatepicker extends OverlayMixin(LionInputDate) {
  static get properties() {
    return {
      /**
       * The heading to be added on top of the calendar overlay.
       * Naming chosen from an Application Developer perspective.
       * For a Subclasser 'calendarOverlayHeading' would be more appropriate
       */
      calendarHeading: {
        type: String,
        attribute: 'calendar-heading',
      },
      /**
       * The slot to put the invoker button in. Can be 'prefix', 'suffix', 'before' and 'after'.
       * Default will be 'suffix'.
       */
      _calendarInvokerSlot: {
        type: String,
      },

      __calendarMinDate: {
        type: Date,
      },

      __calendarMaxDate: {
        type: Date,
      },

      __calendarDisableDates: {
        type: Function,
      },
    };
  }

  get slots() {
    return {
      ...super.slots,
      [this._calendarInvokerSlot]: () => {
        const renderParent = document.createElement('div');
        render(this._invokerTemplate(), renderParent);
        return renderParent.firstElementChild;
      },
    };
  }

  static get localizeNamespaces() {
    return [
      {
        /* FIXME: This awful switch statement is used to make sure it works with polymer build.. */
        'lion-input-datepicker': locale => {
          switch (locale) {
            case 'bg-BG':
              return import('../translations/bg-BG.js');
            case 'bg':
              return import('../translations/bg.js');
            case 'cs-CZ':
              return import('../translations/cs-CZ.js');
            case 'cs':
              return import('../translations/cs.js');
            case 'de-DE':
              return import('../translations/de-DE.js');
            case 'de':
              return import('../translations/de.js');
            case 'en-AU':
              return import('../translations/en-AU.js');
            case 'en-GB':
              return import('../translations/en-GB.js');
            case 'en-US':
              return import('../translations/en-US.js');
            case 'en-PH':
            case 'en':
              return import('../translations/en.js');
            case 'es-ES':
              return import('../translations/es-ES.js');
            case 'es':
              return import('../translations/es.js');
            case 'fr-FR':
              return import('../translations/fr-FR.js');
            case 'fr-BE':
              return import('../translations/fr-BE.js');
            case 'fr':
              return import('../translations/fr.js');
            case 'hu-HU':
              return import('../translations/hu-HU.js');
            case 'hu':
              return import('../translations/hu.js');
            case 'it-IT':
              return import('../translations/it-IT.js');
            case 'it':
              return import('../translations/it.js');
            case 'nl-BE':
              return import('../translations/nl-BE.js');
            case 'nl-NL':
              return import('../translations/nl-NL.js');
            case 'nl':
              return import('../translations/nl.js');
            case 'pl-PL':
              return import('../translations/pl-PL.js');
            case 'pl':
              return import('../translations/pl.js');
            case 'ro-RO':
              return import('../translations/ro-RO.js');
            case 'ro':
              return import('../translations/ro.js');
            case 'ru-RU':
              return import('../translations/ru-RU.js');
            case 'ru':
              return import('../translations/ru.js');
            case 'sk-SK':
              return import('../translations/sk-SK.js');
            case 'sk':
              return import('../translations/sk.js');
            case 'uk-UA':
              return import('../translations/uk-UA.js');
            case 'uk':
              return import('../translations/uk.js');
            case 'zh-CN':
            case 'zh':
              return import('../translations/zh.js');
            default:
              return import(`../translations/${locale}.js`);
          }
        },
      },
      ...super.localizeNamespaces,
    ];
  }

  get _invokerElement() {
    return this.querySelector(`#${this.__invokerId}`);
  }

  get _calendarElement() {
    return this._overlayCtrl.contentNode.querySelector('#calendar');
  }

  constructor() {
    super();
    this.__invokerId = this.__createUniqueIdForA11y();
    this._calendarInvokerSlot = 'suffix';

    // Configuration flags for subclassers
    this._focusCentralDateOnCalendarOpen = true;
    this._hideOnUserSelect = true;
    this._syncOnUserSelect = true;

    this.__openCalendarOverlay = this.__openCalendarOverlay.bind(this);
    this._onCalendarUserSelectedChanged = this._onCalendarUserSelectedChanged.bind(this);
  }

  __createUniqueIdForA11y() {
    return `${this.localName}-${Math.random()
      .toString(36)
      .substr(2, 10)}`;
  }

  _requestUpdate(name, oldValue) {
    super._requestUpdate(name, oldValue);

    if (name === 'disabled' || name === 'readOnly') {
      this.__toggleInvokerDisabled();
    }
  }

  __toggleInvokerDisabled() {
    if (this._invokerElement) {
      this._invokerElement.disabled = this.disabled || this.readOnly;
    }
  }

  firstUpdated(c) {
    super.firstUpdated(c);
    this.__toggleInvokerDisabled();
  }

  /**
   * @override
   * @param {Map} c - changed properties
   */
  updated(c) {
    super.updated(c);
    if (c.has('validators')) {
      const validators = [...(this.validators || [])];
      this.__syncDisabledDates(validators);
    }
    if (c.has('label')) {
      this.calendarHeading = this.calendarHeading || this.label;
    }
  }

  /**
   * Defining this overlay as a templates lets OverlayInteraceMixin
   * this is our source to give as .contentNode to OverlayController.
   * Important: do not change the name of this method.
   */
  // TODO: Refactor to new overlay system public API --> @close=${() => { this.opened = false; }}
  _overlayTemplate() {
    return html`
      <lion-calendar-overlay-frame @dialog-close=${() => this._overlayCtrl.hide()}>
        <span slot="heading">${this.calendarHeading}</span>
        ${this._calendarTemplate()}
      </lion-calendar-overlay-frame>
    `;
  }

  /**
   * Subclassers can replace this with their custom extension of
   * LionCalendar, like `<my-calendar id="calendar"></my-calendar>`
   */
  // eslint-disable-next-line class-methods-use-this
  _calendarTemplate() {
    return html`
      <lion-calendar
        id="calendar"
        .selectedDate="${this.constructor.__getSyncDownValue(this.modelValue)}"
        .minDate="${this.__calendarMinDate}"
        .maxDate="${this.__calendarMaxDate}"
        .disableDates="${ifDefined(this.__calendarDisableDates)}"
        @user-selected-date-changed="${this._onCalendarUserSelectedChanged}"
      ></lion-calendar>
    `;
  }

  /**
   * Subclassers can replace this with their custom extension invoker,
   * like `<my-button><calendar-icon></calendar-icon></my-button>`
   */
  // eslint-disable-next-line class-methods-use-this
  _invokerTemplate() {
    // TODO: aria-expanded should be toggled by Overlay system, to allow local overlays
    // (a.k.a. dropdowns) as well. Important: will be breaking for subclassers
    return html`
      <button
        type="button"
        @click="${this.__openCalendarOverlay}"
        id="${this.__invokerId}"
        aria-label="${this.msgLit('lion-input-datepicker:openDatepickerLabel')}"
        title="${this.msgLit('lion-input-datepicker:openDatepickerLabel')}"
      >
        📅
      </button>
    `;
  }

  /**
   * @override Configures OverlayMixin
   * @desc returns an instance of a (dynamic) overlay controller
   * @returns {OverlayController}
   */
  // eslint-disable-next-line class-methods-use-this
  _defineOverlay({ contentNode, invokerNode }) {
    const ctrl = new OverlayController({
      ...withModalDialogConfig(),
      contentNode,
      invokerNode,
    });
    return ctrl;
  }

  async __openCalendarOverlay() {
    this._overlayCtrl.show();
    await Promise.all([
      this._overlayCtrl.contentNode.updateComplete,
      this._calendarElement.updateComplete,
    ]);
    this._onCalendarOverlayOpened();
  }

  /**
   * Lifecycle callback for subclassers
   */
  _onCalendarOverlayOpened() {
    if (this._focusCentralDateOnCalendarOpen) {
      this._calendarElement.focusCentralDate();
    }
  }

  _onCalendarUserSelectedChanged({ target: { selectedDate } }) {
    if (this._hideOnUserSelect) {
      this._overlayCtrl.hide();
    }
    if (this._syncOnUserSelect) {
      // Synchronize new selectedDate value to input
      this.modelValue = selectedDate;
    }
  }

  /**
   * The LionCalendar shouldn't know anything about the modelValue;
   * it can't handle Unparseable dates, but does handle 'undefined'
   * @returns {Date|undefined} a 'guarded' modelValue
   */
  static __getSyncDownValue(modelValue) {
    return modelValue instanceof Date ? modelValue : undefined;
  }

  /**
   * Validators contain the information to synchronize the input with
   * the min, max and enabled dates of the calendar.
   * @param {Array} validators - errorValidators or warningValidators array
   */
  __syncDisabledDates(validators) {
    // On every validator change, synchronize disabled dates: this means
    // we need to extract minDate, maxDate, minMaxDate and disabledDates validators
    validators.forEach(v => {
      if (v.name === 'MinDate') {
        this.__calendarMinDate = v.param;
      } else if (v.name === 'MaxDate') {
        this.__calendarMaxDate = v.param;
      } else if (v.name === 'MinMaxDate') {
        this.__calendarMinDate = v.param.min;
        this.__calendarMaxDate = v.param.max;
      } else if (v.name === 'IsDateDisabled') {
        this.__calendarDisableDates = v.param;
      }
    });
  }

  /**
   * @override Configures OverlayMixin
   */
  get _overlayInvokerNode() {
    return this._invokerElement;
  }
}
