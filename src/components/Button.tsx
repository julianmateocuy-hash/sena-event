import { motion, type HTMLMotionProps } from "framer-motion";

type Variant = "primary" | "ghost" | "danger";

interface Props extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-signal text-base-950 font-semibold hover:bg-signal/90",
  ghost: "border border-signal/30 text-signal hover:bg-signal/10",
  danger: "border border-signal-red/30 text-signal-red hover:bg-signal-red/10",
};

export function Button({ variant = "primary", className = "", disabled, ...props }: Props) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      disabled={disabled}
      className={`rounded-full px-5 py-2.5 text-sm transition disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    />
  );
}
