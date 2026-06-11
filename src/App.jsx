import { Route } from "@solidjs/router";
import Reservation from "./pages/Reservation";
import Success from "./pages/Success";
import RSVP from "./pages/ConfirmRSVP";
import DummyQrGenerator from "./pages/DummyQrGenerator";

export default function App() {
  return (
    <>
      <Route path="/" component={Reservation} />
      <Route path="/success" component={Success} />
      <Route path="/rsvp/:uniqueId" component={RSVP} />
      <Route path="/admin/dummy-qr" component={DummyQrGenerator}/>
      
    </>
  );
}