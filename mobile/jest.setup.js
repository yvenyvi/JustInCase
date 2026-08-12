const ReactTestRenderer = require('react-test-renderer');
if (!ReactTestRenderer.createRoot) {
  ReactTestRenderer.createRoot = (options) => {
    // Return a mock createRoot object that uses the create() method under the hood
    let root = null;
    return {
      render(element) {
        if (!root) {
          root = ReactTestRenderer.create(element, options);
        } else {
          root.update(element);
        }
      },
      unmount() {
        if (root) {
          root.unmount();
          root = null;
        }
      },
      get container() {
        return root;
      }
    };
  };
}
