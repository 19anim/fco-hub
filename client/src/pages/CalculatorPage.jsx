import { Calculator, Percent } from 'lucide-react';
import TaxCalculator from '../components/TaxCalculator';
import AdSlot from '../components/AdSlot';

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-1 text-xs font-semibold uppercase text-success">
              <Calculator className="h-3.5 w-3.5" />
              Transfer utility
            </div>
            <h1 className="text-3xl font-semibold text-ink">BP Calculator</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Calculate expected BP after the 40% transfer tax and membership discounts.
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-2 p-4">
            <div className="flex items-center gap-3">
              <Percent className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-semibold text-ink">Formula</p>
                <p className="text-xs text-ink-muted">Net BP = Sale BP x (1 - tax after discount)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <TaxCalculator />
      </section>

      <AdSlot type="inline" />
    </div>
  );
}
