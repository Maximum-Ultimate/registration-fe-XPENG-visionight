import { createSignal, onMount, onCleanup } from "solid-js";
import { useNavigate, useParams, A } from "@solidjs/router";
import MD5 from "crypto-js/md5";
import Swal from "sweetalert2";

import InputField from "../components/InputField";
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  Megaphone,
  CalendarDays,
} from "lucide-solid";
import SelectField from "../components/SelectField";
import hero from "../assets/generalInvite.jpg";
import logo from "../assets/logoXPENG.png";
import heroRegular from "../assets/KVFHDWEB.png";
import heroVIP from "../assets/KVFHDWEB.png";
import { connectWS, sendWS } from "../services/ws";
import h from "solid-js/h";
const categoryMap = {
  f7d92kLm: "SUPER VVIP",
  g23dfplX2: "VVIP",
  a8f7d92kLm: "VIP",
  b9d2a11YpQ: "DEALER",
  c7f8e55RtN: "MEDIA",
  d4k9p31WsM: "COMMUNITY",
  e2m7q88HxV: "FRONT",
  h5n6r22AbC: "LEASING",
};
const categoryTitleMap = {
  "SUPER VVIP": "SUPER VVIP INVITATION",
  VVIP: "VVIP INVITATION",
  VIP: "VIP INVITATION",
  DEALER: "DEALER INVITATION",
  MEDIA: "MEDIA INVITATION",
  COMMUNITY: "COMMUNITY INVITATION",
  FRONT: "FRONT INVITATION",
  LEASING: "LEASING INVITATION",
};
const categoryConfig = {
  "SUPER VVIP": {
    maxCapacity: 8,
    allowPlusOne: false,
  },
  VVIP: {
    maxCapacity: 100,
    allowPlusOne: false,
  },
  VIP: {
    maxCapacity: 520,
    allowPlusOne: true,
  },
  DEALER: {
    maxCapacity: 824,
    allowPlusOne: true,
  },
  MEDIA: {
    maxCapacity: 74,
    allowPlusOne: false,
  },
  COMMUNITY: {
    maxCapacity: 638,
    allowPlusOne: true,
  },
  FRONT: {
    maxCapacity: 386,
    allowPlusOne: true,
  },
  LEASING: {
    maxCapacity: 100,
    allowPlusOne: true,
  },
};

