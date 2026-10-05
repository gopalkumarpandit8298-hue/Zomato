import { useCallback, useEffect, useState } from 'react';

import { AdminEmpty, AdminError, AdminPage, AdminPanel, AdminTable } from '../../components/admin/admin-ui';
import { SpinnerIcon } from '../../components/icons';
import { formatInr } from '../../utils/format';
import type { AdminCustomer } from '../../lib/admin-repository';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    import('../../lib/admin-repository')
      .then(({ fetchCustomersFromOrders }) => fetchCustomersFromOrders())
      .then((list) => {
        setCustomers(list);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('error');
      });
  }, []);

  useEffect(load, [load]);

  const lifetimeValue = customers.reduce((sum, customer) => sum + customer.spent, 0);

  return (
    <AdminPage
      title="Customers"
      description={`${customers.length} customers who have ordered · ${formatInr(lifetimeValue)} lifetime value`}
    >
      {error && (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      )}

      <AdminPanel title="Ordering customers">
        {status === 'loading' ? (
          <div className="grid place-items-center py-16">
            <SpinnerIcon className="size-7 text-neutral-400" />
            <span className="sr-only">Loading customers</span>
          </div>
        ) : customers.length === 0 ? (
          <AdminEmpty message="No customers yet. This list is built from completed orders." />
        ) : (
          <AdminTable head={['Customer', 'Email', 'Orders', 'Spent', 'Last order']}>
            {customers.map((customer) => (
              <tr key={customer.userId} className="hover:bg-neutral-50">
                <td className="px-5 py-3 font-semibold text-neutral-900">{customer.name}</td>
                <td className="px-5 py-3 text-neutral-600">{customer.email || '—'}</td>
                <td className="px-5 py-3 tabular-nums">{customer.orders}</td>
                <td className="px-5 py-3 font-semibold tabular-nums">{formatInr(customer.spent)}</td>
                <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">{dateFormatter.format(customer.lastOrderAt)}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>

      <p className="mt-4 text-xs text-neutral-400">
        Listing every Firebase Auth user needs the Admin SDK, which cannot run in a browser. This table
        reports the accounts that have actually placed an order.
      </p>
    </AdminPage>
  );
}
