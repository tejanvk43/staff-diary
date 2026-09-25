const app = require('./server');

function listRoutes(stack, prefix = '') {
  stack.forEach(layer => {
    if (layer.route) {
      const path = prefix + layer.route.path;
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      console.log(`${methods} ${path}`);
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      const regexp = layer.regexp && layer.regexp.source;
      const segment = regexp && regexp !== '^\\/?$' ? regexp.replace('^\\/?', '').replace('\\/?$', '') : '';
      listRoutes(layer.handle.stack, prefix + segment);
    }
  });
}

if (!app || !app._router || !Array.isArray(app._router.stack)) {
  console.error('Express router stack not available');
  process.exit(1);
}

listRoutes(app._router.stack);
