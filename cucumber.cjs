const path = require('node:path');

const resolve = (p) => path.resolve(__dirname, p);

module.exports = {
  default: {
    import: [
      'support/hooks.ts',
      'support/world.ts',
      'steps/**/*.ts',
    ].map(resolve),
    paths: [
      'features/car_owner_create_request.feature',
      'features/workshop_send_offer.feature',
      'features/car_owner_accept_offer.feature',
    ].map(resolve),
    format: ['summary'],
  },
};
