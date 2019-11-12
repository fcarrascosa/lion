import { expect, fixture } from '@open-wc/testing';

import '../lion-input-email.js';

describe('<lion-input-email>', () => {
  it('has a type = text', async () => {
    const lionInputEmail = await fixture(`<lion-input-email></lion-input-email>`);
    expect(lionInputEmail.inputElement.type).to.equal('text');
  });

  it('has validator "isEmail" applied by default', async () => {
    // More eloborate tests can be found in lion-validate/validators.js
    const lionInputEmail = await fixture(`<lion-input-email></lion-input-email>`);
    lionInputEmail.modelValue = 'foo@bar@example.com';
    expect(lionInputEmail.errorState).to.equal(true);
  });

  it('is accessible', async () => {
    const lionInputEmail = await fixture(
      `<lion-input-email><label slot="label">Label</label></lion-input-email>`,
    );
    await expect(lionInputEmail).to.be.accessible();
  });

  it('is accessible when readonly', async () => {
    const lionInputEmail = await fixture(
      `<lion-input-email readonly><label slot="label">Label</label></lion-input-email>`,
    );
    await expect(lionInputEmail).to.be.accessible();
  });

  it('is accessible when disabled', async () => {
    const lionInputEmail = await fixture(
      `<lion-input-email disabled><label slot="label">Label</label></lion-input-email>`,
    );
    await expect(lionInputEmail).to.be.accessible();
  });
});