export default function Reservation() {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get("c");
  const category = categoryMap[token] || null;
  const isVIPCategory = category === "VIP";
  const eventTime = isVIPCategory ? "16.30 - 21.00 WIB" : "14.00 - 21.00 WIB";
  const heroImage = isVIPCategory ? heroVIP : heroRegular;
  const allowPlusOne = queryParams.get("p") === "1";
  const maxGuest = allowPlusOne ? 1 : 0;
  const uniqueId = queryParams.get("u");
  const dealerCode = queryParams.get("d");

  const [fixedDealerId, setFixedDealerId] = createSignal(null);
  const [fixedDealerName, setFixedDealerName] = createSignal("");
  const [nameError, setNameError] = createSignal("");
  const [companyError, setCompanyError] = createSignal("");
  const isInvitationUser = !!uniqueId;
  const [loading, setLoading] = createSignal(false);
  const [bringGuest, setBringGuest] = createSignal(false);
  const [dealerList, setDealerList] = createSignal([]);
  const [dealerId, setDealerId] = createSignal("");
  const [form, setForm] = createSignal({
    name: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    city: "",
    source: "",
  });
  let ws;
  onMount(() => {
    ws = connectWS();
    const init = () => {
      ws.send(
        JSON.stringify({
          action: "GET_DEALER_SEAT",
        }),
      );
      if (dealerCode) {
        ws.send(
          JSON.stringify({
            action: "GET_DEALER_BY_CODE",
            payload: {
              dealerCode,
            },
          }),
        );
      }
      if (uniqueId) {
        ws.send(
          JSON.stringify({
            action: "GET_USER_BY_UNIQUEID",
            payload: {
              uniqueId,
            },
          }),
        );
      }
    };

    const handleMessage = (event) => {
      let response;
      try {
        response = JSON.parse(event.data);
      } catch {
        return;
      }
      if (response.type !== "user-detail" && response.type !== "dealer-seat") {
        return;
      }

      if (response.type === "user-detail") {
        const user = response.data;

        if (user.status_confirmation === "confirmed") {
          navigate(`/rsvp/${user.uniqueId}`);
          return;
        }

        setForm({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          company: user.company || "",
          jobTitle: user.position || "",
          city: user.city || "",
          source: user.source || "",
        });

        if (user.dealer_id) {
          setDealerId(String(user.dealer_id));
        }
      }

      if (response.type === "dealer-seat") {
        setDealerList(response.data);

        if (dealerCode) {
          const dealer = response.data.find(
            (d) => d.dealer_code === dealerCode,
          );

          if (!dealer) {
            Swal.fire({
              icon: "error",
              title: "Invalid Dealer Link",
              text: "Dealer code not found",
            });

            navigate("/invalid-link");
            return;
          }

          setFixedDealerId(dealer.id);
          setFixedDealerName(dealer.dealer_name);
        }
      }
    };

    let handleOpen;

    if (ws.readyState === WebSocket.OPEN) {
      init();
    } else {
      handleOpen = () => {
        init();
      };

      ws.addEventListener("open", handleOpen, {
        once: true,
      });
    }

    ws.addEventListener("message", handleMessage);

    onCleanup(() => {
      ws.removeEventListener("message", handleMessage);

      if (handleOpen) {
        ws.removeEventListener("open", handleOpen);
      }
    });
  });

  const [guest, setGuest] = createSignal({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const nameCompanyRegex = /^[a-zA-Z0-9\s\-_]+$/;
  const validateForm = () => {
    if (!form().name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Full Name Required",
        text: "Please enter your full name.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
      return false;
    }
    if (!form().email.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Email Required",
        text: "Please enter your email address.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form().email.trim())) {
      Swal.fire({
        icon: "error",
        title: "Invalid Email",
        text: "Please enter a valid email address.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
      return false;
    }
    if (!form().phone.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Phone Number Required",
        text: "Please enter your phone number.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
      return false;
    }
    if (!/^[0-9]+$/.test(form().phone)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Phone Number",
        text: "Phone number must contain numbers only.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
      return false;
    }
    if (!form().company.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Company Required",
        text: "Please enter your company or organization.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
      return false;
    }
    if (!nameCompanyRegex.test(form().name.trim())) {
      Swal.fire({
        icon: "error",
        title: "Invalid Full Name",
        text: "Full name can only contain letters, numbers, spaces, dash (-), and underscore (_).",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
      return false;
    }
    if (!nameCompanyRegex.test(form().company.trim())) {
      Swal.fire({
        icon: "error",
        title: "Invalid Company",
        text: "Company name can only contain letters, numbers, spaces, dash (-), and underscore (_).",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
      return false;
    }
    if (maxGuest > 0 && bringGuest()) {
      if (!guest().name.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Guest Name Required",
          text: "Please enter guest full name.",
          confirmButtonColor: "#D8FF24",
          background: "#111111",
          color: "#ffffff",
        });
        return false;
      }

      if (!guest().email.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Guest Email Required",
          text: "Please enter guest email address.",
          confirmButtonColor: "#D8FF24",
          background: "#111111",
          color: "#ffffff",
        });
        return false;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest().email.trim())) {
        Swal.fire({
          icon: "error",
          title: "Invalid Guest Email",
          text: "Please enter a valid guest email address.",
          confirmButtonColor: "#D8FF24",
          background: "#111111",
          color: "#ffffff",
        });
        return false;
      }

      if (!guest().phone.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Guest Phone Required",
          text: "Please enter guest phone number.",
          confirmButtonColor: "#D8FF24",
          background: "#111111",
          color: "#ffffff",
        });
        return false;
      }

      if (!/^[0-9]+$/.test(guest().phone)) {
        Swal.fire({
          icon: "error",
          title: "Invalid Guest Phone Number",
          text: "Guest phone number must contain numbers only.",
          confirmButtonColor: "#D8FF24",
          background: "#111111",
          color: "#ffffff",
        });
        return false;
      }
    }
    if (category === "DEALER" && !fixedDealerId && !dealerId()) {
      Swal.fire({
        icon: "warning",
        title: "Dealer Required",
        text: "Please select your dealer location.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });

      return false;
    }
    const selectedDealer = dealerList().find(
      (d) => String(d.id) === String(fixedDealerId() || dealerId()),
    );
    if (category === "DEALER" && !fixedDealerId() && !dealerId()) {
      Swal.fire({
        icon: "error",
        title: "Dealer Full",
        text: "Selected dealer has reached maximum capacity.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });

      return false;
    }
    return true;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    if (loading()) return;
    setLoading(true);
    console.log("URL UNIQUE ID:", uniqueId);
    const payload = {
      action: maxGuest > 0 && bringGuest() ? "REGISTER_PLUS_ONE" : "REGISTER",
      payload:
        maxGuest > 0 && bringGuest()
          ? {
              primary: {
                name: form().name,
                email: form().email,
                phone: form().phone,
                company: form().company,
                position: form().jobTitle,
                city: form().city,
                source: form().source,
                category,
                dealer_id: fixedDealerId() || Number(dealerId()),
                password: MD5(`${form().email}-${Date.now()}`).toString(),
                status_confirmation: "confirmed",
              },

              guest: {
                name: guest().name,
                email: guest().email,
                phone: guest().phone,
                company: guest().company,
              },

              sendEmail: true,
            }
          : {
              uniqueId,
              name: form().name,
              email: form().email,
              phone: form().phone,
              company: form().company,
              position: form().jobTitle,
              city: form().city,
              source: form().source,
              category,
              dealer_id: fixedDealerId() || Number(dealerId()),
              password: MD5(`${form().email}-${Date.now()}`).toString(),
              sendEmail: true,
              status_confirmation: "confirmed",
            },
    };
    console.log("PAYLOAD:", payload);
    try {
      const rawResponse = await sendWS(payload);
      const response =
        typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;
      if (
        response?.status === "success" &&
        (response?.type === "registered" ||
          response?.type === "registered-plus-one")
      ) {
        await Swal.fire({
          icon: "success",
          title: "Registration Successful",
          text: "Please check your email to complete your RSVP confirmation.",
          confirmButtonColor: "#D8FF24",
          background: "#111111",
          color: "#ffffff",
        });
        if (response.type === "registered-plus-one") {
          navigate(
            `/success?primaryQr=${encodeURIComponent(response.data.primaryQrPath)}&guestQr=${encodeURIComponent(response.data.guestQrPath)}&primaryUserId=${response.data.primaryUserId}&guestUserId=${response.data.guestUserId}&category=${encodeURIComponent(category)}`,
          );
        } else {
          navigate(
            `/success?qr=${encodeURIComponent(response.data.qrCodeFilePath)}
      &userId=${response.data.userId}&category=${encodeURIComponent(category)}`,
          );
        }
      } else {
        await Swal.fire({
          icon: "error",
          title: "Registration Failed",
          text:
            response?.message ||
            response?.error ||
            "An unexpected error occurred.",
          confirmButtonColor: "#D8FF24",
          background: "#111111",
          color: "#ffffff",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: err?.message || "An unexpected error occurred.",
        confirmButtonColor: "#D8FF24",
        background: "#111111",
        color: "#ffffff",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!category) {
    return (
      <div class="min-h-screen bg-black flex items-center justify-center text-white">
        <div class="text-center">
          <h1 class="text-4xl font-bold">Invalid Invitation Link</h1>
          <p class="mt-4 text-zinc-400">Please use a valid invitation URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-black py-10 px-4">
      <div class="max-w-[1180px] mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div class="h-[90px] md:h-[110px] bg-black border-b border-white/10 flex items-center justify-center">
          <img
            src={logo}
            alt="XPENG"
            class="h-10 md:h-14 w-auto object-contain"
          />
        </div>
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div class="relative">
            <img
              src={heroImage}
              alt="Hero"
              class="w-full h-[280px] sm:h-[350px] md:h-[420px] lg:h-[520px] object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
            <div class="absolute left-4 right-4 md:left-8 md:right-auto top-1/2 -translate-y-1/2 max-w-full md:max-w-[550px]">
              <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-wide leading-none">
                XPENG
                <br />
                V1SION NIGHT
              </h1>

              <p class="mt-3 md:mt-6 text-[#D8FF24] text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium uppercase leading-tight">
                AI TRANSFORMS THE WORLD
              </p>
              <div class="mt-4 md:mt-6 w-16 md:w-24 h-[2px] bg-[#D8FF24]" />
              <div class="mt-4 md:mt-8 space-y-3 md:space-y-4">
                <div class="flex items-center gap-2 md:gap-4">
                  <CalendarDays size={20} class="text-[#D8FF24] shrink-0" />
                  <span class="text-white text-sm sm:text-base md:text-xl lg:text-2xl font-medium">
                    28 June 2026 | {eventTime}
                  </span>
                </div>
                <div class="flex items-center gap-2 md:gap-4">
                  <MapPin size={20} class="text-[#D8FF24] shrink-0" />
                  <span class="text-white text-sm sm:text-base md:text-xl lg:text-2xl font-medium">
                    Istora Senayan, Jakarta
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="relative overflow-hidden px-8 py-12 md:px-12 bg-[radial-gradient(circle_at_top_right,rgba(216,255,36,.08),transparent_25%),#030303]">
          <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D8FF24]/10 rounded-full blur-[180px] pointer-events-none" />
          <h2 class="text-4xl md:text-5xl font-bold tracking-wide text-white">
            {categoryTitleMap[category]}
          </h2>
          <p class="mt-3 text-zinc-300 text-2xl">
            Please fill in your details below to confirm your reservation at
            <span className="text-[#D8FF24] font-bold uppercasetext-2xl">
              {" "}
              XPENG V1SION NIGHT
            </span>
          </p>
          <div class="mt-8 border border-[#D8FF24]/20 bg-[#D8FF24]/5 rounded-xl p-5">
            <h3 class="text-[#D8FF24] font-semibold">IMPORTANT NOTICE</h3>

            <p class="mt-3 text-zinc-300 leading-relaxed">
              Please ensure all information entered is accurate and matches your
              official identification.
            </p>

            <p class="mt-2 text-zinc-300 leading-relaxed">
              Your RSVP confirmation, event updates, and admission QR Code will
              be sent to the email address provided below.
            </p>

            <p class="mt-2 text-zinc-400 text-sm">
              Incorrect email addresses may prevent you from receiving your
              invitation and event access.
            </p>
          </div>
          <form onSubmit={handleSubmit} class="mt-10">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <InputField
                  label="FULL NAME"
                  required
                  icon={User}
                  placeholder="Enter your full name"
                  value={form().name}
                  disabled={isInvitationUser}
                  onInput={(e) => {
                    const value = e.currentTarget.value;

                    if (/[^a-zA-Z\s\-_]/.test(value)) {
                      setNameError(
                        "Only letters, spaces, dash (-), and underscore (_) are allowed.",
                      );
                    } else {
                      setNameError("");
                    }

                    setForm({
                      ...form(),
                      name: value.replace(/[^a-zA-Z\s\-_]/g, ""),
                    });
                  }}
                />

                <Show when={nameError()}>
                  <p class="mt-1 text-xs text-red-400">{nameError()}</p>
                </Show>
              </div>
              <InputField
                label="EMAIL ADDRESS"
                required
                type="email"
                icon={Mail}
                placeholder="Enter your email address"
                value={form().email}
                disabled={isInvitationUser}
                onInput={(e) =>
                  setForm({ ...form(), email: e.currentTarget.value })
                }
              />

              <InputField
                label="PHONE NUMBER"
                required
                icon={Phone}
                placeholder="Enter your phone number"
                value={form().phone}
                disabled={isInvitationUser}
                onInput={(e) =>
                  setForm({
                    ...form(),
                    phone: e.currentTarget.value
                      .replace(/\D/g, "")
                      .slice(0, 15),
                  })
                }
              />

              <div>
                <InputField
                  label="COMPANY / ORGANIZATION"
                  required
                  icon={Building2}
                  placeholder="Enter company or organization"
                  value={form().company}
                  disabled={isInvitationUser}
                  onInput={(e) => {
                    const value = e.currentTarget.value;

                    if (/[^a-zA-Z0-9\s\-_]/.test(value)) {
                      setCompanyError(
                        "Only letters, numbers, spaces, dash (-), and underscore (_) are allowed.",
                      );
                    } else {
                      setCompanyError("");
                    }

                    setForm({
                      ...form(),
                      company: value.replace(/[^a-zA-Z0-9\s\-_]/g, ""),
                    });
                  }}
                />

                <Show when={companyError()}>
                  <p class="mt-1 text-xs text-red-400">{companyError()}</p>
                </Show>
              </div>
              {category === "DEALER" && fixedDealerId && (
                <InputField
                  label="DEALER LOCATION"
                  value={fixedDealerName()}
                  disabled
                />
              )}
              {/* <InputField
                label="JOB TITLE"
                icon={Briefcase}
                placeholder="Enter your job title"
                value={form().jobTitle}
                onInput={(e) =>
                  setForm({ ...form(), jobTitle: e.currentTarget.value })
                }
              />
              <div>
                <InputField
                  label="CITY"
                  icon={MapPin}
                  placeholder="Enter your city"
                  value={form().city}
                  onInput={(e) =>
                    setForm({
                      ...form(),
                      city: e.currentTarget.value,
                    })
                  }
                />
              </div> */}
              {/* {category === "DEALER" && (
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium mb-2 text-white">
                    XPENG DEALER LOCATION
                  </label>

                  <select
                    value={dealerId()}
                    onChange={(e) => setDealerId(e.currentTarget.value)}
                    class="w-full h-[58px] rounded-xl bg-black border border-white/10 px-4 text-white focus:border-[#D8FF24] focus:outline-none"
                  >
                    <option value="">Select Dealer Location</option>

                    {dealerList().map((dealer) => (
                      <option value={dealer.id}>{dealer.dealer_name}</option>
                    ))}
                  </select>

                  {dealerId() &&
                    (() => {
                      const dealer = dealerList().find(
                        (d) => String(d.id) === dealerId(),
                      );

                      if (!dealer) return null;

                      const percentage =
                        (dealer.used_seat / dealer.max_capacity) * 100;

                      const seatColor =
                        percentage >= 90
                          ? "text-red-400"
                          : percentage >= 70
                            ? "text-yellow-400"
                            : "text-[#D8FF24]";

                      return (
                        <div class="mt-5 rounded-2xl border border-[#D8FF24]/20 bg-[#D8FF24]/5 p-5 backdrop-blur-sm">
                          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <h4 class="text-white font-semibold text-lg">
                                {dealer.dealer_name}
                              </h4>

                              <p class="text-zinc-400 text-sm">
                                Dealer Seat Availability
                              </p>
                            </div>

                            <div class={`font-bold text-lg ${seatColor}`}>
                              {dealer.remaining_seat} Seats Left
                            </div>
                          </div>

                          <div class="mt-5">
                            <div class="flex justify-between text-xs text-zinc-400 mb-2">
                              <span>Occupancy</span>
                              <span>
                                {dealer.used_seat} / {dealer.max_capacity}
                              </span>
                            </div>

                            <div class="h-3 bg-white/10 rounded-full overflow-hidden">
                              <div
                                class={`h-full transition-all duration-500 ${
                                  percentage >= 90
                                    ? "bg-red-500"
                                    : percentage >= 70
                                      ? "bg-yellow-500"
                                      : "bg-[#D8FF24]"
                                }`}
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div class="mt-4 grid grid-cols-3 gap-3">
                            <div class="rounded-xl bg-black/20 border border-white/10 p-3 text-center">
                              <div class="text-xs text-zinc-400">Capacity</div>
                              <div class="text-lg font-bold text-white">
                                {dealer.max_capacity}
                              </div>
                            </div>

                            <div class="rounded-xl bg-black/20 border border-white/10 p-3 text-center">
                              <div class="text-xs text-zinc-400">Used</div>
                              <div class="text-lg font-bold text-white">
                                {dealer.used_seat}
                              </div>
                            </div>

                            <div class="rounded-xl bg-black/20 border border-white/10 p-3 text-center">
                              <div class="text-xs text-zinc-400">Available</div>
                              <div class={`text-lg font-bold ${seatColor}`}>
                                {dealer.remaining_seat}
                              </div>
                            </div>
                          </div>

                          {dealer.remaining_seat <= 10 && (
                            <div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300 text-sm">
                              ⚠️ Seats are almost full. Please complete your
                              registration soon.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                </div>
              )} */}
              {category === "DEALER" && !fixedDealerId && (
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium mb-2 text-white">
                    XPENG DEALER LOCATION
                  </label>

                  <select
                    value={dealerId()}
                    onChange={(e) => setDealerId(e.currentTarget.value)}
                    class="w-full h-[58px] rounded-xl bg-black border border-white/10 px-4 text-white focus:border-[#D8FF24] focus:outline-none"
                  >
                    <option value="">Select Dealer Location</option>

                    {dealerList().map((dealer) => (
                      <option
                        value={dealer.id}
                        disabled={dealer.remaining_seat <= 0}
                      >
                        {dealer.dealer_name}

                        {dealer.remaining_seat <= 0 ? " (FULL)" : ``}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* <div class="mt-6">
              <SelectField
                label="HOW DID YOU HEAR ABOUT XPENG V1SION NIGHT? (OPTIONAL)"
                icon={Megaphone}
                value={form().source}
                onChange={(e) =>
                  setForm({ ...form(), source: e.currentTarget.value })
                }
                options={[
                  "Select an option",
                  "Instagram",
                  "Facebook",
                  "TikTok",
                  "Website",
                  "Friend",
                  "Email Invitation",
                ]}
              />
            </div> */}
            {maxGuest > 0 && (
              <div class="mt-10 border border-[#D8FF24]/20 bg-[#D8FF24]/5 rounded-xl p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-[#D8FF24] text-xl font-bold">
                      ADDITIONAL GUEST
                    </h3>

                    <p class="text-zinc-400 mt-1">
                      This invitation allows 1 additional guest.
                    </p>
                  </div>

                  <label class="flex items-center gap-3 cursor-pointer">
                    <span class="text-white text-sm">Bring Guest</span>

                    <input
                      type="checkbox"
                      checked={bringGuest()}
                      onChange={(e) => setBringGuest(e.currentTarget.checked)}
                      class="w-5 h-5 accent-[#D8FF24]"
                    />
                  </label>
                </div>
              </div>
            )}
            {maxGuest > 0 && bringGuest() && (
              <div class="mt-10 border border-[#D8FF24]/20 bg-[#D8FF24]/5 rounded-xl p-6">
                <h3 class="text-[#D8FF24] text-xl font-bold">PLUS ONE GUEST</h3>

                <p class="text-zinc-400 mt-2">
                  Your invitation includes 1 additional guest.
                </p>

                <div class="grid md:grid-cols-2 gap-6 mt-6">
                  <InputField
                    label="GUEST FULL NAME"
                    icon={User}
                    value={guest().name}
                    onInput={(e) =>
                      setGuest({
                        ...guest(),
                        name: e.currentTarget.value,
                      })
                    }
                  />

                  <InputField
                    label="GUEST EMAIL"
                    icon={Mail}
                    value={guest().email}
                    onInput={(e) =>
                      setGuest({
                        ...guest(),
                        email: e.currentTarget.value,
                      })
                    }
                  />

                  <InputField
                    label="GUEST PHONE"
                    icon={Phone}
                    value={guest().phone}
                    onInput={(e) =>
                      setGuest({
                        ...guest(),
                        phone: e.currentTarget.value
                          .replace(/\D/g, "")
                          .slice(0, 15),
                      })
                    }
                  />

                  {/* <InputField
                    label="GUEST COMPANY"
                    icon={Building2}
                    value={guest().company}
                    onInput={(e) =>
                      setGuest({
                        ...guest(),
                        company: e.currentTarget.value,
                      })
                    }
                  /> */}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading()}
              class="mt-10 w-full h-[82px] rounded-xl bg-[#D8FF24] text-black text-2xl font-bold tracking-wider shadow-[0_0_40px_rgba(216,255,36,.45)] transition-all hover:brightness-105 disabled:opacity-50"
            >
              <div class="flex items-center justify-center gap-6">
                {loading() ? "SUBMITTING..." : "SUBMIT"}
                <span class="text-3xl">→</span>
              </div>
            </button>

            <p class="mt-6 text-center text-zinc-500 text-sm leading-6">
              By clicking <span class="text-white">Submit</span>, you
              acknowledge that you have read and agree to XPENG's{" "}
              <A
                href="/privacy-policy"
                class="text-[#D8FF24] underline underline-offset-2 hover:text-lime-300"
              >
                Privacy Policy
              </A>
              .
            </p>
            {/* <p class="mt-6 text-center text-zinc-500"> By clicking submit, you agree to XPENG's{" "} <a href="/privacy-policy.pdf" target="_blank" rel="noopener noreferrer" class="text-[#D8FF24] underline hover:text-lime-300" > Privacy Policy </a> </p> */}
          </form>
        </div>
      </div>
    </div>
  );
}
