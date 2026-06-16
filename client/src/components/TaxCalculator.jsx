import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function TaxCalculator() {
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState(0);

  const value = Number.parseInt(amount, 10) || 0;
  const tax = 0.4 * (1 - discount / 100);
  const finalAmount = Math.floor(value * (1 - tax));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-7">
        <div>
          <label htmlFor="sale-bp" className="mb-3 block text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Sale BP
          </label>
          <div className="relative">
            <input
              id="sale-bp"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className="h-16 w-full rounded-lg border border-hairline bg-canvas-dark px-5 pr-16 text-3xl font-semibold text-ink outline-none transition focus:border-brand-blue"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 font-semibold text-brand-blue">
              BP
            </span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Tax discount
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[0, 10, 20, 30, 40, 50].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDiscount(value)}
                className={`h-11 rounded-lg border text-sm font-semibold transition ${
                  discount === value
                    ? 'border-brand-blue bg-brand-blue text-white'
                    : 'border-hairline bg-surface-1 text-ink-muted hover:border-brand-blue/60 hover:text-ink'
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-hairline bg-canvas-dark/60 p-8 text-center">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-blue" />
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Net BP
          </span>
        </div>
        <div className="mb-2 max-w-full overflow-hidden break-all text-4xl font-semibold text-ink sm:text-6xl">
          {formatNumber(finalAmount)}
        </div>
        <div className="rounded-lg bg-brand-blue/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-blue">
          After transfer tax
        </div>
      </div>
    </div>
  );
}
