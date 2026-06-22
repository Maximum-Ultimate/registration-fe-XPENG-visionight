import {
  createSignal,
  onMount,
  onCleanup,
  For,
  Show,
  createMemo,
} from "solid-js";
import Swal from "sweetalert2";
import { QrCode } from "lucide-solid";
import { useNavigate } from "@solidjs/router";
import { ArrowUpDown, History, ChevronLeft, ChevronRight } from "lucide-solid";
import { Html5Qrcode } from "html5-qrcode";
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
  const [participant, setParticipant] = createSignal(
    JSON.parse(localStorage.getItem("lastParticipant") || "null"),
  );
  const [scannerStarted, setScannerStarted] = createSignal(false);
  const [sortBy, setSortBy] = createSignal("");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [showHistory, setShowHistory] = createSignal(false);
  const [scanHistory, setScanHistory] = createSignal(
    JSON.parse(localStorage.getItem("scanHistory") || "[]"),
  );
  const navigate = useNavigate();

  let ws;
  let scanner;

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

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.status === "error") {
        await stopScanner();

        let errorText = message.message;
        let title = "Sudah Check-In";

        if (errorText === "User does not exist") {
          title = "QR Tidak Terdaftar";

          errorText = "Silahkan hubungi Helpdesk";
        } else if (errorText.includes("already attended at")) {
          const [name, dateText] = errorText.split(" already attended at ");
          const date = new Date(dateText);

          errorText =
            `${name}\n\n` +
            `Sudah melakukan attendance sebelumnya.\n` +
            `Waktu scan: ${date.toLocaleString("id-ID")}`;
        }

        Swal.fire({
          icon: "warning",
          title,
          html: `
      <div class="text-zinc-300 whitespace-pre-line">
        ${errorText}
      </div>
    `,
          background: "#09090b",
          color: "#fff",
          confirmButtonText: "OK",
          confirmButtonColor: "#a3e635",
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup:
              "border border-lime-400 rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.35)]",
            title: "text-lime-400",
            confirmButton: "font-bold rounded-xl px-8",
          },
        }).then(() => {
          startScanner();
        });

        return;
      }

      switch (message.type) {
        case "DASHBOARD_SUMMARY":
          setSummary(message.data);
          break;

        case "updateUsersDashboard":
          setUsers(message.data?.users || []);
          break;

        case "attend-confirm":
          await stopScanner();

          setParticipant(message);
          localStorage.setItem("lastParticipant", JSON.stringify(message));
          setScanHistory((prev) => {
            const newHistory = [
              {
                ...message,
                time: new Date().toLocaleTimeString(),
              },
              ...prev,
            ];

            // optional batasi 100 item terakhir
            const limitedHistory = newHistory.slice(0, 100);

            localStorage.setItem("scanHistory", JSON.stringify(limitedHistory));

            return limitedHistory;
          });
          Swal.fire({
            icon: "success",
            title: "Attendance Confirmed",
            html: `
    <div class="text-zinc-300">
      ${message.name} (${message.category})<br />
      <span class="text-zinc-400 text-sm">${message.company}</span>
    </div>
  `,
            background: "#09090b",
            color: "#ffffff",
            confirmButtonText: "CONTINUE",
            confirmButtonColor: "#a3e635",
            allowOutsideClick: false,
            allowEscapeKey: false,

            customClass: {
              popup:
                "border border-lime-400 rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.35)]",
              title: "text-lime-400",
              confirmButton: "!text-black font-bold rounded-xl px-8 py-3",
            },
          }).then((result) => {
            if (result.isConfirmed) {
            }
          });
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
  const startScanner = async () => {
    if (scannerStarted()) return;
    try {
      scanner = new Html5Qrcode("reader");
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 250,
        },
        async (decodedText) => {
          // matiin scanner dulu supaya ga scan berkali-kali
          await stopScanner();

          ws.send(
            JSON.stringify({
              action: "ATTEND",
              payload: {
                attendUniqueId: decodedText,
              },
            }),
          );
        },
        () => {},
      );

      setScannerStarted(true);
    } catch (err) {
      console.error(err);
    }
  };
  const stopScanner = async () => {
    try {
      if (scanner && scannerStarted()) {
        await scanner.stop();
        await scanner.clear();
        scanner = null;
      }
    } catch (err) {
      console.error(err);
    }

    setScannerStarted(false);
  };
  const categoryColor = {
    VVIP: {
      bg: "bg-yellow-400",
      border: "border-yellow-400",
      label: "GOLD",
    },
    VIP: {
      bg: "bg-gray-300",
      border: "border-gray-300",
      label: "SILVER",
    },
    DEALER: {
      bg: "bg-cyan-400",
      border: "border-cyan-400",
      label: "CYAN",
    },
    COMMUNITY: {
      bg: "bg-green-500",
      border: "border-green-500",
      label: "GREEN",
    },
    LEASING: {
      bg: "bg-fuchsia-500",
      border: "border-fuchsia-500",
      label: "MAGENTA",
    },
    MEDIA: {
      bg: "bg-orange-500",
      border: "border-orange-500",
      label: "ORANGE",
    },
    FRONT: {
      bg: "bg-violet-300",
      border: "border-violet-300",
      label: "LILAC",
    },
  };
  const merchandiseEligibleVerticals = [
    "Dealer Management 3rd Party",
    "Business Partner Aftersales",
    "Business Partner MARKETING",
    "GAIKINDO & IMI",
    "EIVO Invitation",
    "Celebrity Customer",
    "Pemred",
    "KOL",
    "Community ERA",
    "Car Community",
    "XPENG Apps",
    "Online Activation ( Socmed)",
    "Prospect Leasing",
  ];

  const style = createMemo(
    () => categoryColor[participant()?.category] || categoryColor.VIP,
  );
  const isMerchandiseEligible = () =>
    merchandiseEligibleVerticals.includes(participant()?.vertical || "");

  return (
    <div class="min-h-screen bg-zinc-950 text-white p-6">
      {/* HEADER */}
      <div class="mb-8">
        <h1 class="text-4xl font-bold">XPENG V1SION NIGHT</h1>
        <p class="text-zinc-400 mt-2">Live Dashboard Summary</p>
      </div>
      <div class="flex items-center justify-between mb-8">
        <div class="flex gap-3">
          <button
            onClick={() => setActiveTab("summary")}
            class={`px-5 py-3 rounded-xl ${
              activeTab() === "summary"
                ? "bg-lime-400 text-black"
                : "bg-zinc-900"
            }`}
          >
            Summary
          </button>

          <button
            onClick={() => setActiveTab("details")}
            class={`px-5 py-3 rounded-xl ${
              activeTab() === "details"
                ? "bg-lime-400 text-black"
                : "bg-zinc-900"
            }`}
          >
            Details
          </button>

          <button
            onClick={() => setActiveTab("scanner")}
            disabled 
            class={`px-5 py-3 rounded-xl ${
              activeTab() === "scanner"
                ? "bg-lime-400 text-black"
                : "bg-zinc-900"
            }`}
          >
            Scanner
          </button>
        </div>

        <Show when={activeTab() === "scanner"}>
          <button
            onClick={() => setShowHistory(!showHistory())}
            class="
    w-12 h-12 md:w-auto md:h-auto
    md:px-5 py-3
    bg-zinc-900
    border border-zinc-800
    rounded-full md:rounded-xl
    flex items-center justify-center gap-3
  "
          >
            <History size={18} />
            <span class="hidden md:inline">Scan History</span>
          </button>
        </Show>
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
              <option>FRONT</option>
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
      <Show when={activeTab() === "scanner"}>
        <div class="grid grid-cols-1 xl:grid-cols-[500px_1fr] gap-6">
          {/* Scanner */}
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-[500px]">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold mb-6">Scan QR Code</h2>
              <button class="mb-4" onClick={stopScanner}>
                Close
              </button>
            </div>
            <div class=" w-full aspect-[4/3] max-w-[450px] mx-auto rounded-2xl overflow-hidden relative">
              <div id="reader" class="w-full h-full mx-auto" />
              <Show when={!scannerStarted()}>
                <div
                  class="
      absolute inset-0
      bg-zinc-950
      border border-zinc-800
      rounded-2xl
      flex items-center justify-center
      text-zinc-500
      z-10
    "
                >
                  Scanner Closed
                </div>
              </Show>
            </div>
            <button
              onClick={startScanner}
              disabled={scannerStarted()}
              class="mt-6 w-full py-4 rounded-xl bg-lime-400 text-black font-bold disabled:opacity-50"
            >
              {scannerStarted() ? "Scanning..." : "Start Scanner"}
            </button>
          </div>

          {/* Participant */}
          <Show when={participant()}>
            <div class="space-y-4 w-full ">
              <div>
                <div class="text-zinc-400">Name</div>
                <div>{participant().name}</div>
              </div>
              <div>
                <div class="text-zinc-400">Email</div>
                <div>{participant().email}</div>
              </div>
              <div>
                <div class="text-zinc-400">Company</div>
                <div>{participant().company}</div>
              </div>
              <div>
                <div class="text-zinc-400">Category</div>
                <div>{participant().category}</div>
              </div>
              <div>
                <div class="text-zinc-400">Vertical</div>
                <div>{participant().vertical}</div>
              </div>
              <div class={`border rounded-2xl p-5 ${style().border} `}>
                <div class="text-2xl text-lime-400 font-bold">
                  ✓ ATTENDANCE CONFIRMED
                </div>
                <div class="mt-2 text-zinc-300">Participant data is valid.</div>
                <Show when={isMerchandiseEligible()}>
                  <div class=" mt-4 p-4 rounded-xl border border-orange-400 bg-orange-500/10 text-orange-300 font-bold text-center">
                    🎁 THIS USER IS ELIGIBLE FOR MERCHANDISE
                  </div>
                </Show>
                <button
                  class={`
    mt-8
    w-full
    py-5
    rounded-xl
    font-bold
    text-xl
    text-black
    ${categoryColor[participant()?.category].bg}
  `}
                >
                  {categoryColor[participant()?.category].label} WRISTBAND
                </button>
              </div>
            </div>
          </Show>
        </div>
        <div
          class={`
fixed
top-0
right-0
h-screen
w-96
bg-zinc-950
border-l border-zinc-800
transition-all duration-300
z-50
${showHistory() ? "translate-x-0" : "translate-x-full"}
`}
        >
          <div class="p-5 flex justify-between border-b border-zinc-800">
            <h2 class="text-xl font-bold">Scan History</h2>

            <button onClick={() => setShowHistory(false)}>
              <ChevronRight />
            </button>
          </div>

          <div class="overflow-y-auto h-full p-4 space-y-3">
            <For each={scanHistory()}>
              {(item) => (
                <div class="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div class="font-bold text-lg">{item.name}</div>
                  <div class="text-zinc-400 text-sm">{item.company}</div>
                  <div class="mt-2 flex justify-between">
                    <span class="text-lime-400">{item.category}</span>
                    <span class="text-zinc-500 text-sm">{item.time}</span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
