import { useParams } from "@solidjs/router";
import { createSignal, onMount, onCleanup } from "solid-js";
import { CalendarDays, MapPin, Bell, CheckCircle2, Timer } from "lucide-solid";
import heroRegular from "../assets/KVFHDWEB.png";
import heroVIP from "../assets/KVFHDWEB.png";
import hero from "../assets/kvXpeng.jpg";
import logo from "../assets/logoXPENG.png";

export default function RSVP() {
  const params = useParams();
  const [user, setUser] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [confirmed, setConfirmed] = createSignal(false);
  const isVIP = () => user()?.category === "VIP";
  let ws;
  const eventTime = () => (isVIP() ? "16.30 - 21.00 WIB" : "14.00 - 21.00 WIB");
  const heroImage = () => (isVIP() ? heroVIP : heroRegular);
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
            src={heroImage()}
            alt=""
            class="w-full h-[180px] sm:h-[220px] md:h-[320px] object-cover"
          />
          <div class="absolute inset-0 bg-black/60" />
          <div class="absolute left-6 md:left-10 top-1/2 -translate-y-1/2">
            <h1 class="text-2xl sm:text-4xl md:text-6xl font-bold">
              XPENG
              <br />
              V1SION NIGHT
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
                      attendance for XPENG V1SION NIGHT.
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
                      to welcoming you at XPENG V1SION NIGHT.
                    </p>
                  </>
                )}
              </div>
              {/* USER CARD */}
              <div class="mt-10">
                <div
                  class={`grid gap-6 ${
                    user()?.guest ? "lg:grid-cols-2" : "max-w-md mx-auto"
                  }`}
                >
                  {/* PRIMARY TICKET */}
                  <div class="rounded-3xl border border-[#D8FF24]/20 bg-white/[0.03] backdrop-blur-md overflow-hidden">
                    <div class="bg-[#D8FF24] text-black px-5 py-3 font-bold tracking-wider text-center">
                      PRIMARY GUEST
                    </div>
                    <div class="p-6 text-center">
                      {confirmed() && (
                        <img
                          src={`https://cloud.xpengvisionnight.co.id/${user().qr_code}`}
                          alt="Primary QR"
                          class="w-52 h-52 mx-auto bg-white rounded-2xl p-3"
                        />
                      )}

                      <h3 class="mt-5 text-2xl font-bold">{user().name}</h3>
                      <p class="text-zinc-400 mt-1">{user().company}</p>
                      <div class="mt-6 space-y-4 text-left">
                        <div>
                          <p class="text-zinc-500 text-sm">Email</p>
                          <p>{user().email}</p>
                        </div>
                        <div>
                          <p class="text-zinc-500 text-sm">Category</p>
                          <p class="text-[#D8FF24] font-semibold">
                            {user().category}
                          </p>
                        </div>
                        {confirmed() && (
                          <div>
                            <p class="text-zinc-500 text-sm">Registration ID</p>
                            <p class="break-all text-sm">{user().uniqueId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* GUEST TICKET */}
                  {user()?.guest && (
                    <div class="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
                      <div class="bg-white text-black px-5 py-3 font-bold tracking-wider text-center">
                        ADDITIONAL GUEST
                      </div>
                      <div class="p-6 text-center">
                        {confirmed() && (
                          <img
                            src={`https://cloud.xpengvisionnight.co.id/${user().guest.qr_code}`}
                            alt="Guest QR"
                            class="w-52 h-52 mx-auto bg-white rounded-2xl p-3"
                          />
                        )}
                        <h3 class="mt-5 text-2xl font-bold">
                          {user().guest.name}
                        </h3>
                        <p class="text-zinc-400 mt-1">{user().guest.company}</p>
                        <div class="mt-6 space-y-4 text-left">
                          <div>
                            <p class="text-zinc-500 text-sm">Email</p>
                            <p>{user().guest.email}</p>
                          </div>
                          <div>
                            <p class="text-zinc-500 text-sm">Category</p>
                            <p>{user().guest.category}</p>
                          </div>
                          {confirmed() && (
                            <div>
                              <p class="text-zinc-500 text-sm">
                                Registration ID
                              </p>
                              <p class="break-all text-sm">
                                {user().guest.uniqueId}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* BUTTON */}

              {!confirmed() && (
                <button
                  onClick={confirmAttendance}
                  class="
                  w-full mt-8
                  bg-[#D8FF24]
                  text-black
                  font-bold
                  py-5
                  rounded-2xl
                  text-lg
                  tracking-wide
                  shadow-[0_0_30px_rgba(216,255,36,.35)]
                  hover:scale-[1.01]
                  transition-all
                  "
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
                        <span>28 June 2026</span>
                      </div>

                      <div class="flex items-center gap-2">
                        <MapPin size={16} />
                        <span>Istora Senayan, Jakarta</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <Timer size={16} />
                        <span>Time : {eventTime()}</span>
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
            XPENG V1SION NIGHT — AI TRANSFORMS THE WORLD
          </p>
        </div>
      </div>
    </div>
  );
}
