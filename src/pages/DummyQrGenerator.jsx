import { createSignal, Show, For, onMount } from "solid-js";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import { sendWS } from "../services/ws";
import heroRegular from "../assets/KVFHDWEB.png";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
  const [dummySummary, setDummySummary] = createSignal({});
  const [isSpecialMode, setIsSpecialMode] = createSignal(false);
  const [specialIndex, setSpecialIndex] = createSignal(-1); // Melacak index kategori aktif
  const [specificId, setSpecificId] = createSignal("");
  const [specificName, setSpecificName] = createSignal("");
  const [specificCat, setSpecificCat] = createSignal("VIP");

  let localWs;

  onMount(() => {
    localWs = new WebSocket("wss://cloud.xpengvisionnight.co.id");

    localWs.onopen = () => {
      console.log("WS Connected");
      localWs.send(JSON.stringify({ action: "GET_DASHBOARD_SUMMARY" }));
    };

    localWs.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      console.log("WS RESPONSE:", response);

      // ==========================
      // DASHBOARD SUMMARY
      // ==========================
      if (response.type === "DASHBOARD_SUMMARY") {
        setDummySummary(response.data?.dummyUsers || {});
        return;
      }

      // ==========================
      // GENERATE SUCCESS (Ubah ke ZIP Compact)
      // ==========================
      if (
        response.status === "success" &&
        response.type === "dummy-users-generated"
      ) {
        setUsers(response.data);

        // JIKA SEDANG DALAM MODE SPESIAL 10 PER KATEGORI
        if (isSpecialMode()) {
          console.log(
            `[Special Mode] Berhasil menerima data untuk: ${selectedCategory()} (Index: ${specialIndex()})`,
          );

          const modifiedData = response.data.map((user) => ({
            ...user,
            name: `${user.name} (Special Batch)`,
          }));

          Swal.update({
            title: `Preparing Special ZIP [${selectedCategory()}]...`,
            html: `Packing 10 distinct QRs...`,
          });

          try {
            await createCompactPdf(
              modifiedData,
              `${selectedCategory()}_SPECIAL_10_${Date.now()}`,
            );

            // Hitung indeks kategori berikutnya
            const nextIdx = specialIndex() + 1;

            if (nextIdx < categories.length) {
              const nextCategory = categories[nextIdx];
              console.log(
                `[Special Mode] Bergerak ke kategori berikutnya: ${nextCategory} (Index: ${nextIdx})`,
              );

              // Update state sebelum menembak WS berikutnya
              setSpecialIndex(nextIdx);
              setSelectedCategory(nextCategory);

              // Jeda 1 detik agar WS dan UI proses canvas tidak tabrakan
              setTimeout(() => {
                console.log(
                  `[Special Mode] Menembak WS Request untuk: ${nextCategory}`,
                );
                localWs.send(
                  JSON.stringify({
                    action: "GENERATE_DUMMY_QR",
                    payload: { category: nextCategory, count: 10 },
                  }),
                );
              }, 1000);
            } else {
              // Jika semua kategori (0 sampai 7) sudah selesai dijalankan
              console.log(
                "[Special Mode] Selesai! Semua kategori berhasil diunduh.",
              );
              setIsSpecialMode(false);
              setSpecialIndex(-1);
              setLoading(false);

              Swal.fire({
                icon: "success",
                title: "All Special Batches Downloaded!",
                text: "10 distinct QRs for all categories downloaded successfully.",
                background: "#111827",
                color: "#fff",
              });

              localWs.send(JSON.stringify({ action: "GET_DASHBOARD_SUMMARY" }));
            }
          } catch (err) {
            console.error("[Special Mode] Error sewaktu generate ZIP:", err);
            setIsSpecialMode(false);
            setSpecialIndex(-1);
            setLoading(false);
            Swal.fire({
              icon: "error",
              title: "Special Generation Failed",
              text: err.message,
              background: "#111827",
              color: "#fff",
            });
          }
          return;
        }
        // Ubah Alert Loading ke ZIP
        Swal.update({
          title: "Preparing ZIP...",
          html: `
            ${response.data.length} QR generated <br/>
            Packing into ZIP per batch...
          `,
        });

        try {
          // DI SINI DIUBAH: Menggunakan createCompactPdf agar outputnya ZIP
          // Ditambahkan suffix '_BATCH' supaya beda nama filenya dengan download category total
          await createCompactPdf(
            response.data,
            `${selectedCategory()}_BATCH_${Date.now()}`,
          );

          Swal.fire({
            icon: "success",
            title: "ZIP Downloaded",
            text: `${response.data.length} QR invitation ZIP downloaded successfully`,
            timer: 2000,
            showConfirmButton: false,
            background: "#111827",
            color: "#fff",
          });

          localWs.send(JSON.stringify({ action: "GET_DASHBOARD_SUMMARY" }));
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: "error",
            title: "ZIP Generation Failed",
            text: err.message,
            background: "#111827",
            color: "#fff",
          });
        }
        setLoading(false);
        return;
      }

      // ==========================
      // RESPONSE SPESIFIC USER
      // ==========================
      if (response.type === "user-detail") {
        // Validasi jika user tidak ditemukan di database
        if (!response.data || !response.data.uniqueId) {
          Swal.fire({
            icon: "error",
            title: "User Tidak Ditemukan",
            text: "Unique ID tidak terdaftar di database server.",
            background: "#111827",
            color: "#fff",
          });
          return;
        }

        Swal.update({
          title: "Generating PDF...",
          html: "Mempersiapkan undangan...",
        });

        try {
          // 1. Generate PDF untuk Main User
          await createPdf([response.data], response.data.category || "VIP");

          // 2. Jika user membawa Guest (Plus One), otomatis download juga PDF buat guest-nya
          if (response.data.guest && response.data.guest.uniqueId) {
            // Kasih delay dikit biar proses html2canvas tidak bentrok
            await new Promise((r) => setTimeout(r, 500));
            await createPdf(
              [response.data.guest],
              response.data.guest.category || "VIP",
            );
          }

          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "PDF Undangan Berhasil didownload",
            background: "#111827",
            color: "#fff",
            timer: 2000,
            showConfirmButton: false,
          });
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: "error",
            title: "Gagal",
            text: err.message,
            background: "#111827",
            color: "#fff",
          });
        }
        return;
      }

      // ==========================
      // GENERATE FAILED
      // ==========================
      if (response.type === "dummy-users-generated-error") {
        setLoading(false);
        Swal.fire({
          icon: "error",
          title: "Generate Failed",
          text: response.message || "Failed generate QR",
          background: "#111827",
          color: "#fff",
        });
        return;
      }

      // ==========================
      // DOWNLOAD CATEGORY ALL
      // ==========================
      if (response.type === "DOWNLOAD_DUMMY_CATEGORY_RESPONSE") {
        if (!response.success) {
          Swal.fire({
            icon: "error",
            title: "Download Failed",
            text: response.message,
            background: "#111827",
            color: "#fff",
          });
          return;
        }

        Swal.fire({
          title: "Preparing ZIP...",
          html: `Found ${response.data.length} QR Codes`,
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          background: "#111827",
          color: "#fff",
          didOpen: () => {
            Swal.showLoading();
          },
        });

        try {
          await createCompactPdf(response.data, response.category);
          Swal.fire({
            icon: "success",
            title: "Download Complete",
            text: `${response.category}_QR.zip downloaded`,
            background: "#111827",
            color: "#fff",
          });
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: "error",
            title: "ZIP Generation Failed",
            text: err.message,
            background: "#111827",
            color: "#fff",
          });
        }
        return;
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
      <div style="width:900px; box-sizing:border-box; background:#000; color:white; padding:40px; font-family:Arial,sans-serif;">
        <div style="text-align:center"><h1 style="font-size:56px; font-weight:900; margin-bottom:30px; letter-spacing:2px;">XPENG V1SION NIGHT 2026</h1></div>
        <img src="${heroRegular}" style="width:100%; border-radius:20px; display:block;" />
        <div style="text-align:center; margin-top:40px;">
          <p style="color:#d4d4d4; font-size:22px; line-height:1.6; max-width:700px; margin:auto;">This is your official QR invitation for XPENG V1SION NIGHT 2026.</p>
        </div>
        <div style="margin-top:50px; border:2px solid #D8FF24; border-radius:30px; overflow:hidden; background:#050505;">
          <div style="background:#D8FF24; color:#000; text-align:center; font-weight:700; padding:20px; font-size:28px;">${categoryName}</div>
          <div style="padding:50px;">
            <div style="display:flex; justify-content:center;">
              <div style="width:350px; height:350px; background:white; border-radius:24px; display:flex; justify-content:center; align-items:center; padding:15px;"><img src="${qrImage}" style="width:320px; height:320px; display:block;" /></div>
            </div>
            <div style="margin-top:40px; text-align:center; color:white;">
              <div style="margin-bottom:25px;"><div style="color:#9ca3af; font-size:18px; margin-bottom:5px;">Name</div><div style="font-size:32px; font-weight:700; word-break:break-word;">${user.name}</div></div>
              <div><div style="color:#9ca3af; font-size:18px; margin-bottom:5px;">Registration ID</div><div style="font-size:24px; font-weight:600;">${user.uniqueId}</div></div>
            </div>
          </div>
        </div>
        <div style="margin-top:40px; border:1px solid #262626; border-radius:24px; padding:35px; background:#050505;">
          <h3 style="color:white; font-size:32px; margin:0 0 25px 0; font-weight:700;">EVENT REMINDER</h3>
          <div style="color:#d4d4d4; font-size:24px; line-height:2;"><div>📅 28 June 2026</div><div>📍 Istora Senayan, Jakarta</div><div>🕑 ${eventTime}</div></div>
        </div>
      </div>`;

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

  // Fungsi Compact Template Milikmu (Tetap Utuh)
  const createCompactPdf = async (users, category) => {
    const zip = new JSZip();
    const container = document.getElementById("pdf-render-container");
    const eventTime = ["VIP", "VVIP", "SUPER VVIP"].includes(category)
      ? "16.30 - 21.00 WIB"
      : "14.00 - 21.00 WIB";

    for (const user of users) {
      const qrImage = await QRCode.toDataURL(user.uniqueId, {
        width: 1000,
        margin: 1,
      });
      container.innerHTML = `
      <div style="width:600px; background:#000; color:white; padding:32px; font-family:Arial,sans-serif; box-sizing:border-box;">
        <div style="border:1px solid #D8FF24; border-radius:24px; overflow:hidden; background:#050505;">
          <div style="background:#D8FF24; color:#000; text-align:center; font-weight:700; padding:14px; font-size:24px;">PRIMARY GUEST</div>
          <div style="padding:30px; text-align:center;">
            <div style="width:220px; height:220px; background:white; border-radius:20px; margin:auto; display:flex; justify-content:center; align-items:center; padding:12px;">
              <img src="${qrImage}" style="width:190px; height:190px;" />
            </div>
            <div style="margin-top:20px; font-size:40px; font-weight:700;">${user.name}</div>
            <div style="color:#9ca3af; margin-top:6px;">${category}</div>
            <div style="text-align:left; margin-top:30px;">
              <div style="color:#9ca3af; font-size:16px;">Category</div>
              <div style="color:#D8FF24; font-size:22px; font-weight:700; margin-top:4px;">${category}</div>
            </div>
            <div style="text-align:left; margin-top:25px;">
              <div style="color:#9ca3af; font-size:16px;">Registration ID</div>
              <div style="font-size:18px; margin-top:4px; word-break:break-all;">${user.uniqueId}</div>
            </div>
          </div>
        </div>
        <div style="margin-top:24px; border:1px solid #262626; border-radius:20px; padding:24px; background:#050505;">
          <div style="color:white; font-size:26px; font-weight:700; margin-bottom:20px;">EVENT REMINDER</div>
          <div style="color:#d4d4d4; font-size:18px; line-height:2;">
            <div>📅 28 June 2026</div><div>📍 Istora Senayan, Jakarta</div><div>🕑 ${eventTime}</div>
          </div>
        </div>
      </div>`;

      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(container.firstElementChild, {
        scale: 2,
        backgroundColor: "#000000",
        useCORS: true,
      });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        canvas.width,
        canvas.height,
      );

      zip.file(`${user.name}.pdf`, pdf.output("blob"));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${category}_QR.zip`);
  };

  const generateInstantQR = async () => {
    if (!specificName() || !specificId()) {
      Swal.fire({
        icon: "error",
        title: "Input Kurang",
        text: "Nama dan Unique ID wajib diisi!",
        background: "#111827",
        color: "#fff",
      });
      return;
    }
    Swal.fire({
      title: "Preparing PDF...",
      text: "Rendering QR Code khusus...",
      allowOutsideClick: false,
      showConfirmButton: false,
      background: "#111827",
      color: "#fff",
      didOpen: () => {
        Swal.showLoading();
      },
    });
    try {
      await createPdf(
        [{ name: specificName(), uniqueId: specificId() }],
        specificCat(),
      );
      Swal.fire({
        icon: "success",
        title: "Downloaded",
        text: "PDF berhasil dibuat!",
        background: "#111827",
        color: "#fff",
        timer: 1500,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message,
        background: "#111827",
        color: "#fff",
      });
    }
  };

  const fetchAndDownloadFromWS = () => {
    if (!specificId()) {
      Swal.fire({
        icon: "error",
        title: "Unique ID Kosong",
        background: "#111827",
        color: "#fff",
      });
      return;
    }

    Swal.fire({
      title: "Mencari data...",
      background: "#111827",
      color: "#fff",
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Kirim sesuai format case di backend lu
    localWs.send(
      JSON.stringify({
        action: "GET_USER_BY_UNIQUEID",
        payload: { uniqueId: specificId() },
      }),
    );
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
      text: "Please wait...",
      allowOutsideClick: false,
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
        payload: { category, count: counts()[category] },
      }),
    );
  };

  const downloadCategory = (category) => {
    localWs.send(
      JSON.stringify({
        action: "DOWNLOAD_DUMMY_CATEGORY",
        payload: { category },
      }),
    );
  };
  const generateTenDistinctPerCategory = () => {
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
    title: "Starting Special Sequence",
    text: "Generating exactly 10 distinct QRs for each category sequentially...",
    allowOutsideClick: false,
    showConfirmButton: false,
    background: "#111827",
    color: "#fff",
    didOpen: () => {
      Swal.showLoading();
    },
  });

  setIsSpecialMode(true);
  setLoading(true);
  
  // Mulai sekuensial dari index 0 (COMMUNITY)
  const firstCategory = categories[0];
  setSpecialIndex(0);
  setSelectedCategory(firstCategory);

  console.log(`[Special Mode] Memulai urutan pertama: ${firstCategory} (Index: 0)`);
  
  localWs.send(
    JSON.stringify({
      action: "GENERATE_DUMMY_QR",
      payload: { category: firstCategory, count: 10 },
    })
  );
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
    setCounts((prev) => ({ ...prev, [category]: Number(value) }));
  };

  return (
    <div class="min-h-screen bg-black text-white p-8">
      <div class="max-w-7xl mx-auto space-y-8">
        {/* PANEL: SPECIFIC USER GENERATOR */}
        <div class="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03] p-8">
          <h2 class="text-2xl font-bold mb-2">GENERATE SPECIFIC USER</h2>
          <p class="text-zinc-400 text-sm mb-6">
            Input data spesifik atau cari berdasarkan Unique ID.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label class="block text-xs font-semibold mb-2 text-zinc-400">
                UNIQUE ID
              </label>
              <input
                type="text"
                placeholder="Ex: XPENG-12345"
                value={specificId()}
                onInput={(e) => setSpecificId(e.currentTarget.value)}
                class="w-full bg-black border border-white/10 rounded-lg p-2.5 text-white placeholder-zinc-600 focus:border-[#D8FF24] outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-2 text-zinc-400">
                NAMA GUEST
              </label>
              <input
                type="text"
                placeholder="Ex: John Doe"
                value={specificName()}
                onInput={(e) => setSpecificName(e.currentTarget.value)}
                class="w-full bg-black border border-white/10 rounded-lg p-2.5 text-white placeholder-zinc-600 focus:border-[#D8FF24] outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-2 text-zinc-400">
                CATEGORY
              </label>
              <select
                value={specificCat()}
                onChange={(e) => setSpecificCat(e.currentTarget.value)}
                class="w-full bg-black border border-white/10 rounded-lg p-2.5 text-white focus:border-[#D8FF24] outline-none"
              >
                <For each={categories}>
                  {(cat) => <option value={cat}>{cat}</option>}
                </For>
              </select>
            </div>
            <div class="flex gap-2">
              <button
                onClick={generateInstantQR}
                class="flex-1 bg-[#D8FF24] text-black h-[42px] rounded-lg font-bold hover:opacity-90 text-sm"
              >
                INSTANT PDF
              </button>
              <button
                onClick={fetchAndDownloadFromWS}
                class="flex-1 bg-zinc-800 text-white h-[42px] rounded-lg font-bold border border-white/10 hover:bg-zinc-700 text-sm"
              >
                FETCH SERVER
              </button>
            </div>
          </div>
        </div>

        {/* PANEL: DASHBOARD / BATCH GENERATOR */}
        <div class="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03]">
          <div class="px-8 py-8 border-b border-white/10">
            <h1 class="text-4xl font-bold">DUMMY QR GENERATOR</h1>
            <p class="mt-3 text-zinc-400">
              Generate operational QR codes and export PDF by category.
            </p>
            <div>
              <button
                onClick={generateTenDistinctPerCategory}
                disabled={loading()}
                class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 text-base shadow-lg"
              >
                {loading() && isSpecialMode()
                  ? "GENERATING 10 QRs PER CATEGORY..."
                  : "🔥 GENERATE 10 DISTINCT QRs PER CATEGORY"}
              </button>
            </div>
          </div>
          <div class="mt-8 border border-white/10 rounded-2xl overflow-hidden">
            <table class="w-full">
              <thead class="bg-white/[0.03]">
                <tr>
                  <th class="p-4 text-left">Category</th>
                  <th class="p-4 text-left">Total User</th>
                  <th class="p-4 text-left">Generated</th>
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
                          class="w-32 bg-black border border-white/10 rounded-lg p-2"
                        />
                      </td>
                      <td class="p-4">{dummySummary()[cat]?.generated || 0}</td>
                      <td class="p-4 gap-2 flex">
                        <button
                          onClick={() => generateDummyQR(cat)}
                          class="bg-[#D8FF24] text-black px-4 py-2 rounded-lg font-bold"
                        >
                          GENERATE
                        </button>
                        <button
                          class="bg-[#D8FF24] text-black px-4 py-2 rounded-lg font-bold"
                          onClick={() => downloadCategory(cat)}
                        >
                          DOWNLOAD
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
