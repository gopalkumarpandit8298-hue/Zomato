import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AppLayout } from './components/app-layout';
import { RequireAdmin } from './components/require-admin';
import { RequireAuth } from './components/require-auth';

/**
 * Route components are code-split so the initial download stays small: a
 * visitor only pays for the home page unless they open the cart, checkout or
 * the admin panel.
 */
const HomePage = lazy(() => import('./pages/home-page'));
const RestaurantPage = lazy(() => import('./pages/restaurant-page'));
const CartPage = lazy(() => import('./pages/cart-page'));
const CheckoutPage = lazy(() => import('./pages/checkout-page'));
const OrdersPage = lazy(() => import('./pages/orders-page'));
const LoginPage = lazy(() => import('./pages/login-page'));
const NotFoundPage = lazy(() => import('./pages/not-found-page'));

const AdminLayout = lazy(() => import('./pages/admin/admin-layout').then((m) => ({ default: m.AdminLayout })));
const AdminLoginPage = lazy(() => import('./pages/admin/admin-login-page'));
const AdminDashboardPage = lazy(() => import('./pages/admin/admin-dashboard-page'));
const AdminRestaurantsPage = lazy(() => import('./pages/admin/admin-restaurants-page'));
const AdminOrdersPage = lazy(() => import('./pages/admin/admin-orders-page'));
const AdminCustomersPage = lazy(() => import('./pages/admin/admin-customers-page'));

const router = createBrowserRouter([
  // ---- Customer site -----------------------------------------------------
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'restaurant/:restaurantId', element: <RestaurantPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'checkout',
        element: (
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        ),
      },
      {
        path: 'orders',
        element: (
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        ),
      },
    ],
  },

  // ---- Admin panel -------------------------------------------------------
  // The login screen sits outside the guarded layout, otherwise RequireAdmin
  // would redirect an anonymous visitor in a loop.
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'restaurants', element: <AdminRestaurantsPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'customers', element: <AdminCustomersPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
