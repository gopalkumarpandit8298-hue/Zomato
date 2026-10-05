/** CC0 image fetched by `npm run assets`; see ASSET-CREDITS.md. */
const HERO_IMAGE = '/img/hero.jpg';

export function Hero() {
  return (
    <section
      aria-label="Order food online"
      className="relative overflow-hidden bg-neutral-900"
      style={{ backgroundImage: `url(${HERO_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Gradient scrim keeps the white text readable over any photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-900/70 to-neutral-900/20" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="max-w-xl">
          <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">Delivering in 30 minutes</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Order food online from the best places near you
          </h1>
          <p className="mt-4 text-base text-neutral-200 sm:text-lg">
            Curated restaurants, transparent prices and live order tracking. Find the cuisines you love, delivered hot.
          </p>

          <dl className="mt-8 flex flex-wrap gap-8">
            <div>
              <dt className="text-xs tracking-wide text-neutral-300 uppercase">Restaurants</dt>
              <dd className="text-2xl font-bold text-white">14+</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-neutral-300 uppercase">Cuisines</dt>
              <dd className="text-2xl font-bold text-white">20+</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-neutral-300 uppercase">Avg. delivery</dt>
              <dd className="text-2xl font-bold text-white">24 min</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
