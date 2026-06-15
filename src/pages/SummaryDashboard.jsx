
import { createSignal, onMount, onCleanup, For } from "solid-js";

export default function SummaryDashboard() {
  const [summary, setSummary] = createSignal({
    totals: {},
    realUsers: {},
    dealers: {},
    dummyUsers: {},
    verticals: {},
  });

  let ws;

  onMount(() => {
    ws = new WebSocket("wss://cloud.xpengvisionnight.co.id");

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: "GET_DASHBOARD_SUMMARY",
        }),
      );
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "DASHBOARD_SUMMARY":
          setSummary(message.data);
          break;
      }
    };
  });

  onCleanup(() => {
    ws?.close();
  });

  return (
    <div class="min-h-screen bg-zinc-950 text-white p-6">
      {/* HEADER */}
      <div class="mb-8">
        <h1 class="text-4xl font-bold">
          XPENG V1SION NIGHT
        </h1>

        <p class="text-zinc-400 mt-2">
          Live Dashboard Summary
        </p>
      </div>

      {/* KPI */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div class="text-zinc-400 text-sm">
            Real Users
          </div>

          <div class="text-4xl font-bold mt-2">
            {summary().totals?.realUsers || 0}
          </div>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div class="text-zinc-400 text-sm">
            Generated QRs
          </div>

          <div class="text-4xl font-bold text-yellow-400 mt-2">
            {summary().totals?.dummyUsers || 0}
          </div>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div class="text-zinc-400 text-sm">
            Confirmed
          </div>

          <div class="text-4xl font-bold text-blue-400 mt-2">
            {summary().totals?.confirmed || 0}
          </div>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div class="text-zinc-400 text-sm">
            Attended
          </div>

          <div class="text-4xl font-bold text-lime-400 mt-2">
            {summary().totals?.attended || 0}
          </div>
        </div>
      </div>

      {/* REAL USERS */}
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
        <div class="px-5 py-4 border-b border-zinc-800">
          <h2 class="text-xl font-semibold">
            Real Users
          </h2>
        </div>

        <table class="w-full">
          <thead>
            <tr class="bg-zinc-800">
              <th class="p-4 text-left">Category</th>
              <th class="p-4 text-left">Total</th>
              <th class="p-4 text-left">Confirmed</th>
              <th class="p-4 text-left">Attended</th>
            </tr>
          </thead>

          <tbody>
            <For
              each={Object.entries(
                summary().realUsers || {},
              )}
            >
              {([category, data]) => (
                <tr class="border-t border-zinc-800">
                  <td class="p-4">{category}</td>

                  <td class="p-4">
                    {data.total}
                  </td>

                  <td class="p-4 text-blue-400">
                    {data.confirmed}
                  </td>

                  <td class="p-4 text-lime-400">
                    {data.attended}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      {/* DEALER */}
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
        <div class="px-5 py-4 border-b border-zinc-800">
          <h2 class="text-xl font-semibold">
            Dealer Summary
          </h2>
        </div>

        <table class="w-full">
          <thead>
            <tr class="bg-zinc-800">
              <th class="p-4 text-left">Dealer</th>
              <th class="p-4 text-left">Total</th>
              <th class="p-4 text-left">Confirmed</th>
              <th class="p-4 text-left">Attended</th>
            </tr>
          </thead>

          <tbody>
            <For
              each={Object.entries(
                summary().dealers || {},
              )}
            >
              {([dealer, data]) => (
                <tr class="border-t border-zinc-800">
                  <td class="p-4">{dealer}</td>

                  <td class="p-4">
                    {data.total}
                  </td>

                  <td class="p-4 text-blue-400">
                    {data.confirmed}
                  </td>

                  <td class="p-4 text-lime-400">
                    {data.attended}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      {/* DUMMY USERS */}
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
        <div class="px-5 py-4 border-b border-zinc-800">
          <h2 class="text-xl font-semibold">
            Generated QRs
          </h2>
        </div>

        <table class="w-full">
          <thead>
            <tr class="bg-zinc-800">
              <th class="p-4 text-left">Category</th>
              <th class="p-4 text-left">Generated</th>
              <th class="p-4 text-left">Attended</th>
            </tr>
          </thead>

          <tbody>
            <For
              each={Object.entries(
                summary().dummyUsers || {},
              )}
            >
              {([category, data]) => (
                <tr class="border-t border-zinc-800">
                  <td class="p-4">{category}</td>

                  <td class="p-4 text-yellow-400">
                    {data.generated}
                  </td>

                  <td class="p-4 text-lime-400">
                    {data.attended}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      {/* VERTICAL */}
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div class="px-5 py-4 border-b border-zinc-800">
          <h2 class="text-xl font-semibold">
            Vertical Attendance
          </h2>
        </div>

        <table class="w-full">
          <thead>
            <tr class="bg-zinc-800">
              <th class="p-4 text-left">Vertical</th>
              <th class="p-4 text-left">Attended</th>
            </tr>
          </thead>

          <tbody>
            <For
              each={Object.entries(
                summary().verticals || {},
              )}
            >
              {([vertical, total]) => (
                <tr class="border-t border-zinc-800">
                  <td class="p-4">{vertical}</td>

                  <td class="p-4 text-lime-400">
                    {total}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
