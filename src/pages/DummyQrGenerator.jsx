import { createSignal, Show, For, onMount } from "solid-js";

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import { sendWS } from "../services/ws";
import heroRegular from "../assets/KVFHDWEB.png";
import heroVIP from "../assets/KVFHDWEB.png";

export default function DummyQrGenerator() {
  const [counts, setCounts] = createSignal({
    COMMUNITY: 0,
    MEDIA: 0,
    VIP: 0,
    VVIP: 0,
    "SUPER VVIP": 0,
    DEALER: 0,
    FRONT: 0,
    LEASING: 0,
  });
  const [loading, setLoading] = createSignal(false);
  const [selectedCategory, setSelectedCategory] = createSignal("");
  const [users, setUsers] = createSignal([]);
  const [generated, setGenerated] = createSignal(false);
  let localWs;
  onMount(() => {
    localWs = new WebSocket("wss://cloud.xpengvisionnight.co.id");
    localWs.onopen = () => {
      console.log("WS Connected");
    };
    localWs.onmessage = (event) => {
      const response = JSON.parse(event.data);
      console.log("WS RESPONSE:", response);
      if (
        response.status === "success" &&
        response.type === "dummy-users-generated"
      ) {
        setUsers(response.data);
        Swal.fire({
          icon: "success",
          title: "Users Generated",
          text: `${response.data.length} users berhasil dibuat`,
        });
      }
    };

    localWs.onerror = (err) => {
      console.error("WS Error", err);
    };
  });
  const createPdf = async (users, categoryName) => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (i > 0) {
        pdf.addPage();
      }
      const qrImage = await QRCode.toDataURL(user.uniqueId, {
        width: 1000,
      });
      // HEADER
      pdf.setFontSize(24);
      pdf.text("XPENG V1SION NIGHT", 105, 25, {
        align: "center",
      });
      pdf.setFontSize(16);
      pdf.text(categoryName, 105, 38, {
        align: "center",
      });
      // QR
      pdf.addImage(qrImage, "PNG", 40, 50, 130, 130);
      // NAME
      pdf.setFontSize(20);
      pdf.text(user.name, 105, 200, {
        align: "center",
      });
      // UNIQUE ID
      pdf.setFontSize(10);
      pdf.text(user.uniqueId, 105, 210, {
        align: "center",
      });
      // PAGE
      pdf.setFontSize(10);
      pdf.text(`Page ${i + 1} / ${users.length}`, 105, 280, {
        align: "center",
      });
    }
    pdf.save(`${categoryName}.pdf`);
  };
  const generateDummyQR = async (category) => {
    if (!localWs || localWs.readyState !== WebSocket.OPEN) {
      Swal.fire({
        icon: "error",
        title: "WebSocket Not Connected",
      });
      return;
    }

    setLoading(true);

    setSelectedCategory(category);

    localWs.send(
      JSON.stringify({
        action: "GENERATE_DUMMY_QR",
        payload: {
          category,
          count: counts()[category],
        },
      }),
    );
  };
  const downloadPdf = async () => {
    await createPdf(users(), selectedCategory());
  };
  const categories = [
    "COMMUNITY",
    "MEDIA",
    "VIP",
    "VVIP",
    "SUPER VVIP",
    "DEALER",
    "FRONT",
    "LEASING",
  ];
  const updateCount = (category, value) => {
    setCounts((prev) => ({
      ...prev,
      [category]: Number(value),
    }));
  };
  return (
    <div class="min-h-screen bg-black text-white p-8">
      <div class="max-w-7xl mx-auto">
        <div class="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03]">
          {/* HEADER */}
          <div class="px-8 py-8 border-b border-white/10">
            <h1 class="text-4xl font-bold">DUMMY QR GENERATOR</h1>
            <p class="mt-3 text-zinc-400">
              Generate operational QR codes and export PDF by category.
            </p>
          </div>
          {/* FORM */}
          <div class="mt-8 border border-white/10 rounded-2xl overflow-hidden">
            <table class="w-full">
              <thead class="bg-white/[0.03]">
                <tr>
                  <th class="p-4 text-left">Category</th>

                  <th class="p-4 text-left">Total User</th>

                  <th class="p-4 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                <For each={categories}>
                  {(cat) => (
                    <tr class="border-t border-white/10">
                      <td class="p-4">{cat}</td>

                      <td class="p-4">
                        <input
                          type="number"
                          min="1"
                          value={counts()[cat]}
                          onInput={(e) =>
                            updateCount(cat, e.currentTarget.value)
                          }
                          class="
                  w-32
                  bg-black
                  border
                  border-white/10
                  rounded-lg
                  p-2
                "
                        />
                      </td>

                      <td class="p-4">
                        <button
                          onClick={() => generateDummyQR(cat)}
                          class="
                  bg-[#D8FF24]
                  text-black
                  px-4
                  py-2
                  rounded-lg
                  font-bold
                "
                        >
                          GENERATE
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
            <Show when={users().length > 0}>
              <div class="p-6">
                <button
                  onClick={downloadPdf}
                  class="
                    bg-[#D8FF24]
                    text-black
                    px-6
                    py-3
                    rounded-lg
                    font-bold
                "
                >
                  DOWNLOAD PDF
                </button>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
