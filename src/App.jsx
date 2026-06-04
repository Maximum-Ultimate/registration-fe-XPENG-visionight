import { Route } from "@solidjs/router";
import Reservation from "./pages/Reservation";
import Success from "./pages/Success";

export default function App() {
  return (
    <>
      <Route path="/" component={Reservation} />
      <Route path="/success" component={Success} />
    </>
  );
}