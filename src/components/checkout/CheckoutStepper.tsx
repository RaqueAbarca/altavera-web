import { Check } from "lucide-react";
import styles from "./CheckoutStepper.module.css";

type Props = {
  currentStep: 1 | 2 | 3;
};

const STEPS = ["Datos de entrega", "Pago", "Confirmación"] as const;

export default function CheckoutStepper({ currentStep }: Props) {
  return (
    <nav className={styles.stepper} aria-label="Progreso de compra">
      <ol className={styles.list}>
        {STEPS.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3;
          const complete = step < currentStep;
          const current = step === currentStep;
          const className = [
            styles.item,
            complete ? styles.itemComplete : "",
            current ? styles.itemCurrent : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li
              key={label}
              className={className}
              aria-current={current ? "step" : undefined}
            >
              <span className={styles.circle} aria-hidden="true">
                {complete ? <Check size={18} strokeWidth={2.5} /> : step}
              </span>
              <span className={styles.label}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
