/* eslint-disable class-methods-use-this */

import { dedupeMixin } from '@lion/core';
import { Unparseable } from '@lion/validate';

// For a future breaking release:
// - do not allow the private `.formattedValue` as property that can be set to
// trigger a computation loop.
// - do not fire events for those private and protected concepts
// - simplify _calculateValues: recursive trigger lock can be omitted, since need for connecting
// the loop via sync observers is not needed anymore.
// - consider `formatOn` as an overridable function, by default something like:
// `(!__isHandlingUserInput || !hasError) && !focused`
// This would allow for more advanced scenarios, like formatting an input whenever it becomes valid.
// This would make formattedValue as a concept obsolete, since for maximum flexibility, the
// formattedValue condition needs to be evaluated right before syncing back to the view

/**
 * @desc Designed to be applied on top of a LionField.
 * To understand all concepts within the Mixin, please consult the flow diagram in the
 * documentation.
 *
 * ## Flows
 * FormatMixin supports these two main flows:
 * [1] Application Developer sets `.modelValue`:
 *     Flow: `.modelValue` (formatter) -> `.formattedValue` -> `._inputNode.value`
 *                         (serializer) -> `.serializedValue`
 * [2] End user interacts with field:
 *     Flow: `@user-input-changed` (parser) -> `.modelValue` (formatter) -> `.formattedValue` - (debounce till reflect condition (formatOn) is met) -> `._inputNode.value`
 *                                 (serializer) -> `.serializedValue`
 *
 * For backwards compatibility with the platform, we also support `.value` as an api. In that case
 * the flow will be like [2], without the debounce.
 *
 * ## Difference between value, viewValue and formattedValue
 * A viewValue is a concept rather than a property. To be compatible with the platform api, the
 * property for the concept of viewValue is thus called `.value`.
 * When reading code and docs, one should be aware that the term viewValue is mostly used, but the
 * terms can be used interchangeably.
 * The `.formattedValue` should be seen as the 'scheduled' viewValue. It is computed realtime and
 * stores the output of formatter. It will replace viewValue. once condition `formatOn` is met.
 * Another difference is that formattedValue lives on `LionField`, whereas viewValue is shared
 * across `LionField` and `._inputNode`.
 *
 * For restoring serialized values fetched from a server, we could consider one extra flow:
 * [3] Application Developer sets `.serializedValue`:
 *     Flow: serializedValue (deserializer) -> `.modelValue` (formatter) -> `.formattedValue` -> `._inputNode.value`
 */
