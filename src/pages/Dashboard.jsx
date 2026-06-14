import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import Swal from "sweetalert2";
import CryptoJS from "crypto-js";

export default function DealerDashboard() {
  const [dealers, setDealers] = createSignal([]);
  const [activeTab, setActiveTab] = createSignal("monitor");
  const [editingCapacity, setEditingCapacity] = createSignal({});
  const [newDealer, setNewDealer] = createSignal({
    dealer_name: "",
    max_capacity: 0,
  });
  const [authorized, setAuthorized] = createSignal(false);

  let ws;

  onMount(() => {
    try {
      const token = localStorage.getItem("dealer_auth");

      if (token) {
        const bytes = CryptoJS.AES.decrypt(token, "XPENG_DASHBOARD");

        const result = bytes.toString(CryptoJS.enc.Utf8);

        if (result === "AUTHORIZED") {
          setAuthorized(true);
        }
      }
    } catch {}
    ws = new WebSocket("wss://cloud.xpengvisionnight.co.id");
    ws.onopen = () => {
      requestLogin();
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "dealer-seat":
          setDealers(message.data || []);
          break;

        case "dealer-list":
          setDealers(message.data || []);
          break;
        case "UPDATE_DEALER_CAPACITY_RESPONSE": {
          if (message.success) {
            setEditingCapacity({});
            showToast("success", message.message);
          } else {
            showToast("error", message.message);
          }
          break;
        }
        case "CREATE_DEALER_RESPONSE": {
          if (message.success) {
            showToast("success", message.message);

            setNewDealer({
              dealer_name: "",
              max_capacity: 0,
            });
          } else {
            showToast("error", message.message);
          }

          break;
        }
        case "AUTH_ADMIN_RESPONSE": {
          if (message.success) {
            const encrypted = CryptoJS.AES.encrypt(
              "AUTHORIZED",
              "XPENG_DASHBOARD",
            ).toString();

            localStorage.setItem("dealer_auth", encrypted);

            setAuthorized(true);

            showToast("success", "Login Success");

            ws.send(
              JSON.stringify({
                action: "GET_DEALER_SEAT",
              }),
            );
          } else {
            await Swal.fire({
              icon: "error",
              title: "Incorrect Password",
              text: "Please try again.",
              background: "#18181b",
              color: "#fff",
              confirmButtonColor: "#dc2626",
            });

            requestLogin();
          }

          break;
        }
        case "DELETE_DEALER_RESPONSE": {
          if (message.success) {
            showToast("success", message.message);
          } else {
            showToast("error", message.message);
          }
          break;
        }
      }
    };
  });

  onCleanup(() => {
    ws?.close();
  });
  const showToast = (icon, title) => {
    Swal.fire({
      icon,
      title,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      background: "#18181b",
      color: "#fff",
      customClass: {
        popup: "border border-zinc-700 rounded-xl",
      },
    });
  };
  const saveDealer = (dealer) => {
    const newCapacity = editingCapacity()[dealer.id] ?? dealer.max_capacity;
    ws.send(
      JSON.stringify({
        action: "UPDATE_DEALER_CAPACITY",
        payload: {
          id: dealer.id,
          max_capacity: Number(newCapacity),
        },
      }),
    );
  };
  const totalCapacity = () =>
    dealers().reduce((sum, d) => sum + Number(d.max_capacity || 0), 0);
  const totalUsed = () =>
    dealers().reduce((sum, d) => sum + Number(d.used_seat || 0), 0);
  const totalRemaining = () => totalCapacity() - totalUsed();
  const createDealer = () => {
    ws.send(
      JSON.stringify({
        action: "CREATE_DEALER",
        payload: {
          dealer_name: newDealer().dealer_name,
          max_capacity: Number(newDealer().max_capacity),
        },
      }),
    );
  };
  const requestLogin = async () => {
    const result = await Swal.fire({
      title: "Admin Access",
      input: "password",
      inputPlaceholder: "Enter admin password",
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonText: "Login",
      background: "#18181b",
      color: "#fff",
      inputAttributes: {
        autocapitalize: "off",
        autocorrect: "off",
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    ws.send(
      JSON.stringify({
        action: "AUTH_ADMIN",
        payload: {
          password: result.value,
        },
      }),
    );
  };
  const openAddDealer = async () => {
    const result = await Swal.fire({
      title: "Add Dealer",
      html: `
      <input
        id="dealer_name"
        class="swal2-input"
        placeholder="Dealer Name"
      />

      <input
        id="max_capacity"
        class="swal2-input"
        type="number"
        placeholder="Capacity"
      />
    `,
      showCancelButton: true,
      confirmButtonText: "Create",
      background: "#18181b",
      color: "#fff",
      preConfirm: () => {
        return {
          dealer_name: document.getElementById("dealer_name").value,
          max_capacity: document.getElementById("max_capacity").value,
        };
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    ws.send(
      JSON.stringify({
        action: "CREATE_DEALER",
        payload: {
          dealer_name: result.value.dealer_name,
          max_capacity: Number(result.value.max_capacity),
        },
      }),
    );
  };
  const deleteDealer = async (dealer) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Dealer?",
      html: `
      Dealer <b>${dealer.dealer_name}</b>
      akan disembunyikan dari dashboard.
    `,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      background: "#18181b",
      color: "#fff",
    });

    if (!result.isConfirmed) return;

    ws.send(
      JSON.stringify({
        action: "DELETE_DEALER",
        payload: {
          id: dealer.id,
        },
      }),
    );
  };
  return (
    <Show
      when={authorized()}
      fallback={
        <div class="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
          Waiting for authentication...
        </div>
      }
    >
      <div class="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
        {/* HEADER */}
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <h1 class="text-2xl md:text-4xl font-bold">Dealer Dashboard</h1>

          <div class="grid grid-cols-2 gap-2 w-full md:w-auto">
            <button
              class={`px-4 py-3 rounded-xl font-medium transition ${
                activeTab() === "monitor" ? "bg-blue-600" : "bg-zinc-800"
              }`}
              onClick={() => setActiveTab("monitor")}
            >
              Monitoring
            </button>

            <button
              class={`px-4 py-3 rounded-xl font-medium transition ${
                activeTab() === "control" ? "bg-blue-600" : "bg-zinc-800"
              }`}
              onClick={() => setActiveTab("control")}
            >
              Control
            </button>
          </div>
        </div>

        {/* MONITOR */}
        <Show when={activeTab() === "monitor"}>
          {/* SUMMARY */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div class="text-zinc-400 text-sm">Total Capacity</div>

              <div class="text-3xl font-bold mt-2">{totalCapacity()}</div>
            </div>

            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div class="text-zinc-400 text-sm">Total Used</div>

              <div class="text-3xl font-bold text-red-400 mt-2">
                {totalUsed()}
              </div>
            </div>

            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div class="text-zinc-400 text-sm">Remaining Seat</div>

              <div class="text-3xl font-bold text-lime-400 mt-2">
                {totalRemaining()}
              </div>
            </div>
          </div>

          {/* DEALER CARD */}
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <For each={dealers()}>
              {(dealer) => {
                const used = Number(dealer.used_seat) || 0;

                const capacity = Number(dealer.max_capacity) || 0;

                const remaining = capacity - used;

                const percent = capacity > 0 ? (used / capacity) * 100 : 0;

                return (
                  <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <h2 class="text-lg font-semibold">{dealer.dealer_name}</h2>

                    <div class="mt-4 space-y-2">
                      <div class="flex justify-between">
                        <span class="text-zinc-400">Capacity</span>

                        <span class="font-bold">{capacity}</span>
                      </div>

                      <div class="flex justify-between">
                        <span class="text-zinc-400">Used</span>

                        <span class="font-bold text-red-400">{used}</span>
                      </div>

                      <div class="flex justify-between">
                        <span class="text-zinc-400">Remaining</span>

                        <span
                          class={`font-bold ${
                            remaining <= 5 ? "text-red-500" : "text-lime-400"
                          }`}
                        >
                          {remaining}
                        </span>
                      </div>
                    </div>

                    <div class="mt-5">
                      <div class="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          class={`h-full ${
                            percent >= 100
                              ? "bg-red-500"
                              : percent >= 80
                                ? "bg-yellow-500"
                                : "bg-lime-500"
                          }`}
                          style={{
                            width: `${Math.min(percent, 100)}%`,
                          }}
                        />
                      </div>

                      <div class="mt-2 text-sm text-zinc-400">
                        {percent.toFixed(0)}%
                      </div>
                    </div>

                    <Show when={remaining <= 0}>
                      <div class="mt-4 bg-red-500/20 text-red-400 rounded-lg py-2 text-center font-bold">
                        FULL
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* CONTROL */}
        <Show when={activeTab() === "control"}>
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-5">
            <button
              class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
              onClick={openAddDealer}
            >
              + Add Dealer
            </button>
          </div>
          <div class="space-y-4">
            {/* MOBILE */}
            <div class="md:hidden space-y-4">
              <For each={dealers()}>
                {(dealer) => {
                  const used = Number(dealer.used_seat) || 0;

                  const remaining = Number(dealer.max_capacity) - used;

                  return (
                    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <div class="font-semibold mb-3">{dealer.dealer_name}</div>

                      <div class="flex justify-between text-sm mb-3">
                        <span>Used : {used}</span>

                        <span
                          class={
                            remaining <= 5 ? "text-red-400" : "text-lime-400"
                          }
                        >
                          Remaining : {remaining}
                        </span>
                      </div>

                      <div class="flex gap-2">
                        <input
                          type="number"
                          value={
                            editingCapacity()[dealer.id] ?? dealer.max_capacity
                          }
                          class="bg-zinc-800 px-3 py-2 rounded-lg w-32"
                          onInput={(e) =>
                            setEditingCapacity((prev) => ({
                              ...prev,
                              [dealer.id]: e.target.value,
                            }))
                          }
                        />

                        <button
                          class="bg-blue-600 px-4 rounded-lg"
                          onClick={() => saveDealer(dealer)}
                        >
                          Save
                        </button>
                        <button
                          class="bg-red-600 px-4 rounded-lg"
                          onClick={() => deleteDealer(dealer)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>

            {/* DESKTOP */}
            <div class="hidden md:block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table class="w-full">
                <thead>
                  <tr class="bg-zinc-800">
                    <th class="p-4 text-left">Dealer</th>
                    <th class="p-4 text-left">Capacity</th>
                    <th class="p-4 text-left">Used</th>
                    <th class="p-4 text-left">Remaining</th>
                    <th class="p-4 text-left">Action</th>
                  </tr>
                </thead>

                <tbody>
                  <For each={dealers()}>
                    {(dealer) => {
                      const used = Number(dealer.used_seat) || 0;

                      const remaining = Number(dealer.max_capacity) - used;

                      return (
                        <tr class="border-t border-zinc-800">
                          <td class="p-4">{dealer.dealer_name}</td>

                          <td class="p-4">
                            <input
                              type="number"
                              value={
                                editingCapacity()[dealer.id] ??
                                dealer.max_capacity
                              }
                              class="bg-zinc-800 px-3 py-2 rounded-lg w-32"
                              onInput={(e) =>
                                setEditingCapacity((prev) => ({
                                  ...prev,
                                  [dealer.id]: e.target.value,
                                }))
                              }
                            />
                          </td>

                          <td class="p-4">{used}</td>

                          <td
                            class={`p-4 font-bold ${
                              remaining <= 5 ? "text-red-400" : "text-lime-400"
                            }`}
                          >
                            {remaining}
                          </td>

                          <td class="p-4">
                            <div class="flex gap-2">
                              <button
                                class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                                onClick={() => saveDealer(dealer)}
                              >
                                Save
                              </button>

                              <button
                                class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                                onClick={() => deleteDealer(dealer)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}
