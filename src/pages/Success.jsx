import { useLocation } from "@solidjs/router";
import { CheckCircle2, Bell, CalendarDays, MapPin, Mail } from "lucide-solid";

import hero from "../assets/kvXpeng.jpg";
import logo from "../assets/logoXPENG.png";
import heroRegular from "../assets/KVFHDWEB.png";
import heroVIP from "../assets/KVFHDWEB.png";

export default function Success() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const qr = params.get("qr");
  const uniqueId = qr?.split("/").pop()?.replace(".png", "");
  const userId = params.get("userId");
  const qrUrl = qr ? `https://cloud.xpengvisionnight.co.id/${qr}` : null;
  const category = params.get("category");
  const isVIP = category === "VIP";
  const heroImage = isVIP ? heroVIP : heroRegular;
  const eventTime = isVIP ? "16.30 - 21.00 WIB" : "14.00 - 21.00 WIB";

  return (
    <div class="min-h-screen bg-black shadow-2xl py-8 px-4">
      <div class="max-w-[920px] mx-auto overflow-hidden bg-black shadow-2xl">
        {/* HEADER */}
        <div class="bg-black py-5 text-center border-b border-white/50 rounded-2xl">
          <p class="text-zinc-300 text-sm md:text-base">
            Thank you for your confirmation. See you at the event!
          </p>
          <img src={logo} alt="XPENG" class="h-8 md:h-10 mx-auto mt-4" />
        </div>
        {/* HERO */}
        <div class="relative">
          <img
            src={heroImage}
            alt="Hero"
            class="w-full h-[220px] md:h-[320px] object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div class="absolute left-6 md:left-12 top-1/2 -translate-y-1/2">
            <h1 class="text-3xl md:text-6xl font-bold leading-none">
              XPENG
              <br />
              V1SION NIGHT
            </h1>
            <p class="mt-4 text-[#D8FF24] text-sm md:text-2xl uppercase font-medium">
              AI TRANSFORMS THE WORLD
            </p>
            {/* <div class="mt-4 w-20 h-[2px] bg-[#D8FF24]" />
            <div class="mt-4 space-y-2">
              <div class="flex items-center gap-2 text-white">
                <CalendarDays size={18} class="text-[#D8FF24]" />
                <span> 28 June 2026 | {eventTime}</span>
              </div>
              <div class="flex items-center gap-2 text-white">
                <MapPin size={18} class="text-[#D8FF24]" />
                <span>Istora Senayan, Jakarta</span>
              </div>
            </div> */}
          </div>
        </div>
        {/* CONTENT */}
        <div class="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(216,255,36,.08),transparent_25%),#030303] px-6 md:px-12 py-12">
          <div class="absolute top-0 right-0 w-[400px] h-[400px] bg-[#D8FF24]/10 rounded-full blur-[160px]" />
          <div class="text-center">
            <CheckCircle2 size={52} class="mx-auto text-[#D8FF24]" />
            <h2 class="mt-5 text-3xl md:text-5xl font-bold">
              REGISTRATION RECEIVED
            </h2>
          </div>
          <div class="max-w-2xl mx-auto mt-10">
            <div class="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center">
              <Mail size={60} class="mx-auto text-[#D8FF24]" />
              <h3 class="mt-5 text-2xl font-bold">CHECK YOUR EMAIL</h3>

              <p class="mt-4 text-zinc-300 leading-relaxed">
                Thank you for registering for XPENG V1SION NIGHT.
              </p>

              <p class="mt-4 text-zinc-300 leading-relaxed">
                We have sent a confirmation email to the email address you
                provided.
              </p>

              <p class="mt-4 text-zinc-300 leading-relaxed">
                Please open the email and complete your RSVP confirmation.
              </p>

              <p class="mt-4 text-[#D8FF24] font-semibold">
                Your event QR Code will be available after your registration has
                been confirmed.
              </p>
            </div>
          </div>

          {/* REMINDER */}
          <div class="max-w-xl mx-auto mt-8">
            <div class="flex gap-5 items-center border border-white/10 bg-white/5 rounded-xl p-5">
              <Bell size={30} class="text-[#D8FF24]" />
              <div class="w-px self-stretch bg-[#D8FF24]" />
              <div>
                <h4 class="font-semibold text-xl">EVENT REMINDER</h4>
                <div class="mt-2 text-zinc-300 space-y-1">
                  <p>Date : 28 June 2026</p>
                  <p>Time : {eventTime}</p>
                  <p>Venue : Istora Senayan, Jakarta</p>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center mt-10 text-zinc-400 italic">
            <p>If you have any questions, feel free to contact us.</p>
            <p class="mt-2">See you there!</p>
          </div>
        </div>

        {/* FOOTER */}
        <div class="bg-black border-t border-white/10 py-6 text-center">
          <p class="text-zinc-400 text-sm">
            XPENG V1SION NIGHT — AI TRANSFORMS THE WORLD
          </p>
        </div>
      </div>
    </div>
  );
}
