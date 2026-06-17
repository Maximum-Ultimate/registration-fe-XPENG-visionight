import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { ArrowUpDown } from "lucide-solid";
export default function SummaryDashboard() {
  const [summary, setSummary] = createSignal({
    totals: {},
    realUsers: {},
    dealers: {},
    dummyUsers: {},
    verticals: {},
  });
  const [search, setSearch] = createSignal("");
  const [activeTab, setActiveTab] = createSignal("summary");
  const [users, setUsers] = createSignal([]);
  const [categoryFilter, setCategoryFilter] = createSignal("ALL");
  const [attendanceFilter, setAttendanceFilter] = createSignal("ALL");
  const [sortBy, setSortBy] = createSignal("");
  const [sortDirection, setSortDirection] = createSignal("asc");
  let ws;
  onMount(() => {
    ws = new WebSocket("wss://cloud.xpengvisionnight.co.id");

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: "GET_DASHBOARD_SUMMARY",
        }),
      );
      ws.send(
        JSON.stringify({
          action: "GET_USERS_DASHBOARD",
        }),
      );
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "DASHBOARD_SUMMARY":
          setSummary(message.data);
          break;
        case "updateUsersDashboard":
          setUsers(message.data?.users || []);
          break;
      }
    };
  });
  onCleanup(() => {
    ws?.close();
  });
  const filteredUsers = () => {
    let data = users().filter((user) => {
      const keyword = search().toLowerCase();

      const matchSearch =
        !keyword ||
        user.name?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.company?.toLowerCase().includes(keyword);

      const matchCategory =
        categoryFilter() === "ALL" ||
        user.category?.startsWith(categoryFilter());

      const matchAttendance =
        attendanceFilter() === "ALL" ||
        user.status_attendance === attendanceFilter();

      return matchSearch && matchCategory && matchAttendance;
    });

    if (sortBy()) {
      data.sort((a, b) => {
        const aValue = a[sortBy()] ?? "";

        const bValue = b[sortBy()] ?? "";

        if (sortDirection() === "asc") {
          return String(aValue).localeCompare(String(bValue));
        }

        return String(bValue).localeCompare(String(aValue));
      });
    }

    return data;
  };
  const handleSort = (field) => {
    if (sortBy() === field) {
      setSortDirection(sortDirection() === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  return (
    <div class="min-h-screen bg-zinc-950 text-white p-6">
      {/* HEADER */}
      <div class="mb-8">
        <h1 class="text-4xl font-bold">XPENG V1SION NIGHT</h1>

        <p class="text-zinc-400 mt-2">Live Dashboard Summary</p>
      </div>
      <div class="flex gap-3 mb-8">
        <button
          onClick={() => setActiveTab("summary")}
          class={`px-5 py-3 rounded-xl ${
            activeTab() === "summary" ? "bg-lime-400 text-black" : "bg-zinc-900"
          }`}
        >
          Summary
        </button>

        <button
          onClick={() => setActiveTab("details")}
          class={`px-5 py-3 rounded-xl ${
            activeTab() === "details" ? "bg-lime-400 text-black" : "bg-zinc-900"
          }`}
        >
          Details
        </button>
      </div>

      <Show when={activeTab() === "summary"}>
        {/* KPI */}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div class="text-zinc-400 text-sm">Real Users</div>

            <div class="text-4xl font-bold mt-2">
              {summary().totals?.realUsers || 0}
            </div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div class="text-zinc-400 text-sm">Generated QRs</div>

            <div class="text-4xl font-bold text-yellow-400 mt-2">
              {summary().totals?.dummyUsers || 0}
            </div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div class="text-zinc-400 text-sm">Confirmed</div>

            <div class="text-4xl font-bold text-blue-400 mt-2">
              {summary().totals?.confirmed || 0}
            </div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div class="text-zinc-400 text-sm">Attended</div>

            <div class="text-4xl font-bold text-lime-400 mt-2">
              {summary().totals?.attended || 0}
            </div>
          </div>
        </div>

        {/* REAL USERS */}
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div class="px-5 py-4 border-b border-zinc-800">
            <h2 class="text-xl font-semibold">Real Users</h2>
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
              <For each={Object.entries(summary().realUsers || {})}>
                {([category, data]) => (
                  <tr class="border-t border-zinc-800">
                    <td class="p-4">{category}</td>

                    <td class="p-4">{data.total}</td>

                    <td class="p-4 text-blue-400">{data.confirmed}</td>

                    <td class="p-4 text-lime-400">{data.attended}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        {/* DEALER */}
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div class="px-5 py-4 border-b border-zinc-800">
            <h2 class="text-xl font-semibold">Dealer Summary</h2>
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
              <For each={Object.entries(summary().dealers || {})}>
                {([dealer, data]) => (
                  <tr class="border-t border-zinc-800">
                    <td class="p-4">{dealer}</td>

                    <td class="p-4">{data.total}</td>

                    <td class="p-4 text-blue-400">{data.confirmed}</td>

                    <td class="p-4 text-lime-400">{data.attended}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        {/* DUMMY USERS */}
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div class="px-5 py-4 border-b border-zinc-800">
            <h2 class="text-xl font-semibold">Generated QRs</h2>
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
              <For each={Object.entries(summary().dummyUsers || {})}>
                {([category, data]) => (
                  <tr class="border-t border-zinc-800">
                    <td class="p-4">{category}</td>

                    <td class="p-4 text-yellow-400">{data.generated}</td>

                    <td class="p-4 text-lime-400">{data.attended}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        {/* VERTICAL */}
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div class="px-5 py-4 border-b border-zinc-800">
            <h2 class="text-xl font-semibold">Vertical Attendance</h2>
          </div>

          <table class="w-full">
            <thead>
              <tr class="bg-zinc-800">
                <th class="p-4 text-left">Vertical</th>
                <th class="p-4 text-left">Attended</th>
              </tr>
            </thead>

            <tbody>
              <For each={Object.entries(summary().verticals || {})}>
                {([vertical, total]) => (
                  <tr class="border-t border-zinc-800">
                    <td class="p-4">{vertical}</td>

                    <td class="p-4 text-lime-400">{total}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
      <Show when={activeTab() === "details"}>
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-zinc-900 rounded-xl p-4">
              <div class="text-zinc-400">Total Users</div>

              <div class="text-3xl font-bold">{filteredUsers().length}</div>
            </div>

            <div class="bg-zinc-900 rounded-xl p-4">
              <div class="text-zinc-400">Confirmed</div>

              <div class="text-3xl font-bold text-blue-400">
                {
                  filteredUsers().filter(
                    (u) => u.status_confirmation === "confirmed",
                  ).length
                }
              </div>
            </div>

            <div class="bg-zinc-900 rounded-xl p-4">
              <div class="text-zinc-400">Attended</div>

              <div class="text-3xl font-bold text-lime-400">
                {
                  filteredUsers().filter(
                    (u) => u.status_attendance === "attended",
                  ).length
                }
              </div>
            </div>

            <div class="bg-zinc-900 rounded-xl p-4">
              <div class="text-zinc-400">Not Attended</div>

              <div class="text-3xl font-bold text-red-400">
                {
                  filteredUsers().filter(
                    (u) => u.status_attendance !== "attended",
                  ).length
                }
              </div>
            </div>
          </div>
          <div class="overflow-auto max-h-[75vh]">
            <input
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search name, email, company..."
              class="
    bg-zinc-800
    border
    border-zinc-700
    rounded-xl
    px-4
    py-3
    w-96
  "
            />
            <select
              value={categoryFilter()}
              onChange={(e) => setCategoryFilter(e.currentTarget.value)}
              class="
    bg-zinc-800
    border
    border-zinc-700
    rounded-xl
    px-4
    py-3
  "
            >
              <option>ALL</option>
              <option>VIP</option>
              <option>VVIP</option>
              <option>SUPER VVIP</option>
              <option>DEALER</option>
              <option>COMMUNITY</option>
              <option>MEDIA</option>
            </select>
            <select
              value={attendanceFilter()}
              onChange={(e) => setAttendanceFilter(e.currentTarget.value)}
              class="
    bg-zinc-800
    border
    border-zinc-700
    rounded-xl
    px-4
    py-3
  "
            >
              <option value="ALL">All Attendance</option>
              <option value="attended">Attended</option>
              <option value="pending">Not Attended</option>
            </select>
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-zinc-800">
                <tr>
                  <th class="p-3 text-left">
                    <button
                      class=" flex items-center gap-2"
                      onClick={() => handleSort("name")}
                    >
                      Name
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th class="p-3 text-left">
                    <button
                      class=" flex items-center gap-2"
                      onClick={() => handleSort("category")}
                    >
                      Category
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th class="p-3 text-left">
                    <button
                      class=" flex items-center gap-2"
                      onClick={() => handleSort("company")}
                    >
                      Company
                      <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class=" flex items-center gap-2"
                      onClick={() => handleSort("email")}
                    >
                      Email
                      <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class=" flex items-center gap-2"
                      onClick={() => handleSort("status_confirmation")}
                    >
                      Confirmation
                      <ArrowUpDown size={14} />
                    </button>
                  </th>

                  <th class="p-3 text-left">
                    <button
                      class=" flex items-center gap-2"
                      onClick={() => handleSort("status_attendance")}
                    >
                      Attendance
                      <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class=" flex items-center gap-2"
                      onClick={() => handleSort("vertical")}
                    >
                      Vertical
                      <ArrowUpDown size={14} />
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody>
                <For each={filteredUsers()}>
                  {(user) => (
                    <tr class="border-t border-zinc-800">
                      <td class="p-3">{user.name}</td>

                      <td class="p-3">{user.category}</td>

                      <td class="p-3">{user.company}</td>

                      <td class="p-3">{user.email}</td>

                      <td class="p-3">
                        <span
                          class={
                            user.status_confirmation === "confirmed"
                              ? "text-blue-400"
                              : "text-zinc-400"
                          }
                        >
                          {user.status_confirmation}
                        </span>
                      </td>

                      <td class="p-3">
                        <span
                          class={
                            user.status_attendance === "attended"
                              ? "text-lime-400"
                              : "text-zinc-400"
                          }
                        >
                          {user.status_attendance}
                        </span>
                      </td>

                      <td class="p-3">{user.vertical}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>
    </div>
  );
}
