import { For } from "solid-js";

export default function SelectField(props) {
  return (
    <div class="space-y-2">
      <label class="text-sm font-medium text-white">{props.label}</label>

      <select
        class="
          w-full
          rounded-lg
          border
          border-white/10
          bg-white/[0.03]
          px-4
          py-3
          text-white
          outline-none
          focus:border-lime-400
        "
      >
        <For each={props.options}>
          {(option) => (
            <option value={option} class="bg-black">
              {option}
            </option>
          )}
        </For>
      </select>
    </div>
  );
}
