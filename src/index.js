import Hydra from "hydra-synth";
import "./style.css";

document.addEventListener("DOMContentLoaded", () => {
  const hydra = new Hydra({ makeGlobal: false, detectAudio: false }).synth;
  const { osc, o0, s0, src, noise } = hydra;
  osc(4, 0.1, 1.2).out();
});
