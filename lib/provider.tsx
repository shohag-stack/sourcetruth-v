import { ReactNode } from "react";

export const PROVIDER_META: Record<string, { name: string; icon: ReactNode }> =
  {
    lemon_squeezy: {
      name: "Lemon Squeezy",
      icon: (
        <img
          src="/src/images/ls.svg"
          alt="Lemon Squeezy"
        />
      ),
    },

    stripe: {
      name: "Stripe",
      icon: (
        <img
          src="/src/images/stripe.svg"
          alt="Lemon Squeezy"
        />
      ),
    },
    paddle: {
      name: "Paddle",
      icon: (
        <img
          src="/src/images/paddle.svg"
          alt="Lemon Squeezy"
        />
      ),
    },
    woocommerce: {
      name: "WooCommerce",
      icon: (
        <img
          src="/src/images/wc.svg"
          alt="Lemon Squeezy"
        />
      ),
    },
  };
