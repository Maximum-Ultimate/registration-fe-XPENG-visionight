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
import {
  ArrowUpDown,
  History,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
} from "lucide-solid";
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
  const [lastSentName, setLastSentName] = createSignal("");
  const [searchColumn, setSearchColumn] = createSignal("all"); // Pilihan kolom
  const [searchOperator, setSearchOperator] = createSignal("contains"); // Pilihan operator
  const [searchValue, setSearchValue] = createSignal(""); // Teks yang diketik
  const [scanHistory, setScanHistory] = createSignal(
    JSON.parse(localStorage.getItem("scanHistory") || "[]"),
  );
  const [copiedId, setCopiedId] = createSignal("");
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
      if (
        message.status === 200 &&
        message.message === "Invitations sent successfully"
      ) {
        Swal.fire({
          icon: "success",
          title: "Invitations Sent",
          html: `<div class="text-zinc-300"> Invitations sent successfully to <span class="font-semibold text-white">${lastSentName()}</span></div>`,
          background: "#09090b",
          color: "#ffffff",
          confirmButtonText: "OK",
          confirmButtonColor: "#a3e635",
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup:
              "border border-lime-400 rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.35)]",
            title: "text-lime-400",
            confirmButton: "!text-black font-bold rounded-xl px-8 py-3",
          },
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

            const limitedHistory = newHistory.slice(0, 100);
            localStorage.setItem("scanHistory", JSON.stringify(limitedHistory));
            return limitedHistory;
          });
          Swal.fire({
            icon: "success",
            title: "Attendance Confirmed",
            html: `
              <div class="text-zinc-300">
                <div class="font-semibold">
                  ${message.name} (${message.category})
                </div>
                <div class="text-zinc-400 text-sm">
                  ${message.company}
                </div>
                ${
                  message.plusOneOf
                    ? `
                    <div class="mt-3 p-2 rounded-lg border border-yellow-400 bg-yellow-500/10 text-yellow-300">
                      +1 Of: ${message.plusOneOf}
                    </div>
                  `
                    : ""
                }
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
          });
      }
    };
  });

  onCleanup(() => {
    ws?.close();
  });

  const parentEmailsSet = createMemo(() => {
    const set = new Set();
    users().forEach((u) => {
      if (u.parent_email && u.parent_email.trim() !== "") {
        set.add(u.parent_email.trim().toLowerCase());
      }
    });
    return set;
  });
  const filteredUsers = createMemo(() => {
    let records = users();
    if (categoryFilter() !== "ALL") {
      records = records.filter((u) => u.category === categoryFilter());
    }
    if (attendanceFilter() !== "ALL") {
      records = records.filter(
        (u) => u.status_attendance === attendanceFilter(),
      );
    }
    const col = searchColumn();
    const op = searchOperator();
    const val = searchValue().trim().toLowerCase();

    if (!["is_empty", "is_not_empty"].includes(op) && !val) {
      return records;
    }

    return records.filter((user) => {
      let targetValue = "";
      if (col === "all") {
        targetValue =
          `${user.name} ${user.email} ${user.company} ${user.vertical}`.toLowerCase();
      } else {
        targetValue = String(user[col] || "").toLowerCase();
      }

      switch (op) {
        case "contains":
          return targetValue.includes(val);
        case "equals":
          return targetValue === val;
        case "starts_with":
          return targetValue.startsWith(val);
        case "ends_with":
          return targetValue.endsWith(val);
        case "is_empty":
          return targetValue === "";
        case "is_not_empty":
          return targetValue !== "";
        default:
          return true;
      }
    });
  });
  const handleSort = (field) => {
    if (sortBy() === field) {
      setSortDirection(sortDirection() === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };
  const downloadCSVFirst = () => {
    const dataToExport = filteredUsers();
    const emailsWithPlusOne = parentEmailsSet();

    const headers = [
      "Name",
      "Category",
      "Company",
      "Email",
      "Plus One Status",
      "Confirmation Status",
      "Attendance Status",
      "Vertical",
    ];

    const rows = dataToExport.map((user) => {
      const isPlusOne = user.parent_name && user.parent_name.trim() !== "";
      const bringsPlusOne =
        user.email && emailsWithPlusOne.has(user.email.trim().toLowerCase());
      const plusOneStatus = isPlusOne
        ? `+1 of ${user.parent_name}`
        : bringsPlusOne
          ? "Brings +1"
          : "-";

      return [
        `"${(user.name || "").replace(/"/g, '""')}"`,
        `"${(user.category || "").replace(/"/g, '""')}"`,
        `"${(user.company || "").replace(/"/g, '""')}"`,
        `"${(user.email || "").replace(/"/g, '""')}"`,
        `"${plusOneStatus.replace(/"/g, '""')}"`,
        `"${(user.status_confirmation || "").replace(/"/g, '""')}"`,
        `"${(user.status_attendance || "").replace(/"/g, '""')}"`,
        `"${(user.vertical || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `XPENG_Attendance_Details_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const downloadCSV = () => {
    const currentData = filteredUsers();
    const totalData = currentData.length;

    // Ambil state filter yang baru
    const currentColumn =
      searchColumn() === "all" ? "All Columns" : searchColumn();
    const currentOperator = searchOperator();
    const currentSearchVal =
      searchValue().trim() ||
      (["is_empty", "is_not_empty"].includes(currentOperator) ? "-" : "None");

    const currentCategory = categoryFilter() || "ALL";
    const currentAttendance = attendanceFilter() || "ALL";

    const tableHeaders = [
      "Name",
      "Category",
      "Company",
      "Email",
      "Plus One Status",
      "Confirmation",
      "Attendance",
      "Vertical",
      "QR Link",
    ];

    const rows = currentData.map((user) => {
      const isPlusOne = user.parent_name && user.parent_name.trim() !== "";
      const bringsPlusOne =
        user.email && parentEmailsSet().has(user.email.trim().toLowerCase());
      let plusOneStatus = "-";
      if (isPlusOne) plusOneStatus = `+1 of ${user.parent_name}`;
      else if (bringsPlusOne) plusOneStatus = "Brings +1";

      const baseurl = "https://rsvp.xpengvisionnight.co.id/rsvp";

      return [
        user.name || "-",
        user.category || "-",
        user.company || "-",
        user.email || "-",
        plusOneStatus,
        user.status_confirmation || "-",
        user.status_attendance || "-",
        user.vertical || "-",
        `${baseurl}/${user.uniqueId}`,
      ];
    });

    // Susun baris metadata sesuai dengan sistem filter pilihan yang baru
    const csvMatrix = [
      ["FILTERED BY:"],
      ["Search Column", currentColumn], // Info kolom yang dipilih
      ["Search Operator", currentOperator], // Info operator (contains, equals, dll)
      ["Search Value", currentSearchVal], // Kata kunci yang diketik
      ["Category Filter", currentCategory],
      ["Attendance Filter", currentAttendance],
      ["Total Data", totalData],
      [], // Baris kosong biar rapi
      tableHeaders,
      ...rows,
    ];

    const csvContent = csvMatrix
      .map((row) =>
        row
          .map((value) => {
            const stringValue = String(value ?? "");
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0"); // Ditambah 1 karena bulan mulai dari 0
    const day = String(today.getDate()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`; // Hasilnya: 2026-06-27

    // 2. Proses download file dengan penamaan tanggal
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    // Menggunakan template literal untuk memasukkan tanggal ke nama file
    link.setAttribute("download", `guest_list_${formattedDate}.csv`);

    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleSendEmail = (uniqueId, name) => {
    const bodyPayload = {
      action: "DIRECT_INVITE_USERS",
      payload: {
        userIdas: [uniqueId],
      },
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      // Simpan nama untuk dipakai di ws.onmessage nanti
      setLastSentName(name);

      // Tampilkan Loading "Sending to..."
      Swal.fire({
        title: "Sending Invitation",
        html: `
        <div class="text-zinc-300">
          Sending email to <span class="font-semibold text-white">${name}</span>...
        </div>
      `,
        background: "#09090b",
        color: "#ffffff",
        allowOutsideClick: false, // Biar ga sengaja ketutup pas nge-klik luar
        allowEscapeKey: false, // Biar ga bisa ditutup pakai tombol Esc
        didOpen: () => {
          Swal.showLoading(); // Memunculkan spinner loading bawaan Swal
        },
        customClass: {
          popup: "border border-zinc-800 rounded-2xl shadow-2xl",
        },
      });

      // Kirim data lewat WebSocket
      ws.send(JSON.stringify(bodyPayload));
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Koneksi WebSocket terputus!",
        background: "#09090b",
        color: "#ffffff",
        confirmButtonColor: "#a3e635",
      });
    }
  };
  const handleAttend = (uniqueId, name) => {
    const bodyPayload = {
      action: "ATTEND",
      payload: {
        attendUniqueId: uniqueId,
      },
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      // Opsional: Simpan nama ke state jika kamu butuh validasi di ws.onmessage nanti
      // setLastAttendedName(name);

      // Tampilkan Loading "Checking in..." dengan style zinc/dark
      Swal.fire({
        title: "Processing Attendance",
        html: `
      <div class="text-zinc-300">
        Checking in <span class="font-semibold text-white">${name}</span>...
      </div>
    `,
        background: "#09090b",
        color: "#ffffff",
        allowOutsideClick: false, // Biar ga sengaja ketutup pas nge-klik luar
        allowEscapeKey: false, // Biar ga bisa ditutup pakai tombol Esc
        didOpen: () => {
          Swal.showLoading(); // Memunculkan spinner loading bawaan Swal
        },
        customClass: {
          popup: "border border-zinc-800 rounded-2xl shadow-2xl",
        },
      });

      // Kirim data lewat WebSocket
      ws.send(JSON.stringify(bodyPayload));
    } else {
      // Alert jika koneksi WS mati
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Koneksi WebSocket terputus!",
        background: "#09090b",
        color: "#ffffff",
        confirmButtonColor: "#a3e635", // Warna lime-400 sesuai tema
      });
    }
  };
  const startScanner = async () => {
    if (scannerStarted()) return;
    try {
      scanner = new Html5Qrcode("reader");
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await stopScanner();
          ws.send(
            JSON.stringify({
              action: "ATTEND",
              payload: { attendUniqueId: decodedText },
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
    VVIP: { bg: "bg-yellow-400", border: "border-yellow-400", label: "GOLD" },
    VIP: { bg: "bg-gray-300", border: "border-gray-300", label: "SILVER" },
    DEALER: { bg: "bg-cyan-400", border: "border-cyan-400", label: "CYAN" },
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
    FRONT: { bg: "bg-violet-300", border: "border-violet-300", label: "LILAC" },
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
  const nonEligibleVipCompanies = [
    "XPENG AFTERSALES EIVO",
    "EAL",
    "EAL_ChannelDevelopment",
    "EAL_JDSports",
    "Erajaya",
    "Erajaya / IT Solution & Product Management",
    "Erajaya Active Lifestyle",
    "Erajaya Digital",
    "Erajaya Digital/ Category Management",
    "Erajaya Food & Nourishment",
    "Erajaya Swasembada",
    "Erajaya Swasembada, Tbk",
    "Erajaya_EAL",
    "Erajaya_SS",
    "Erajaya_SS Inbound Management",
    "Erayjaya_EAL",
    "JD SPORTS/ Erajaya active lifestyle",
    "PT ERA GAYA AKTIF",
    "PT Era Inovasi Otomotif",
    "PT Erajaya Swasembada Tbk",
    "PT SINAR ERA AKTIF",
    "PT. Erajaya Swasembada",
    "PT. Erajaya Swasembada tbk.",
    "SS",
    "SCM",
    "Urban adventure",
    "TAM",
    "Erajaya Group_Shared Service",
    "banking EAL",
    "PT SES - EAL Div Imaging",
    "Automotive",
    "Urban Republic - Erajaya",
  ].map((c) => c.toLowerCase().trim());
  const style = createMemo(
    () => categoryColor[participant()?.category] || categoryColor.VIP,
  );
  const isMerchandiseEligible = () => {
    const category = participant()?.category;
    if (category === "MEDIA") {
      return true;
    }
    const verticalEligible = merchandiseEligibleVerticals.includes(
      participant()?.vertical || "",
    );
    const company = (participant()?.company || "").toLowerCase();
    const vipBlocked =
      category === "VIP" &&
      nonEligibleVipCompanies.some((c) => company.includes(c.toLowerCase()));

    return verticalEligible && !vipBlocked;
  };
  const displaySummary = createMemo(() => {
    const result = {};
    Object.entries(summary().realUsers || {}).forEach(([category, data]) => {
      result[category] = {
        total: data.total,
        confirmed: data.confirmed,
        attended: data.attended,
      };
    });
    return result;
  });
  const categoryQuota = {
    VIP: 620,
    DEALER: 470,
    COMMUNITY: 730,
    LEASING: 210,
    MEDIA: 120,
    FRONT: 412,
    // SVVIP: 8,
    // VVIP: 60,
    // "SALES LIVE STREAM": 48,
  };
  const tableCategories = createMemo(() => {
    const categories = new Set([
      ...Object.keys(displaySummary()),
      ...Object.keys(categoryQuota),
    ]);
    return [...categories];
  });
  const clearHistory = () => {
    const confirmClear = confirm(
      "Apakah kamu yakin ingin menghapus semua riwayat scan?",
    );
    if (confirmClear) {
      setScanHistory([]);
    }
  };
  const verticalSummaryMemo = createMemo(() => {
    const result = {};
    users().forEach((user) => {
      const vertical = user.vertical?.trim();

      // VALIDASI: Jika tidak ada data vertical, atau vertical-nya kosong/"UNKNOWN", langsung skip.
      // Ini otomatis mendepak Generated QR (Dummy Users) dari hitungan Vertical Summary.
      if (!vertical || vertical === "" || vertical === "UNKNOWN") return;

      if (!result[vertical]) {
        result[vertical] = { total: 0, confirmed: 0, attended: 0 };
      }

      // Hanya user riil ber-vertical yang masuk ke sini
      result[vertical].total++;

      if (user.status_confirmation?.trim() === "confirmed") {
        result[vertical].confirmed++;
      }
      if (user.status_attendance?.trim() === "attended") {
        result[vertical].attended++;
      }
    });
    return result;
  });

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
            class={`px-5 py-3 rounded-xl ${activeTab() === "summary" ? "bg-lime-400 text-black" : "bg-zinc-900"}`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab("details")}
            class={`px-5 py-3 rounded-xl ${activeTab() === "details" ? "bg-lime-400 text-black" : "bg-zinc-900"}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("scanner")}
            class={`px-5 py-3 rounded-xl ${activeTab() === "scanner" ? "bg-lime-400 text-black" : "bg-zinc-900"}`}
          >
            Scanner
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            class={`px-5 py-3 rounded-xl ${activeTab() === "manual" ? "bg-lime-400 text-black" : "bg-zinc-900"}`}
          >
            Manual
          </button>
        </div>

        <Show when={activeTab() === "scanner"}>
          <button
            onClick={() => setShowHistory(!showHistory())}
            class="w-12 h-12 md:w-auto md:h-auto md:px-5 py-3 bg-zinc-900 border border-zinc-800 rounded-full md:rounded-xl flex items-center justify-center gap-3"
          >
            <History size={18} />
            <span class="hidden md:inline">Scan History</span>
          </button>
        </Show>
      </div>
      {/* SUMMARY TAB */}
      <Show when={activeTab() === "summary"}>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div class="text-zinc-400 text-sm">Real Users</div>
            <div class="text-4xl font-bold mt-2">
              {summary().totals?.realUsers || 0}
            </div>
          </div>
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div class="text-zinc-400 text-sm">Generated QRs</div>
            <div class="text-4xl font-bold mt-2 opacity-80">
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

        {/* COMBINED USERS */}
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div class="bg-lime-400 text-black px-5 py-3 text-center font-bold">
            Quota: {Object.values(categoryQuota).reduce((a, b) => a + b, 0)} |
            Remaining:{" "}
            {Object.values(categoryQuota).reduce((a, b) => a + b, 0) -
              (summary().totals?.confirmed || 0)}
          </div>
          <table class="w-full">
            <thead>
              <tr class="bg-zinc-800">
                <th class="p-4 text-left">Category</th>
                <th class="p-4 text-left">Quota</th>
                <th class="p-4 text-left">Registered</th>
                <th class="p-4 text-left">Confirmed</th>
                <th class="p-4 text-left">Remaining Quota</th>
                <th class="p-4 text-left">Attended</th>
              </tr>
            </thead>
            <tbody>
              <For each={tableCategories()}>
                {(category) => {
                  const data = () =>
                    displaySummary()[category] || {
                      total: 0,
                      confirmed: 0,
                      attended: 0,
                    };
                  const quota = categoryQuota[category];
                  const isNonRegistrationCategory = [
                    "VVIP",
                    "SVVIP",
                    "SALES LIVE STREAM",
                  ].includes(category);

                  // UBAH DI SINI: Dibungkus fungsi getter () => {} agar reaktif
                  const remainingQuota = () =>
                    isNonRegistrationCategory
                      ? "-"
                      : quota !== undefined
                        ? quota - data().confirmed
                        : "-";

                  return (
                    <tr class="border-t border-zinc-800">
                      <td class="p-4">{category}</td>
                      <td class="p-4">{quota ?? "-"}</td>
                      <td
                        class={`p-4 ${isNonRegistrationCategory ? "bg-zinc-800 text-zinc-500" : ""}`}
                      >
                        {data().total}
                      </td>
                      <td
                        class={`p-4 text-blue-400 ${isNonRegistrationCategory ? "bg-zinc-800 text-zinc-500" : ""}`}
                      >
                        {isNonRegistrationCategory ? "-" : data().confirmed}
                      </td>
                      <td
                        class={`p-4 ${isNonRegistrationCategory ? "bg-zinc-800 text-zinc-500" : "text-yellow-400"}`}
                      >
                        {/* JANGAN LUPA: Panggil sebagai fungsi dengan tanda kurung () */}
                        {remainingQuota()}
                      </td>
                      <td
                        class={`p-4 ${isNonRegistrationCategory ? "bg-zinc-800 text-zinc-500" : "text-lime-400"}`}
                      >
                        {isNonRegistrationCategory ? "-" : data().attended}
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>

        {/* BLAST & LINK SUMMARY */}
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div class="px-5 py-4 border-b border-zinc-800 text-center">
            Separated By Blast QR & Link Invitation
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2">
            <div>
              <div class="bg-zinc-800 px-5 py-3 text-center font-bold">
                Users By Blast QR (
                {Object.values(summary().blastUsers || {}).reduce(
                  (sum, item) => sum + item.total,
                  0,
                )}
                )
              </div>
              <table class="w-full">
                <thead>
                  <tr class="bg-zinc-800">
                    <th class="p-4 text-left">Category</th>
                    <th class="p-4 text-left">Registered</th>
                    <th class="p-4 text-left">Confirmed</th>
                    <th class="p-4 text-left">Attended</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={Object.entries(summary().blastUsers || {})}>
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
            <div>
              <div class="bg-zinc-800 px-5 py-3 text-center font-bold">
                Users By Link (
                {Object.values(summary().linkUsers || {}).reduce(
                  (sum, item) => sum + item.total,
                  0,
                )}
                )
              </div>
              <table class="w-full">
                <thead>
                  <tr class="bg-zinc-800">
                    <th class="p-4 text-left">Category</th>
                    <th class="p-4 text-left">Registered</th>
                    <th class="p-4 text-left">Confirmed</th>
                    <th class="p-4 text-left">Attended</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={Object.entries(summary().linkUsers || {})}>
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
          </div>
        </div>

        {/* DEALER SUMMARY */}
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div class="px-5 py-4 border-b border-zinc-800">
            <h2 class="text-xl font-semibold">Dealer Summary</h2>
          </div>
          <table class="w-full">
            <thead>
              <tr class="bg-zinc-800">
                <th class="p-4 text-left">Dealer</th>
                <th class="p-4 text-left">Registered</th>
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

        {/* VERTICAL SUMMARY */}
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div class="px-5 py-4 border-b border-zinc-800">
            <h2 class="text-xl font-semibold">Vertical Summary</h2>
          </div>
          <table class="w-full">
            <thead>
              <tr class="bg-zinc-800">
                <th class="p-4 text-left">Vertical</th>
                <th class="p-4 text-left">Registered</th>{" "}
                {/* <--- Kolom Baru */}
                <th class="p-4 text-left">Confirmed</th>
                <th class="p-4 text-left">Attended</th>
              </tr>
            </thead>
            <tbody>
              <For each={Object.entries(verticalSummaryMemo())}>
                {([vertical, data]) => (
                  <tr class="border-t border-zinc-800">
                    <td class="p-4">{vertical}</td>
                    <td class="p-4 text-zinc-300">{data.total}</td>{" "}
                    {/* <--- Tampilkan properti data.total */}
                    <td class="p-4 text-blue-400">{data.confirmed}</td>
                    <td class="p-4 text-lime-400">{data.attended}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
      {/* DETAILS TAB */}
      <Show when={activeTab() === "details"}>
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div class="p-4 flex flex-wrap gap-4 items-center justify-between">
            <div class="flex flex-wrap gap-3 items-center">
              <div class="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 focus-within:border-zinc-700 transition-colors gap-1">
                <select
                  value={searchColumn()}
                  onChange={(e) => setSearchColumn(e.currentTarget.value)}
                  class="bg-zinc-900 border-none text-zinc-300 text-sm rounded-lg pl-3 pr-2 py-1.5 focus:outline-none focus:bg-zinc-800 cursor-pointer font-medium"
                >
                  <option value="all">All Columns</option>
                  <option value="name">Nama</option>
                  <option value="email">Email</option>
                  <option value="company">Company</option>
                  <option value="vertical">Vertical</option>
                </select>

                <span class="text-zinc-800 text-xs">/</span>

                <select
                  value={searchOperator()}
                  onChange={(e) => setSearchOperator(e.currentTarget.value)}
                  class="bg-zinc-900 border-none text-zinc-400 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:bg-zinc-800 cursor-pointer font-normal italic"
                >
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                  <option value="starts_with">starts with</option>
                  <option value="ends_with">ends with</option>
                  <option value="is_empty">is empty</option>
                  <option value="is_not_empty">is not empty</option>
                </select>

                <Show
                  when={
                    searchOperator() !== "is_empty" &&
                    searchOperator() !== "is_not_empty"
                  }
                >
                  <span class="text-zinc-800 text-xs pr-1">/</span>
                  <input
                    value={searchValue()}
                    onInput={(e) => setSearchValue(e.currentTarget.value)}
                    placeholder="Filter value..."
                    class="bg-transparent border-none text-sm text-white placeholder-zinc-600 focus:outline-none w-3/4 px-2 py-1.5"
                  />
                </Show>
              </div>

              <div class="hidden md:block h-6 w-px bg-zinc-800 mx-1"></div>

              <div class="flex items-center gap-2">
                <select
                  value={categoryFilter()}
                  onChange={(e) => setCategoryFilter(e.currentTarget.value)}
                  class="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-600 cursor-pointer transition-colors"
                >
                  <option value="ALL">All Categories</option>{" "}
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
                  class="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-600 cursor-pointer transition-colors"
                >
                  <option value="ALL">All Attendance</option>
                  <option value="attended">Attended</option>
                  <option value="pending">Not Attended</option>
                </select>
              </div>
            </div>
            <button
              onClick={downloadCSV}
              class="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-colors font-medium text-sm"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>

          <div class="overflow-auto max-h-[75vh]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-zinc-800 z-10">
                <tr>
                  <th class="p-3 text-left">
                    <button
                      class="flex items-center gap-2"
                      onClick={() => handleSort("name")}
                    >
                      Name <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class="flex items-center gap-2"
                      onClick={() => handleSort("category")}
                    >
                      Category <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class="flex items-center gap-2"
                      onClick={() => handleSort("company")}
                    >
                      Company <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class="flex items-center gap-2"
                      onClick={() => handleSort("email")}
                    >
                      Email <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class="flex items-center gap-2 text-zinc-400 font-medium"
                      onClick={() => handleSort("plus_one")}
                    >
                      Plus One Status <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class="flex items-center gap-2"
                      onClick={() => handleSort("status_confirmation")}
                    >
                      Confirmation <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class="flex items-center gap-2"
                      onClick={() => handleSort("status_attendance")}
                    >
                      Attendance <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th class="p-3 text-left">
                    <button
                      class="flex items-center gap-2"
                      onClick={() => handleSort("vertical")}
                    >
                      Vertical <ArrowUpDown size={14} />
                    </button>
                  </th>
                  {/* Diubah dari Email menjadi Email Sender */}
                  <th class="p-3 text-left text-zinc-400 font-medium">
                    Email Sender
                  </th>
                  <th class="p-3 text-left text-zinc-400 font-medium">
                    QR Link
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredUsers()}>
                  {(user) => {
                    const isPlusOne =
                      user.parent_name && user.parent_name.trim() !== "";
                    const bringsPlusOne =
                      user.email &&
                      parentEmailsSet().has(user.email.trim().toLowerCase());

                    const baseurl = "https://rsvp.xpengvisionnight.co.id/rsvp";

                    return (
                      <tr class="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                        <td class="p-3 font-medium text-white">{user.name}</td>
                        <td class="p-3">{user.category}</td>
                        <td class="p-3">{user.company}</td>
                        <td class="p-3 text-zinc-400">{user.email}</td>
                        <td class="p-3">
                          <div class="flex flex-col gap-1.5 items-start relative z-20">
                            {isPlusOne && (
                              <button
                                type="button"
                                // Contoh untuk tombol "+1 of"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchColumn("name"); // Set kolom pencarian langsung ke Nama
                                  setSearchOperator("contains");
                                  setSearchValue(
                                    user.parent_name?.trim() || "",
                                  );
                                }}
                                class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-950/60 text-purple-400 border border-purple-800/50 hover:bg-purple-900/80 transition-colors text-left cursor-pointer"
                                title="Click to view inviter"
                              >
                                +1 of {user.parent_name}
                              </button>
                            )}

                            {bringsPlusOne && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const mainEmail = user.email?.trim() || "";
                                  setSearch(mainEmail);
                                }}
                                class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/50 hover:bg-cyan-900/80 transition-colors text-left cursor-pointer"
                                title="Click to filter this guest and their +1"
                              >
                                Brings +1
                              </button>
                            )}

                            {!isPlusOne && !bringsPlusOne && (
                              <span class="text-zinc-600 pl-2">-</span>
                            )}
                          </div>
                        </td>
                        <td class="p-3">
                          <span
                            class={
                              user.status_confirmation === "confirmed"
                                ? "text-blue-400"
                                : "text-zinc-500"
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
                                : "text-zinc-500"
                            }
                          >
                            {user.status_attendance}
                          </span>
                        </td>
                        <td class="p-3 text-zinc-400">{user.vertical}</td>

                        {/* Kolom Baru: Email Sender */}
                        <td class="p-3">
                          {!isPlusOne ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendEmail(user.uniqueId, user.email);
                              }}
                              class="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-sm"
                            >
                              Send
                            </button>
                          ) : (
                            <span
                              class="text-zinc-600 pl-3"
                              title="Plus One tidak menerima email terpisah"
                            >
                              -
                            </span>
                          )}
                        </td>

                        <td class="p-3">
                          <div class="flex items-center gap-3">
                            <a
                              href={`${baseurl}/${user.uniqueId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-sky-400 hover:text-sky-300 hover:underline text-xs font-medium shrink-0"
                            >
                              Open Link ↗
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `${baseurl}/${user.uniqueId}`;
                                navigator.clipboard.writeText(url);

                                setCopiedId(user.uniqueId);
                                setTimeout(() => setCopiedId(""), 2000);
                              }}
                              class="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                              title="Copy Link"
                            >
                              <Show
                                when={copiedId() === user.uniqueId}
                                fallback={<Copy size={14} />}
                              >
                                <Check size={14} class="text-lime-400" />
                              </Show>
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
      {/* MANUAL TAB */}
      <Show when={activeTab() === "manual"}>
        <div class="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
          {/* Sisi Kiri: Form Input / Panduan Manual Entry */}
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit">
            <h3 class="text-white font-semibold text-lg mb-2">
              Manual Attendance
            </h3>
            <p class="text-zinc-400 text-xs leading-relaxed mb-4">
              Cari nama tamu menggunakan fitur pencarian di sebelah kanan,
              kemudian klik tombol{" "}
              <span class="text-lime-400 font-medium">Check In</span> untuk
              mencatat kehadiran secara manual.
            </p>
          </div>

          {/* Sisi Kanan: Tabel Data User dengan Search & Sort */}
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* HEADER TABEL: Diisi dengan Judul dan Quick Search Bar */}
            <div class="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <h3 class="text-white font-medium text-sm">
                Daftar Tamu Ringkas
              </h3>

              {/* Quick Search Input */}
              <div class="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchValue()}
                  onInput={(e) => {
                    // Otomatis set filter ke 'all' dan 'contains' saat user mengetik di sini
                    setSearchColumn("all");
                    setSearchOperator("contains");
                    setSearchValue(e.currentTarget.value);
                  }}
                  placeholder="Cari nama, email, atau company..."
                  class="w-full bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-600 rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:border-zinc-700 transition-colors"
                />
                {/* Tombol Clear (X) jika input ada isinya */}
                <Show when={searchValue()}>
                  <button
                    onClick={() => setSearchValue("")}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                    title="Clear search"
                  >
                    ✕
                  </button>
                </Show>
              </div>
            </div>

            {/* CONTAINER TABEL */}
            <div class="overflow-auto max-h-[75vh]">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-zinc-800 z-10 text-zinc-300">
                  <tr>
                    {/* Header Nama + Sort */}
                    <th class="p-3 text-left">
                      <button
                        class="flex items-center gap-2 font-medium hover:text-white transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        Nama <ArrowUpDown size={14} />
                      </button>
                    </th>
                    {/* Header Email + Sort */}
                    <th class="p-3 text-left">
                      <button
                        class="flex items-center gap-2 font-medium hover:text-white transition-colors"
                        onClick={() => handleSort("email")}
                      >
                        Email <ArrowUpDown size={14} />
                      </button>
                    </th>
                    {/* Header Kategori + Sort */}
                    <th class="p-3 text-left">
                      <button
                        class="flex items-center gap-2 font-medium hover:text-white transition-colors"
                        onClick={() => handleSort("category")}
                      >
                        Kategori <ArrowUpDown size={14} />
                      </button>
                    </th>
                    <th class="p-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={filteredUsers()}>
                    {(user) => {
                      const isAttended = user.status_attendance === "attended";

                      return (
                        <tr class="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                          <td class="p-3 font-medium text-white">
                            {user.name}
                          </td>
                          <td class="p-3 text-zinc-400">{user.email || "-"}</td>
                          <td class="p-3">
                            <span class="px-2 py-0.5 text-xs font-medium rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800">
                              {user.category}
                            </span>
                          </td>
                          <td class="p-3 text-center">
                            <button
                              type="button"
                              disabled={isAttended}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAttend(user.uniqueId, user.name);
                              }}
                              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                              classList={{
                                "bg-lime-600 hover:bg-lime-500 text-white":
                                  !isAttended,
                                "bg-zinc-800 text-zinc-500 border border-zinc-700 opacity-60":
                                  isAttended,
                              }}
                            >
                              {isAttended ? "Attended" : "Check In"}
                            </button>
                          </td>
                        </tr>
                      );
                    }}
                  </For>

                  {/* Fallback kalau hasil pencarian kosong */}
                  <Show when={filteredUsers().length === 0}>
                    <tr>
                      <td
                        colspan="4"
                        class="p-8 text-center text-zinc-600 italic"
                      >
                        Data tidak ditemukan...
                      </td>
                    </tr>
                  </Show>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>
      {/* SCANNER TAB */}
      <Show when={activeTab() === "scanner"}>
        <div class="grid grid-cols-1 xl:grid-cols-[500px_1fr] gap-6">
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-[500px]">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold mb-6">Scan QR Code</h2>
              <button
                class="mb-4 text-zinc-400 hover:text-white"
                onClick={stopScanner}
              >
                Close
              </button>
            </div>
            <div class="w-full aspect-[4/3] max-w-[450px] mx-auto rounded-2xl overflow-hidden relative">
              <div id="reader" class="w-full h-full mx-auto" />
              <Show when={!scannerStarted()}>
                <div class="absolute inset-0 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 z-10">
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

          <Show when={participant()}>
            <div class="space-y-4 w-full">
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4 bg-zinc-900/50 p-4 border border-zinc-800 rounded-xl text-sm">
                <div>
                  <div class="text-zinc-500">Name</div>
                  <div class="font-medium">{participant().name}</div>
                </div>
                <div>
                  <div class="text-zinc-500">Email</div>
                  <div class="font-medium text-zinc-400">
                    {participant().email}
                  </div>
                </div>
                <div>
                  <div class="text-zinc-500">Company</div>
                  <div class="font-medium">{participant().company}</div>
                </div>
                <div>
                  <div class="text-zinc-500">Category</div>
                  <div class="font-medium text-lime-400">
                    {participant().category}
                  </div>
                </div>
                <div>
                  <div class="text-zinc-500">Vertical</div>
                  <div class="font-medium text-zinc-400">
                    {participant().vertical}
                  </div>
                </div>
                <Show when={participant().plusOneOf}>
                  <div>
                    <div class="text-zinc-500">Plus One Of</div>
                    <div class="text-yellow-400 font-semibold">
                      {participant().plusOneOf}
                    </div>
                  </div>
                </Show>
              </div>

              <div class={`border rounded-2xl p-5 ${style().border}`}>
                <div class="text-2xl text-lime-400 font-bold">
                  ✓ ATTENDANCE CONFIRMED
                </div>
                <div class="mt-2 text-zinc-300">Participant data is valid.</div>
                <Show when={isMerchandiseEligible()}>
                  <div class="mt-4 p-4 rounded-xl border border-orange-400 bg-orange-500/10 text-orange-300 font-bold text-center">
                    🎁 THIS USER IS ELIGIBLE FOR MERCHANDISE
                  </div>
                </Show>
                <button
                  class={`mt-8 w-full py-5 rounded-xl font-bold text-xl text-black ${categoryColor[participant()?.category]?.bg || "bg-zinc-700"}`}
                >
                  {categoryColor[participant()?.category]?.label || "REGULAR"}{" "}
                  WRISTBAND
                </button>
              </div>
            </div>
          </Show>
        </div>

        {/* HISTORY DRAWER */}
        <div
          class={`fixed top-0 right-0 h-screen w-96 bg-zinc-950 border-l border-zinc-800 transition-all duration-300 z-50 ${showHistory() ? "translate-x-0" : "translate-x-full"}`}
        >
          <div class="p-5 flex justify-between items-center border-b border-zinc-800">
            <h2 class="text-xl font-bold">Scan History</h2>

            <div class="flex items-center gap-4">
              {/* TOMBOL CLEAR HISTORY */}
              <Show when={scanHistory().length > 0}>
                <button
                  onClick={clearHistory}
                  class="text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
                >
                  Clear All
                </button>
              </Show>

              <button
                onClick={() => setShowHistory(false)}
                class="text-zinc-400 hover:text-white"
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          <div class="overflow-y-auto h-full p-4 space-y-3 pb-24">
            {/* TAMPILAN JIKA HISTORY KOSONG */}
            <Show when={scanHistory().length === 0}>
              <div class="text-center text-zinc-600 mt-10 text-sm">
                Belum ada riwayat scan.
              </div>
            </Show>

            <For each={scanHistory()}>
              {(item) => (
                <div class="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div class="font-bold text-lg">{item.name}</div>
                  <div class="text-zinc-400 text-sm">{item.company}</div>
                  <Show when={item.plusOneOf}>
                    <div class="mt-2 text-xs text-yellow-400">
                      +1 Of: {item.plusOneOf}
                    </div>
                  </Show>
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