export const FormatMixin = dedupeMixin(
  superclass =>
    // eslint-disable-next-line no-unused-vars, no-shadow
    class FormatMixin extends superclass {
      static get properties() {
        return {
          /**
           * The model value is the result of the parser function(when available).
           * It should be considered as the internal value used for validation and reasoning/logic.
           * The model value is 'ready for consumption' by the outside world (think of a Date
           * object or a float). The modelValue can(and is recommended to) be used as both input
           * value and output value of the `LionField`.
           *
           * Examples:
           * - For a date input: a String '20/01/1999' will be converted to new Date('1999/01/20')
           * - For a number input: a formatted String '1.234,56' will be converted to a Number:
           *   1234.56
           */
          modelValue: {
            type: Object,
          },

          /**
           * The view value is the result of the formatter function (when available).
           * The result will be stored in the native _inputNode (usually an input[type=text]).
           *
           * Examples:
           * - For a date input, this would be '20/01/1999' (dependent on locale).
           * - For a number input, this could be '1,234.56' (a String representation of modelValue
           * 1234.56)
           *
           * @private
           */
          formattedValue: {
            type: String,
          },

          /**
           * The serialized version of the model value.
           * This value exists for maximal compatibility with the platform API.
           * The serialized value can be an interface in context where data binding is not
           * supported and a serialized string needs to be set.
           *
           * Examples:
           * - For a date input, this would be the iso format of a date, e.g. '1999-01-20'.
           * - For a number input this would be the String representation of a float ('1234.56'
           *   instead of 1234.56)
           *
           * When no parser is available, the value is usually the same as the formattedValue
           * (being _inputNode.value)
           *
           */
          serializedValue: {
            type: String,
          },

          /**
           * Event that will trigger formatting (more precise, visual update of the view, so the
           * user sees the formatted value)
           * Default: 'change'
           */
          formatOn: {
            type: String,
          },

          /**
           * Configuration object that will be available inside the formatter function
           */
          formatOptions: {
            type: Object,
          },
        };
      }

      _requestUpdate(name, oldVal) {
        super._requestUpdate(name, oldVal);

        if (name === 'modelValue' && this.modelValue !== oldVal) {
          this._onModelValueChanged({ modelValue: this.modelValue }, { modelValue: oldVal });
        }
        if (name === 'serializedValue' && this.serializedValue !== oldVal) {
          this._calculateValues({ source: 'serialized' });
        }
        if (name === 'formattedValue' && this.formattedValue !== oldVal) {
          this._calculateValues({ source: 'formatted' });
        }
      }

      /**
       * Converts formattedValue to modelValue
       * For instance, a localized date to a Date Object
       * @param {String} value - formattedValue: the formatted value inside <input>
       * @returns {Object} modelValue
       */
      parser(v) {
        return v;
      }

      /**
       * Converts modelValue to formattedValue (formattedValue will be synced with
       * `._inputNode.value`)
       * For instance, a Date object to a localized date.
       * @param {Object} value - modelValue: can be an Object, Number, String depending on the
       * input type(date, number, email etc)
       * @returns {String} formattedValue
       */
      formatter(v) {
        return v;
      }

      /**
       * Converts `.modelValue` to `.serializedValue`
       * For instance, a Date object to an iso formatted date string
       * @param {Object} value - modelValue: can be an Object, Number, String depending on the
       * input type(date, number, email etc)
       * @returns {String} serializedValue
       */
      serializer(v) {
        return v;
      }

      /**
       * Converts `LionField.value` to `.modelValue`
       * For instance, an iso formatted date string to a Date object
       * @param {Object} value - modelValue: can be an Object, Number, String depending on the
       * input type(date, number, email etc)
       * @returns {Object} modelValue
       */
      deserializer(v) {
        return v;
      }

      /**
       * Responsible for storing all representations(modelValue, serializedValue, formattedValue
       * and value) of the input value. Prevents infinite loops, so all value observers can be
       * treated like they will only be called once, without indirectly calling other observers.
       * (in fact, some are called twice, but the __preventRecursiveTrigger lock prevents the
       * second call from having effect).
       *
       * @param {string} source - the type of value that triggered this method. It should not be
       * set again, so that its observer won't be triggered. Can be:
       * 'model'|'formatted'|'serialized'.
       */
      _calculateValues({ source } = {}) {
        if (this.__preventRecursiveTrigger) return; // prevent infinite loops

        this.__preventRecursiveTrigger = true;
        if (source !== 'model') {
          if (source === 'serialized') {
            this.modelValue = this.deserializer(this.serializedValue);
          } else if (source === 'formatted') {
            this.modelValue = this.__callParser();
          }
        }
        if (source !== 'formatted') {
          this.formattedValue = this.__callFormatter();
        }
        if (source !== 'serialized') {
          this.serializedValue = this.serializer(this.modelValue);
        }
        this._reflectBackFormattedValueToUser();
        this.__preventRecursiveTrigger = false;
      }

      __callParser(value = this.formattedValue) {
        // A) check if we need to parse at all

        // A.1) The end user had no intention to parse
        if (value === '') {
          // Ideally, modelValue should be undefined for empty strings.
          // For backwards compatibility we return an empty string:
          // - it triggers validation for required validators (see ValidateMixin.validate())
          // - it can be expected by 3rd parties (for instance unit tests)
          // TODO: In a breaking refactor of the Validation System, this behavior can be corrected.
          return '';
        }

        // A.2) Handle edge cases We might have no view value yet, for instance because
        // _inputNode.value was not available yet
        if (typeof value !== 'string') {
          // This means there is nothing to find inside the view that can be of
          // interest to the Application Developer or needed to store for future
          // form state retrieval.
          return undefined;
        }

        // B) parse the view value

        // - if result:
        // return the successfully parsed viewValue
        // - if no result:
        // Apparently, the parser was not able to produce a satisfactory output for the desired
        // modelValue type, based on the current viewValue. Unparseable allows to restore all
        // states (for instance from a lost user session), since it saves the current viewValue.
        const result = this.parser(value, this.formatOptions);
        return result !== undefined ? result : new Unparseable(value);
      }

      __callFormatter() {
        // - Why check for this.hasError?
        // We only want to format values that are considered valid. For best UX,
        // we only 'reward' valid inputs.
        // - Why check for __isHandlingUserInput?
        // Downwards sync is prevented whenever we are in an `@user-input-changed` flow, [2].
        // If we are in a 'imperatively set `.modelValue`' flow, [1], we want to reflect back
        // the value, no matter what.
        // This means, whenever we are in hasError and modelValue is set
        // imperatively, we DO want to format a value (it is the only way to get meaningful
        // input into `._inputNode` with modelValue as input)

        if (
          this.__isHandlingUserInput &&
          this.hasFeedbackFor &&
          this.hasFeedbackFor.length &&
          this.hasFeedbackFor.includes('error') &&
          this._inputNode
        ) {
          return this._inputNode ? this.value : undefined;
        }

        if (this.modelValue instanceof Unparseable) {
          // When the modelValue currently is unparseable, we need to sync back the supplied
          // viewValue. In flow [2], this should not be needed.
          // In flow [1] (we restore a previously stored modelValue) we should sync down, however.
          return this.modelValue.viewValue;
        }

        return this.formatter(this.modelValue, this.formatOptions);
      }

      /** Observer Handlers */
      _onModelValueChanged(...args) {
        this._calculateValues({ source: 'model' });
        this._dispatchModelValueChangedEvent(...args);
      }

      /**
       * This is wrapped in a distinct method, so that parents can control when the changed event
       * is fired. For objects, a deep comparison might be needed.
       */
      _dispatchModelValueChangedEvent() {
        /** @event model-value-changed */
        this.dispatchEvent(
          new CustomEvent('model-value-changed', { bubbles: true, composed: true }),
        );
      }

      /**
       * Synchronization from `._inputNode.value` to `LionField` (flow [2])
       */
      _syncValueUpwards() {
        // Downwards syncing should only happen for `LionField`.value changes from 'above'
        // This triggers _onModelValueChanged and connects user input to the
        // parsing/formatting/serializing loop
        this.modelValue = this.__callParser(this.value);
      }

      /**
       * Synchronization from `LionField.value` to `._inputNode.value`
       * - flow [1] will always be reflected back
       * - flow [2] will not be reflected back when this flow was triggered via
       *   `@user-input-changed` (this will happen later, when `formatOn` condition is met)
       */
      _reflectBackFormattedValueToUser() {
        if (!this.__isHandlingUserInput) {
          // Text 'undefined' should not end up in <input>
          this.value = typeof this.formattedValue !== 'undefined' ? this.formattedValue : '';
        }
      }

      // This can be called whenever the view value should be updated. Dependent on component type
      // ("input" for <input> or "change" for <select>(mainly for IE)) a different event should be
      // used  as source for the "user-input-changed" event (which can be seen as an abstraction
      // layer on top of other events (input, change, whatever))
      _proxyInputEvent() {
        this.dispatchEvent(
          new CustomEvent('user-input-changed', {
            bubbles: true,
            composed: true,
          }),
        );
      }

      _onUserInputChanged() {
        // Upwards syncing. Most properties are delegated right away, value is synced to
        // `LionField`, to be able to act on (imperatively set) value changes
        this.__isHandlingUserInput = true;
        this._syncValueUpwards();
        this.__isHandlingUserInput = false;
      }

      constructor() {
        super();
        this.formatOn = 'change';
        this.formatOptions = {};
      }

      connectedCallback() {
        super.connectedCallback();
        this._reflectBackFormattedValueToUser = this._reflectBackFormattedValueToUser.bind(this);

        this._reflectBackFormattedValueDebounced = () => {
          // Make sure this is fired after the change event of _inputNode, so that formattedValue
          // is guaranteed to be calculated
          setTimeout(this._reflectBackFormattedValueToUser);
        };
        this.addEventListener('user-input-changed', this._onUserInputChanged);
        // Connect the value found in <input> to the formatting/parsing/serializing loop as a
        // fallback mechanism. Assume the user uses the value property of the
        // `LionField`(recommended api) as the api (this is a downwards sync).
        // However, when no value is specified on `LionField`, have support for sync of the real
        // input to the `LionField` (upwards sync).
        if (typeof this.modelValue === 'undefined') {
          this._syncValueUpwards();
        }
        this._reflectBackFormattedValueToUser();

        if (this._inputNode) {
          this._inputNode.addEventListener(this.formatOn, this._reflectBackFormattedValueDebounced);
          this._inputNode.addEventListener('input', this._proxyInputEvent);
        }
      }

      disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('user-input-changed', this._onUserInputChanged);
        if (this._inputNode) {
          this._inputNode.removeEventListener('input', this._proxyInputEvent);
          this._inputNode.removeEventListener(
            this.formatOn,
            this._reflectBackFormattedValueDebounced,
          );
        }
      }
    },
);
