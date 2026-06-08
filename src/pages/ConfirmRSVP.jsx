import { useParams } from "@solidjs/router";
import { createSignal, onMount, onCleanup } from "solid-js";

import { CalendarDays, MapPin, Bell, CheckCircle2, Timer } from "lucide-solid";

import hero from "../assets/kvXpeng.jpg";
import logo from "../assets/logoXPENG.png";

export default function RSVP() {
  const params = useParams();

  const [user, setUser] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [confirmed, setConfirmed] = createSignal(false);

  let ws;

  onMount(() => {
    ws = new WebSocket("wss://cloud.xpengvisionnight.co.id");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: "GET_USER_BY_UNIQUEID",
          payload: {
            uniqueId: params.uniqueId,
          },
        }),
      );
    };
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.type === "user-detail") {
        setUser(response.data);

        if (response.data?.status_confirmation === "confirmed") {
          setConfirmed(true);
        }

        setLoading(false);
      }
      if (response.type === "confirmation-success") {
        setConfirmed(true);

        ws.send(
          JSON.stringify({
            action: "GET_USER_BY_UNIQUEID",
            payload: {
              uniqueId: params.uniqueId,
            },
          }),
        );
      }
      if (response.status === "error") {
        setLoading(false);
        alert(response.message);
      }
    };
  });

  onCleanup(() => {
    ws?.close();
  });

  const confirmAttendance = () => {
    ws.send(
      JSON.stringify({
        action: "UPDATE_CONFIRMATION",
        payload: {
          uniqueId: params.uniqueId,
          status_confirmation: "confirmed",
        },
      }),
    );
  };

  return (
    <div class="min-h-screen bg-black py-8 px-4 text-white">
      <div class="max-w-[920px] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl">
        {/* HEADER */}

        <div class="bg-black py-5 text-center border-b border-white/20">
          <img src={logo} alt="XPENG" class="h-10 mx-auto" />
        </div>

        {/* HERO */}

        <div class="relative">
          <img
            src={hero}
            alt=""
            class="w-full h-[250px] md:h-[320px] object-cover"
          />

          <div class="absolute inset-0 bg-black/60" />

          <div class="absolute left-6 md:left-10 top-1/2 -translate-y-1/2">
            <h1 class="text-4xl md:text-6xl font-bold leading-none">
              XPENG
              <br />
              VISION NIGHT
            </h1>

            <p class="mt-4 text-[#D8FF24] text-sm md:text-xl uppercase">
              AI TRANSFORMS THE WORLD
            </p>
          </div>
        </div>

        {/* CONTENT */}

        <div class="p-6 md:p-10">
          {loading() && <div class="text-center py-16">Loading...</div>}

          {!loading() && !user() && (
            <div class="text-center py-16">User not found</div>
          )}

          {!loading() && user() && (
            <>
              {/* TITLE */}

              <div class="text-center">
                {!confirmed() ? (
                  <>
                    <h2 class="text-4xl font-bold">RSVP CONFIRMATION</h2>

                    <p class="mt-4 text-zinc-400 max-w-xl mx-auto">
                      Please review your information below and confirm your
                      attendance for XPENG Vision Night.
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={52} class="mx-auto text-[#D8FF24]" />

                    <h2 class="mt-4 text-4xl font-bold text-[#D8FF24]">
                      ATTENDANCE CONFIRMED
                    </h2>

                    <p class="mt-4 text-zinc-300 max-w-xl mx-auto">
                      Thank you for confirming your attendance. We look forward
                      to welcoming you at XPENG Vision Night.
                    </p>
                  </>
                )}
              </div>

              {/* USER CARD */}

              <div class="mt-10 bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                <div
                  class={
                    confirmed()
                      ? "grid md:grid-cols-[1fr_260px] gap-8 items-center"
                      : ""
                  }
                >
                  {/* QR FIRST ON MOBILE */}
                  {confirmed() && (
                    <div class="text-center order-1 md:order-2">
                      <h3 class="text-[#D8FF24] text-sm font-semibold uppercase tracking-widest mb-4">
                        EVENT QR CODE
                      </h3>

                      <img
                        src={`https://cloud.xpengvisionnight.co.id/${user().qr_code}`}
                        alt="QR Code"
                        class="w-56 h-56 mx-auto bg-white p-3 rounded-xl"
                      />

                      <p class="mt-4 text-zinc-400 text-sm">Registration ID</p>

                      <p class="text-[#D8FF24] font-semibold break-all">
                        {user().uniqueId}
                      </p>
                    </div>
                  )}

                  {/* USER DATA */}
                  <div class="space-y-5 order-2 md:order-1">
                    <div>
                      <span class="text-zinc-400">Name</span>

                      <p class="font-semibold text-lg">{user().name}</p>
                    </div>

                    <div>
                      <span class="text-zinc-400">Email</span>

                      <p class="font-semibold">{user().email}</p>
                    </div>

                    <div>
                      <span class="text-zinc-400">Company</span>

                      <p class="font-semibold">{user().company}</p>
                    </div>

                    <div>
                      <span class="text-zinc-400">Category</span>

                      <p class="font-semibold">{user().category}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* BUTTON */}

              {!confirmed() && (
                <button
                  onClick={confirmAttendance}
                  class="w-full mt-8 bg-[#D8FF24] hover:bg-[#c5ef00] transition text-black font-bold py-4 rounded-xl text-lg"
                >
                  CONFIRM ATTENDANCE
                </button>
              )}

              {/* REMINDER */}
              <div class="mt-10 border border-white/10 bg-white/5 rounded-xl p-5">
                <div class="flex gap-5 items-start">
                  <Bell size={30} class="text-[#D8FF24]" />
                  <div>
                    <h4 class="font-bold text-xl">EVENT REMINDER</h4>

                    <div class="mt-3 space-y-2 text-zinc-300">
                      <div class="flex items-center gap-2">
                        <CalendarDays size={16} />
                        <span>28 June 2024</span>
                      </div>

                      <div class="flex items-center gap-2">
                        <MapPin size={16} />
                        <span>The Kasablanka Hall, Jakarta</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <Timer size={16} />
                          <span>Time : 14.00 - 21.00 WIB</span>
                      </div>

                    
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}

        <div class="border-t border-white/10 py-6 text-center">
          <p class="text-zinc-400 text-sm">
            XPENG — LEADING THE FUTURE OF AI MOBILITY
          </p>
        </div>
      </div>
    </div>
  );
}
