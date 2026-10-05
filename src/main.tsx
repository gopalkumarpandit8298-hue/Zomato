import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { AuthProvider } from './context/auth-context';
import { CartProvider } from './context/cart-context';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Could not find the #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    {/* Auth outermost: the header shows the avatar and the cart badge needs
        the item count available to every route. */}
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </StrictMode>,
);
