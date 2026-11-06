'use client';

import { useEffect, useState } from 'react';
import { db, resetDb, restoreSoldOut } from './db';
import { getScenario, SCENARIOS, setScenario, type Scenario } from './scenario';

/** Floating dev panel. Rendered only when NEXT_PUBLIC_USE_MOCKS=true (see MswBootstrap). */
export default function ScenarioPanel() {
  const [open, setOpen] = useState(false);
  const [scenario] = useState<Scenario>(getScenario);
  const [stats, setStats] = useState(db.stats);

  useEffect(() => {
    const t = setInterval(() => setStats({ ...db.stats }), 1000);
    return () => clearInterval(t);
  }, []);

  function choose(s: Scenario) {
    restoreSoldOut();
    setScenario(s);
    const url = new URL(window.location.href);
    url.searchParams.set('scenario', s);
    window.location.replace(url); // reload so every query refetches under the new scenario
  }

  return (
    <div className="fixed bottom-24 left-3 z-[60] font-body text-sm md:bottom-4">
      {open ? (
        <div className="flex max-h-[80dvh] w-80 flex-col rounded-card border-3 border-ink bg-white p-3 shadow-hard-md">
          <div className="mb-2 flex items-center justify-between">
            <strong className="font-sticker font-black">Mock scenario</strong>
            <button
              type="button"
              className="rounded-chip border-2 border-ink px-2"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pe-1">
            {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
              <li key={s}>
                <label className="flex cursor-pointer items-start gap-2 rounded-chip px-1 py-0.5 hover:bg-paper">
                  <input
                    type="radio"
                    name="scenario"
                    checked={s === scenario}
                    onChange={() => choose(s)}
                    className="mt-1 accent-orange"
                  />
                  <span>
                    <code className="block text-xs font-bold">{s}</code>
                    <span className="block text-xs text-muted">{SCENARIOS[s]}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-x-2 border-t-2 border-ink pt-2 text-xs">
            <dt>Orders created</dt>
            <dd className="text-end font-bold">{stats.ordersCreated}</dd>
            <dt>Idempotent replays</dt>
            <dd className="text-end font-bold">{stats.replays}</dd>
            <dt>409 in-progress</dt>
            <dd className="text-end font-bold">{stats.inProgress}</dd>
          </dl>
          <p className="mt-2 text-xs text-muted">
            OTP / staff 2FA: 123456 · staff password: barraf123 · staff: owner@, manager@, cashier@,
            kitchen@, rider@barrafpaani.test
          </p>
          <button
            type="button"
            className="mt-2 w-full rounded-button border-2 border-ink bg-yellow px-2 py-1 font-bold"
            onClick={() => {
              resetDb();
              window.location.reload();
            }}
          >
            Reset mock data
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border-2 border-ink bg-yellow px-3 py-1 font-bold shadow-hard-sm"
        >
          Mocks: {scenario}
        </button>
      )}
    </div>
  );
}
