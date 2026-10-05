import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-24 text-center">
      <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-neutral-900">We could not find that page</h1>
      <p className="mt-3 text-neutral-600">The link may be broken, or the page may have moved.</p>
      <Link to="/" className="mt-8 inline-block rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white">
        Back to home
      </Link>
    </div>
  );
}
