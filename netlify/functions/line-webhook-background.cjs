const { handler } = require('./line-webhook.cjs');

exports.handler = async function (event, context) {
  // Directly run the shared handler inside the background function context
  return await handler(event, context);
};
