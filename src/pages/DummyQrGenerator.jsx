import { createSignal, Show, For, onMount } from "solid-js";

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import { sendWS } from "../services/ws";
import heroRegular from "../assets/KVFHDWEB.png";
import html2canvas from "html2canvas";
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
    localWs = new WebSocket("ws://localhost:3010");
    localWs.onopen = () => {
      console.log("WS Connected");
    };
    localWs.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      console.log("WS RESPONSE:", response);
      if (
        response.status === "success" &&
        response.type === "dummy-users-generated"
      ) {
        setUsers(response.data);

        Swal.update({
          title: "Creating PDF...",
          html: `${response.data.length} QR generated<br/>Preparing PDF...`,
        });

        try {
          await createPdf(response.data, selectedCategory());

          Swal.fire({
            icon: "success",
            title: "PDF Downloaded",
            text: `${response.data.length} QR invitation(s) downloaded successfully`,
            timer: 2000,
            showConfirmButton: false,
            background: "#111827",
            color: "#fff",
          });
        } catch (err) {
          console.error(err);

          Swal.fire({
            icon: "error",
            title: "PDF Generation Failed",
            text: err.message,
            background: "#111827",
            color: "#fff",
          });
        }

        setLoading(false);
      }
    };

    localWs.onerror = (err) => {
      console.error("WS Error", err);
    };
  });
  const createPdf = async (users, categoryName) => {
    let pdf = null;
    const eventTime = ["VIP", "VVIP", "SUPER VVIP"].includes(categoryName)
      ? "16.30 - 21.00 WIB"
      : "14.00 - 21.00 WIB";
    const container = document.getElementById("pdf-render-container");

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      const qrImage = await QRCode.toDataURL(user.uniqueId, {
        width: 800,
        margin: 1,
      });

      container.innerHTML = `
      <div
        style="
          width:900px;
          box-sizing:border-box;
          background:#000;
          color:white;
          padding:40px;
          font-family:Arial,sans-serif;
        "
      >

        <div style="text-align:center">
          <h1
            style="
              font-size:56px;
              font-weight:900;
              margin-bottom:30px;
              letter-spacing:2px;
            "
          >
            XPENG V1SION NIGHT 2026
          </h1>
        </div>

        <img
          src="${heroRegular}"
          style="
            width:100%;
            border-radius:20px;
            display:block;
          "
        />

        <div
          style="
            text-align:center;
            margin-top:40px;
          "
        >
          <p
            style="
              color:#d4d4d4;
              font-size:22px;
              line-height:1.6;
              max-width:700px;
              margin:auto;
            "
          >
            This is your official QR invitation
            for XPENG V1SION NIGHT 2026.
            Please present this QR code to the
            registration officer upon arrival.
          </p>
        </div>

        <div
          style="
            margin-top:50px;
            border:2px solid #D8FF24;
            border-radius:30px;
            overflow:hidden;
            background:#050505;
          "
        >

          <div
            style="
              background:#D8FF24;
              color:#000;
              text-align:center;
              font-weight:700;
              padding:20px;
              font-size:28px;
            "
          >
            ${categoryName}
          </div>

          <div
            style="
              padding:50px;
            "
          >

            <div
              style="
                display:flex;
                justify-content:center;
              "
            >
              <div
                style="
                  width:350px;
                  height:350px;
                  background:white;
                  border-radius:24px;
                  display:flex;
                  justify-content:center;
                  align-items:center;
                  padding:15px;
                "
              >
                <img
                  src="${qrImage}"
                  style="
                    width:320px;
                    height:320px;
                    display:block;
                  "
                />
              </div>
            </div>

            <div
              style="
                margin-top:40px;
                text-align:center;
                color:white;
              "
            >

              <div style="margin-bottom:25px;">
                <div
                  style="
                    color:#9ca3af;
                    font-size:18px;
                    margin-bottom:5px;
                  "
                >
                  Name
                </div>

                <div
                  style="
                    font-size:32px;
                    font-weight:700;
                    word-break:break-word;
                  "
                >
                  ${user.name}
                </div>
              </div>

              <div>
                <div
                  style="
                    color:#9ca3af;
                    font-size:18px;
                    margin-bottom:5px;
                  "
                >
                  Registration ID
                </div>

                <div
                  style="
                    font-size:24px;
                    font-weight:600;
                  "
                >
                  ${user.uniqueId}
                </div>
              </div>

            </div>

          </div>
        </div>

        <div
          style="
            margin-top:40px;
            border:1px solid #262626;
            border-radius:24px;
            padding:35px;
            background:#050505;
          "
        >
          <h3
            style="
              color:white;
              font-size:32px;
              margin:0 0 25px 0;
              font-weight:700;
            "
          >
            EVENT REMINDER
          </h3>

          <div
            style="
              color:#d4d4d4;
              font-size:24px;
              line-height:2;
            "
          >
            <div>📅 28 June 2026</div>
            <div>📍 Istora Senayan, Jakarta</div>
            <div>🕑 ${eventTime}</div>
          </div>
        </div>

      </div>
    `;

      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(container.firstElementChild, {
        scale: 2,
        backgroundColor: "#000000",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");

      if (!pdf) {
        pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "landscape" : "portrait",
          unit: "px",
          format: [canvas.width, canvas.height],
        });
      } else {
        pdf.addPage([canvas.width, canvas.height]);
      }

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    }

    if (pdf) {
      pdf.save(`${categoryName}-${Date.now()}.pdf`);
    }
  };
  const generateDummyQR = async (category) => {
    if (!localWs || localWs.readyState !== WebSocket.OPEN) {
      Swal.fire({
        icon: "error",
        title: "WebSocket Not Connected",
        background: "#111827",
        color: "#fff",
      });
      return;
    }

    Swal.fire({
      title: "Generating QR...",
      text: "Please wait while dummy users are being created",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: "#111827",
      color: "#fff",
      didOpen: () => {
        Swal.showLoading();
      },
    });

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
          </div>
        </div>
      </div>
      <div
        id="pdf-render-container"
        style={{
          position: "fixed",
          left: "-99999px",
          top: "0",
          width: "900px",
        }}
      ></div>
    </div>
  );
}
