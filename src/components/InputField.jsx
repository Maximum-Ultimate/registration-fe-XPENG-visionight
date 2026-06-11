export default function InputField(props) {
  const Icon = props.icon;

  return (
    <div class="space-y-2">
      <label class="text-sm text-white">
        {props.label}
        {props.required && <span class="text-lime-400 ml-1">*</span>}
      </label>

      <div class="relative">
        {Icon && (
          <Icon
            size={18}
            class="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-white/70
          "
          />
        )}

        <input
          type={props.type || "text"}
          value={props.value}
          onInput={props.onInput}
          placeholder={props.placeholder}
          disabled={props.disabled}
          class="
            w-full
            h-[56px]
            md:h-[68px]
            pl-12
            md:pl-14
            pr-4
            rounded-xl
            bg-white/[0.03]
            border
            border-white/15
            text-white
            text-sm
            md:text-lg
            placeholder:text-zinc-500
            focus:outline-none
            focus:border-[#D8FF24]
            transition-all
          "
        />
      </div>
    </div>
  );
}
